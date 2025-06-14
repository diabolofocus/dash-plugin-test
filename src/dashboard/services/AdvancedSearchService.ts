// services/AdvancedSearchService.ts - FIXED with proper contact ID search
import type { Order } from '../types/Order';
import type { WixOrdersApiResponse } from '../types/API';
import { mapWixOrder } from '../../backend//utils/order-mapper';

export interface SearchFilters {
    query: string;
    status?: string[];
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
}

export interface SearchResult {
    orders: Order[];
    fromCache: Order[];
    fromApi: Order[];
    hasMore: boolean;
    nextCursor?: string;
    totalFound: number;
    searchTime: number;
}

export class AdvancedSearchService {
    private searchCache = new Map<string, SearchResult>();
    private searchTimeout: number | null = null;

    /**
     * Performs a two-stage search:
     * 1. Quick search through loaded orders (cache)
     * 2. API search with filters for comprehensive results
     */
    async performAdvancedSearch(
        query: string,
        loadedOrders: Order[],
        filters: SearchFilters = { query }
    ): Promise<SearchResult> {
        const startTime = performance.now();
        const cacheKey = this.generateCacheKey(query, filters);

        // Return cached result if available and recent (< 30 seconds)
        const cached = this.searchCache.get(cacheKey);
        if (cached && (performance.now() - cached.searchTime) < 30000) {
            return cached;
        }

        // Stage 1: Quick search through loaded orders
        const cacheResults = this.searchLoadedOrders(query, loadedOrders, filters);

        // Stage 2: API search for comprehensive results
        const apiResults = await this.searchViaApi(query, filters);

        // Merge and deduplicate results
        const mergedResults = this.mergeSearchResults(cacheResults, apiResults.orders);

        const result: SearchResult = {
            orders: mergedResults,
            fromCache: cacheResults,
            fromApi: apiResults.orders,
            hasMore: apiResults.hasMore,
            nextCursor: apiResults.nextCursor,
            totalFound: mergedResults.length,
            searchTime: performance.now() - startTime
        };

        // Cache the result
        this.searchCache.set(cacheKey, result);
        this.cleanupOldCacheEntries();

        return result;
    }

    /**
     * Quick search through already loaded orders
     */
    private searchLoadedOrders(
        query: string,
        orders: Order[],
        filters: SearchFilters
    ): Order[] {
        if (!query.trim()) return orders;

        const searchTerm = query.toLowerCase().trim();

        return orders.filter(order => {
            // Apply status filter first if provided
            if (filters.status && filters.status.length > 0) {
                if (!filters.status.includes(order.status)) {
                    return false;
                }
            }

            // Apply date filters
            if (filters.dateFrom || filters.dateTo) {
                const orderDate = new Date(order._createdDate);
                if (filters.dateFrom && orderDate < filters.dateFrom) return false;
                if (filters.dateTo && orderDate > filters.dateTo) return false;
            }

            // Search in multiple fields
            return this.matchesSearchTerm(order, searchTerm);
        });
    }

