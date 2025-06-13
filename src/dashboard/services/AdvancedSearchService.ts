// services/AdvancedSearchService.ts
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
            const searchFilters = this.buildApiFilters(query, filters);

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
     * Build API filters based on search query and filters
     */
    private buildApiFilters(query: string, filters: SearchFilters): Record<string, any> {
        const apiFilters: Record<string, any> = {
            status: { $ne: "INITIALIZED" } // Default filter
        };

        if (!query.trim()) return apiFilters;

        const searchTerm = query.trim();

        // Check if it's an order number (numeric)
        if (/^\d+$/.test(searchTerm)) {
            // Search by order number
            apiFilters.number = { $eq: parseInt(searchTerm) };
        } else if (this.isEmail(searchTerm)) {
            // Search by email
            apiFilters["buyerInfo.email"] = { $eq: searchTerm };
        } else if (searchTerm.includes('@')) {
            // Partial email search
            apiFilters["buyerInfo.email"] = { $startsWith: searchTerm };
        } else {
            // For names, we'll use a combination approach
            // Since we can't directly filter by name, we'll search by email pattern
            // and let the client-side filtering handle name matching

            // If it looks like it could be part of an email, search for it
            if (searchTerm.length >= 3) {
                apiFilters["buyerInfo.email"] = { $startsWith: searchTerm };
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