    /**
     * Check if order matches search term in various fields
     */
    private matchesSearchTerm(order: Order, searchTerm: string): boolean {
        // Search in order number
        if (order.number.toLowerCase().includes(searchTerm)) {
            return true;
        }

        // Search in customer info
        const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
        const billingContact = order.rawOrder?.billingInfo?.contactDetails;
        const buyerInfo = order.rawOrder?.buyerInfo;

        const customerFields = [
            recipientContact?.firstName,
            recipientContact?.lastName,
            billingContact?.firstName,
            billingContact?.lastName,
            order.customer.firstName,
            order.customer.lastName,
            recipientContact?.email,
            billingContact?.email,
            buyerInfo?.email,
            order.customer.email,
            recipientContact?.phone,
            billingContact?.phone,
            order.customer.phone,
            recipientContact?.company,
            billingContact?.company,
            order.customer.company
        ];

        for (const field of customerFields) {
            if (field && field.toLowerCase().includes(searchTerm)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Search via Wix API with filters for comprehensive results
     */
    private async searchViaApi(
        query: string,
        filters: SearchFilters
    ): Promise<{ orders: Order[], hasMore: boolean, nextCursor?: string }> {
        try {
            // Build API filters - this is now async because it needs to search contacts
            const searchFilters = await this.buildApiFilters(query, filters);

            // Import the orders API
            const { orders } = await import('@wix/ecom');

            const searchParams = {
                filter: searchFilters,
                cursorPaging: {
                    limit: Math.min(filters.limit || 100, 100) // API limit is 100
                },
                sort: [{ fieldName: '_createdDate' as const, order: 'DESC' as const }]
            };

            console.log('🔍 API Search with filters:', searchFilters);

            const result = await orders.searchOrders(searchParams);

            // Map raw orders to our Order type
            const mappedOrders = await this.mapRawOrders(result.orders || []);

            return {
                orders: mappedOrders,
                hasMore: result.metadata?.hasNext || false,
                nextCursor: result.metadata?.cursors?.next
            };

        } catch (error) {
            console.error('❌ API search failed:', error);
            return { orders: [], hasMore: false };
        }
    }

    /**
     * Search contacts by name and return their contact IDs
     */
    // Alternative implementation with better error handling
    // Replace the searchContactsByName method with this version if the above still has issues:

    private async searchContactsByName(searchTerm: string): Promise<string[]> {
        try {
            const { contacts } = await import('@wix/crm');

            console.log(`🔍 Searching contacts for name: "${searchTerm}"`);

            let contactsFound: any[] = [];

            // Try the most basic search first
            try {
                const basicQuery = contacts.queryContacts();

                // Check what methods are actually available
                console.log('Available query methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(basicQuery)));

                // Try different search strategies based on what's available
                let searchResult;

                // Strategy 1: Use hasSome if available
                if (typeof basicQuery.hasSome === 'function') {
                    console.log('Using hasSome method');
                    searchResult = await basicQuery
                        .hasSome('info.name.first', [searchTerm])
                        .limit(100)
                        .find();
                }
                // Strategy 2: Use in if available  
                else if (typeof basicQuery.in === 'function') {
                    console.log('Using in method');
                    searchResult = await basicQuery
                        .in('info.name.first', [searchTerm])
                        .limit(100)
                        .find();
                }
                // Strategy 3: Use eq for exact match
                else if (typeof basicQuery.eq === 'function') {
                    console.log('Using eq method for exact match');
                    searchResult = await basicQuery
                        .eq('info.name.first', searchTerm)
                        .limit(100)
                        .find();
                }
                // Strategy 4: Just get all contacts and filter client-side (last resort)
                else {
                    console.log('Using basic find with client-side filtering');
                    searchResult = await basicQuery
                        .limit(100)
                        .find();
                }

                if (searchResult?.items) {
                    // If we got all contacts, filter client-side
                    if (!basicQuery.eq && !basicQuery.in && !basicQuery.hasSome) {
                        contactsFound = searchResult.items.filter((contact: any) => {
                            const firstName = contact.info?.name?.first?.toLowerCase() || '';
                            const lastName = contact.info?.name?.last?.toLowerCase() || '';
                            const searchLower = searchTerm.toLowerCase();
                            return firstName.includes(searchLower) || lastName.includes(searchLower);
                        });
                    } else {
                        contactsFound = searchResult.items;
                    }

                    // Also try to search last names with a separate query
                    try {
                        let lastNameResult;
                        if (typeof basicQuery.hasSome === 'function') {
                            lastNameResult = await contacts.queryContacts()
                                .hasSome('info.name.last', [searchTerm])
                                .limit(100)
                                .find();
                        } else if (typeof basicQuery.eq === 'function') {
                            lastNameResult = await contacts.queryContacts()
                                .eq('info.name.last', searchTerm)
                                .limit(100)
                                .find();
                        }

                        if (lastNameResult?.items) {
                            contactsFound = [...contactsFound, ...lastNameResult.items];
                        }
                    } catch (lastNameError) {
                        console.log('Last name search failed:', lastNameError);
                    }
                }

            } catch (error) {
                console.error('Contact query failed:', error);

                // Ultimate fallback: Return empty array and rely on client-side search only
                console.log('⚠️ Contact search completely failed, falling back to client-side filtering only');
                return [];
            }

            // Remove duplicates
            const uniqueContacts = contactsFound.filter((contact, index, self) =>
                index === self.findIndex(c => c._id === contact._id)
            );

            if (uniqueContacts.length > 0) {
                const contactIds = uniqueContacts
                    .map(contact => contact._id)
                    .filter(id => id) as string[];

                console.log(`✅ Found ${contactIds.length} unique contacts matching "${searchTerm}"`);
                console.log('Sample contacts:', uniqueContacts.slice(0, 3).map(c => ({
                    id: c._id,
                    firstName: c.info?.name?.first,
                    lastName: c.info?.name?.last
                })));

                return contactIds;
            }

            console.log(`📭 No contacts found for "${searchTerm}"`);
            return [];

        } catch (error) {
            console.error('❌ Contact search module failed:', error);
            return [];
        }
    }

    /**
     * Build API filters based on search query and filters
     * NOW USES buyerInfo.contactId for name searches!
     */
    async buildApiFilters(query: string, filters: SearchFilters): Promise<Record<string, any>> {
        const apiFilters: Record<string, any> = {
            status: { $ne: "INITIALIZED" } // Default filter
        };

        if (!query.trim()) return apiFilters;

        const searchTerm = query.trim();

        // Check if it's an order number (numeric)
        if (/^\d+$/.test(searchTerm)) {
            console.log(`🔍 Searching by order number: ${searchTerm}`);
            apiFilters.number = { $eq: parseInt(searchTerm) };
        }
        // Check if it's an email
        else if (this.isEmail(searchTerm)) {
            console.log(`🔍 Searching by email: ${searchTerm}`);
            apiFilters["buyerInfo.email"] = { $eq: searchTerm };
        }
        // Check if it's a partial email
        else if (searchTerm.includes('@')) {
            console.log(`🔍 Searching by partial email: ${searchTerm}`);
            apiFilters["buyerInfo.email"] = { $startsWith: searchTerm };
        }
        // Name search - THIS IS THE FIX!
        else if (searchTerm.length >= 2) {
            console.log(`🔍 Searching by name, looking up contact IDs for: "${searchTerm}"`);

            // Get contact IDs for people with this name
            const contactIds = await this.searchContactsByName(searchTerm);

            if (contactIds.length > 0) {
                console.log(`✅ Found ${contactIds.length} contact IDs, searching orders by buyerInfo.contactId`);
                // THIS IS THE KEY: Use buyerInfo.contactId to find orders by those contacts
                apiFilters["buyerInfo.contactId"] = { $in: contactIds };
            } else {
                console.log(`📭 No contact IDs found for "${searchTerm}", falling back to client-side filtering`);
                // Return base filter - client-side filtering will handle the name matching
                return { status: { $ne: "INITIALIZED" } };
            }
        }

        // Add status filter if provided
        if (filters.status && filters.status.length > 0) {
            if (filters.status.length === 1) {
                apiFilters.status = { $eq: filters.status[0] };
            } else {
                apiFilters.status = { $in: filters.status };
            }
        }

        // Add date filters
        if (filters.dateFrom || filters.dateTo) {
            const dateFilter: Record<string, any> = {};

            if (filters.dateFrom) {
                dateFilter.$gte = filters.dateFrom.toISOString();
            }

            if (filters.dateTo) {
                // Add one day to include the end date
                const endDate = new Date(filters.dateTo);
                endDate.setDate(endDate.getDate() + 1);
                dateFilter.$lt = endDate.toISOString();
            }

            if (Object.keys(dateFilter).length > 0) {
                apiFilters.createdDate = dateFilter;
            }
        }

        console.log('🎯 Final API filters:', apiFilters);
        return apiFilters;
    }

    /**
     * Map raw Wix orders to our Order type
     * Reuse the mapping logic from your existing order mapper
     */
    private async mapRawOrders(rawOrders: any[]): Promise<Order[]> {
        return rawOrders.map(mapWixOrder);
    }

    /**
     * Merge and deduplicate search results from cache and API
     */
    private mergeSearchResults(cacheResults: Order[], apiResults: Order[]): Order[] {
        const mergedMap = new Map<string, Order>();

        // Add cache results first (they're already loaded and processed)
        cacheResults.forEach(order => {
            mergedMap.set(order._id, order);
        });

        // Add API results, but don't override cache results
        apiResults.forEach(order => {
            if (!mergedMap.has(order._id)) {
                mergedMap.set(order._id, order);
            }
        });

        // Convert back to array and sort by creation date (newest first)
        return Array.from(mergedMap.values()).sort((a, b) =>
            new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime()
        );
    }

    /**
     * Helper method to check if string is an email
     */
    private isEmail(str: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    }

    /**
     * Generate cache key for search results
     */
    private generateCacheKey(query: string, filters: SearchFilters): string {
        const key = JSON.stringify({
            query: query.toLowerCase().trim(),
            status: filters.status?.sort(),
            dateFrom: filters.dateFrom?.toISOString(),
            dateTo: filters.dateTo?.toISOString()
        });
        return btoa(key); // Base64 encode for clean key
    }

    /**
     * Clean up old cache entries (keep only last 10)
     */
    private cleanupOldCacheEntries(): void {
        if (this.searchCache.size > 10) {
            const entries = Array.from(this.searchCache.entries());
            // Sort by search time and keep only the most recent 10
            entries.sort((a, b) => b[1].searchTime - a[1].searchTime);

            this.searchCache.clear();
            entries.slice(0, 10).forEach(([key, value]) => {
                this.searchCache.set(key, value);
            });
        }
    }

    /**
     * Clear search cache
     */
    clearCache(): void {
        this.searchCache.clear();
    }

    /**
     * Debounced search for real-time search as user types
     */
    debouncedSearch(
        query: string,
        loadedOrders: Order[],
        filters: SearchFilters,
        callback: (result: SearchResult) => void,
        delay: number = 300
    ): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        this.searchTimeout = setTimeout(async () => {
            const result = await this.performAdvancedSearch(query, loadedOrders, filters);
            callback(result);
        }, delay) as any;
    }

    /**
     * Cancel ongoing debounced search
     */
    cancelDebouncedSearch(): void {
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }
}