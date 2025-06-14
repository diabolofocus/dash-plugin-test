// controllers/OrderController.ts - COMPLETE with Simple Real-time Features
import { AnalyticsService } from '../services/AnalyticsService';
import { AdvancedSearchService, type SearchFilters, type SearchResult } from '../services/AdvancedSearchService';
import { RealtimeOrderService } from '../services/RealtimeOrderService';
import { dashboard } from '@wix/dashboard';
import type { OrderStore } from '../stores/OrderStore';
import { getCurrentSiteId } from '../utils/get-siteId';
import type { UIStore } from '../stores/UIStore';
import type { OrderService } from '../services/OrderService';
import type { Order, FulfillOrderParams, OrderStatus } from '../types/Order';
import { DEMO_ORDERS } from '../utils/constants';
import { getSiteIdFromContext, debugSiteIdSources } from '../utils/get-siteId';
import { mapWixOrder } from '../../backend/utils/order-mapper';

export class OrderController {
    private advancedSearchService: AdvancedSearchService;
    private realtimeService: RealtimeOrderService;
    private searchTimeout: number | null = null;
    private currentSearchQuery: string = '';
    private lastSearchResult: SearchResult | null = null;
    private analyticsRefreshTimeout: number | null = null;

    private realtimeInitialized: boolean = false;

    private isFilterMode: boolean = false;
    private currentStatusFilter: string | null = null;

    constructor(
        private orderStore: OrderStore,
        private uiStore: UIStore,
        private orderService: OrderService
    ) {
        this.advancedSearchService = new AdvancedSearchService();

        this.realtimeService = new RealtimeOrderService();
        this.initializeRealtimeUpdates();
    }

    // === SIMPLIFIED REAL-TIME METHODS ===

    /**
     * AUTO-START: Initialize real-time updates automatically
     */
    private async initializeRealtimeUpdates() {
        if (this.realtimeInitialized) {
            return;
        }

        this.realtimeInitialized = true;

        this.realtimeService.onNewOrder((newOrder: Order) => {
            this.handleNewOrder(newOrder);
        });

        // Service auto-starts polling in constructor
    }

    // Add this to your OrderController.ts in the handleNewOrder method:

    // In OrderController.ts - Remove sound from handleNewOrder:

    /**
     * ✅ FIXED: Handle new order WITHOUT playing sound (sound is handled by RealtimeOrderService)
     */
    private handleNewOrder(newOrder: Order) {
        try {
            // Check if order already exists in store
            const existingOrder = this.orderStore.getOrderById(newOrder._id);
            if (existingOrder) {
                return;
            }

            // Add to store
            this.orderStore.addNewOrder(newOrder);

            // Show toast notification
            this.showToast(`🆕 New order #${newOrder.number} received!`, 'success');

            // Auto-select if no order is currently selected
            if (!this.orderStore.selectedOrder) {
                this.orderStore.selectOrder(newOrder);
            }

            // Refresh analytics
            this.refreshAnalyticsIfNeeded();

        } catch (error) {
            // Error handling new order
        }
    }

    /**
     * Refresh analytics if auto-refresh is enabled
     */
    private refreshAnalyticsIfNeeded() {
        // Only refresh if we're on a current period that would include new orders
        const currentPeriod = this.orderStore.selectedAnalyticsPeriod;
        const shouldRefresh = ['today', '7days', '30days', 'thisweek', 'thismonth'].includes(currentPeriod);

        if (shouldRefresh) {
            // Debounce analytics refresh to avoid too many calls
            if (this.analyticsRefreshTimeout) {
                clearTimeout(this.analyticsRefreshTimeout);
            }
            this.analyticsRefreshTimeout = setTimeout(() => {
                this.loadAnalyticsForPeriod(currentPeriod as any);
            }, 2000) as any;
        }
    }

    /**
     * Test the notification system
     */
    async testNotifications(): Promise<void> {
        this.realtimeService.testSound();
    }

    /**
     * Configure notification settings (simplified)
     */
    updateNotificationSettings(settings: { soundEnabled?: boolean }): void {
        // In the simplified version, sound is always enabled
    }

    /**
     * Get real-time service status
     */
    getRealtimeStatus() {
        return this.realtimeService.getStatus();
    }

    // === SEARCH METHODS ===

    /**
     * Enhanced search method - replaces the old updateSearchQuery
     */
    async performAdvancedSearch(query: string, statusFilter?: string[]): Promise<void> {
        const trimmedQuery = query.trim();
        this.currentSearchQuery = trimmedQuery;

        // Clear previous search timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // If query is empty, reset to show all orders
        if (!trimmedQuery) {
            this.orderStore.setSearchQuery('');
            this.orderStore.setSearchResults(null);
            this.lastSearchResult = null;
            return;
        }

        // Set immediate feedback
        this.orderStore.setSearchQuery(trimmedQuery);
        this.uiStore.setSearching(true);

        try {
            const filters: SearchFilters = {
                query: trimmedQuery,
                status: statusFilter,
                limit: 100
            };

            const searchResult = await this.advancedSearchService.performAdvancedSearch(
                trimmedQuery,
                this.orderStore.orders, // Pass currently loaded orders
                filters
            );

            // Only update if this is still the current search
            if (this.currentSearchQuery === trimmedQuery) {
                this.lastSearchResult = searchResult;
                this.orderStore.setSearchResults(searchResult);
            }

        } catch (error) {
            // Fallback to basic search on loaded orders
            this.performBasicSearch(trimmedQuery);

            this.showToast('Search completed with basic results', 'warning');
        } finally {
            this.uiStore.setSearching(false);
        }
    }

    /**
     * Main search method that replaces updateSearchQuery - debounced search for real-time search as user types
     */
    updateSearchQuery(query: string, statusFilter?: string[]): void {
        // Cancel previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Set immediate UI feedback
        this.orderStore.setSearchQuery(query);

        // If query is empty, reset immediately
        if (!query.trim()) {
            this.orderStore.setSearchResults(null);
            this.lastSearchResult = null;
            return;
        }

        // Debounce the actual search
        this.searchTimeout = setTimeout(() => {
            this.performAdvancedSearch(query, statusFilter);
        }, 300) as any; // 300ms delay for debouncing
    }

    /**
     * Fallback basic search through loaded orders only
     */
    private performBasicSearch(query: string): void {
        if (!query.trim()) {
            this.orderStore.setSearchResults(null);
            return;
        }

        const searchTerm = query.toLowerCase();
        const filteredOrders = this.orderStore.orders.filter(order => {
            const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
            const billingContact = order.rawOrder?.billingInfo?.contactDetails;

            const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || '';
            const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || '';
            const email = recipientContact?.email || billingContact?.email || order.customer.email || '';
            const phone = recipientContact?.phone || billingContact?.phone || order.customer.phone || '';
            const company = recipientContact?.company || billingContact?.company || order.customer.company || '';

            return (
                order.number.toLowerCase().includes(searchTerm) ||
                firstName.toLowerCase().includes(searchTerm) ||
                lastName.toLowerCase().includes(searchTerm) ||
                email.toLowerCase().includes(searchTerm) ||
                phone.toLowerCase().includes(searchTerm) ||
                company.toLowerCase().includes(searchTerm)
            );
        });

        // Create a basic search result
        const basicResult: SearchResult = {
            orders: filteredOrders,
            fromCache: filteredOrders,
            fromApi: [],
            hasMore: false,
            totalFound: filteredOrders.length,
            searchTime: 0
        };

        this.orderStore.setSearchResults(basicResult);
        this.lastSearchResult = basicResult;
    }

    /**
     * Load more search results if available
     */
    async loadMoreSearchResults(): Promise<void> {
        if (!this.lastSearchResult?.hasMore || !this.lastSearchResult.nextCursor) {
            return;
        }

        if (!this.currentSearchQuery.trim()) {
            return;
        }

        try {
            this.uiStore.setLoadingMore(true);

            const filters: SearchFilters = {
                query: this.currentSearchQuery,
                limit: 100
            };

            const { orders } = await import('@wix/ecom');
            const searchFilters: SearchFilters = {
                query: this.currentSearchQuery,
                limit: 100
            };

            // FIX: Add await here since buildApiFilters is now async
            const apiFilters = await this.advancedSearchService.buildApiFilters(this.currentSearchQuery, searchFilters);

            const searchParams = {
                filter: apiFilters,
                cursorPaging: {
                    limit: 100,
                    cursor: this.lastSearchResult.nextCursor
                },
                sort: [{ fieldName: '_createdDate' as const, order: 'DESC' as const }]
            };

            const result = await orders.searchOrders(searchParams);

            if (result.orders && result.orders.length > 0) {
                // Map and merge new results with proper type assertion
                const newOrders: Order[] = result.orders.map((rawOrder: any) => mapWixOrder(rawOrder));

                // Update search results
                const updatedResult: SearchResult = {
                    ...this.lastSearchResult,
                    orders: [...this.lastSearchResult.orders, ...newOrders],
                    fromApi: [...this.lastSearchResult.fromApi, ...newOrders],
                    hasMore: result.metadata?.hasNext || false,
                    nextCursor: result.metadata?.cursors?.next,
                    totalFound: this.lastSearchResult.totalFound + newOrders.length
                };

                this.lastSearchResult = updatedResult;
                this.orderStore.setSearchResults(updatedResult);
            }

        } catch (error) {
            this.showToast('Failed to load more results', 'error');
        } finally {
            this.uiStore.setLoadingMore(false);
        }
    }

    /**
     * Perform status-based filtering on full dataset
     */
    async performStatusFilter(statusFilter: string): Promise<void> {
        this.isFilterMode = true;
        this.currentStatusFilter = statusFilter;

        try {
            const apiFilters = this.buildStatusApiFilters(statusFilter);

            const { orders } = await import('@wix/ecom');

            const searchParams = {
                filter: apiFilters,
                cursorPaging: {
                    limit: 100
                },
                sort: [{ fieldName: '_createdDate' as const, order: 'DESC' as const }]
            };

            const result = await orders.searchOrders(searchParams);

            if (result.orders) {
                const filteredOrders = result.orders.map(mapWixOrder);

                // Update the main orders array with filtered results
                this.orderStore.setOrders(filteredOrders);
                this.orderStore.setHasMoreOrders(result.metadata?.hasNext || false);
                this.orderStore.setNextCursor(result.metadata?.cursors?.next || '');
            }

        } catch (error) {
            this.showToast('Failed to apply status filter', 'error');
            throw error; // Re-throw for UI handling
        }
    }

    /**
     * Clear status filter and reload original orders
     */
    clearStatusFilter(): void {
        this.isFilterMode = false;
        this.currentStatusFilter = null;
        this.loadOrders();
    }

    /**
     * Build API filters for status filtering
     */
    private buildStatusApiFilters(statusFilter: string): Record<string, any> {
        const baseFilter = {
            status: { $ne: "INITIALIZED" }
        };

        switch (statusFilter) {
            case 'unfulfilled':
                return {
                    ...baseFilter,
                    fulfillmentStatus: { $in: ["NOT_FULFILLED", "PARTIALLY_FULFILLED"] },
                    archived: { $ne: true }
                };

            case 'fulfilled':
                return {
                    ...baseFilter,
                    fulfillmentStatus: { $eq: "FULFILLED" },
                    archived: { $ne: true }
                };

            case 'unpaid':
                return {
                    ...baseFilter,
                    paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID", "NOT_PAID", "PENDING"] }
                };

            case 'refunded':
                return {
                    ...baseFilter,
                    paymentStatus: { $in: ["FULLY_REFUNDED", "PARTIALLY_REFUNDED"] }
                };

            case 'canceled':
                return {
                    ...baseFilter,
                    status: { $eq: "CANCELED" }
                };

            case 'archived':
                return {
                    ...baseFilter,
                    archived: { $eq: true }
                };

            default:
                return baseFilter;
        }
    }

    /**
     * Clear search and return to all orders
     */
    clearSearch(): void {
        this.currentSearchQuery = '';
        this.lastSearchResult = null;
        this.orderStore.setSearchQuery('');
        this.orderStore.setSearchResults(null);
        this.advancedSearchService.clearCache();

        // Cancel any pending search
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
            this.searchTimeout = null;
        }
    }

    /**
     * Get current search statistics for UI display
     */
    getSearchStats(): {
        isSearching: boolean;
        hasResults: boolean;
        totalFound: number;
        fromCache: number;
        fromApi: number;
        searchTime: number;
        hasMore: boolean;
    } | null {
        if (!this.lastSearchResult) {
            return null;
        }

        return {
            isSearching: this.uiStore.searching || false,
            hasResults: this.lastSearchResult.totalFound > 0,
            totalFound: this.lastSearchResult.totalFound,
            fromCache: this.lastSearchResult.fromCache.length,
            fromApi: this.lastSearchResult.fromApi.length,
            searchTime: this.lastSearchResult.searchTime,
            hasMore: this.lastSearchResult.hasMore
        };
    }

    // === ORDER MANAGEMENT METHODS ===

    /**
     * Load initial orders with chunked loading
     */
    async loadOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        try {
            this.uiStore.setLoading(true);
            this.orderStore.setConnectionStatus('connecting');
            this.orderStore.setLoadingStatus('Loading orders...');

            // Clear any existing search when loading fresh orders
            this.clearSearch();

            // Load initial 100 orders with progress updates
            const result = await this.orderService.fetchOrdersChunked(100, (orders, totalLoaded, hasMore) => {
                // Update orders immediately with each batch
                this.orderStore.setOrders(orders);
                this.orderStore.setLoadingStatus(`Loading orders... (${totalLoaded})`);

                // Set connected after first batch so UI is responsive
                if (totalLoaded >= 100) {
                    this.orderStore.setConnectionStatus('connected');
                    this.uiStore.setLoading(false);
                }
            });

            if (result.success) {
                this.orderStore.setOrders(result.orders);
                this.orderStore.setHasMoreOrders(result.hasMore);
                this.orderStore.setNextCursor(result.nextCursor || '');
                this.orderStore.setConnectionStatus('connected');
                this.orderStore.setLoadingStatus('');
                this.autoSelectOldestUnfulfilled();
            } else {
                this.handleLoadError(new Error(result.error || 'Failed to load orders'));
            }

        } catch (error) {
            this.orderStore.setLoadingStatus('');
            this.handleLoadError(error);
        } finally {
            this.uiStore.setLoading(false);
        }
    }

    /**
     * Load more orders (pagination) - supports both regular and filtered modes
     */
    async loadMoreOrders() {
        if (!this.orderStore.hasMoreOrders || this.orderStore.isLoadingMore) {
            return;
        }

        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        try {
            this.orderStore.setIsLoadingMore(true);
            this.orderStore.setLoadingStatus('Loading more orders...');

            if (this.isFilterMode && this.currentStatusFilter) {

                const { orders } = await import('@wix/ecom');
                const apiFilters = this.buildStatusApiFilters(this.currentStatusFilter);

                const searchParams = {
                    filter: apiFilters,
                    cursorPaging: {
                        limit: 100,
                        cursor: this.orderStore.nextCursor
                    },
                    sort: [{ fieldName: '_createdDate' as const, order: 'DESC' as const }]
                };

                const result = await orders.searchOrders(searchParams);

                if (result.orders && result.orders.length > 0) {
                    const newOrders = result.orders.map(mapWixOrder);
                    this.orderStore.appendOrders(newOrders);
                    this.orderStore.setHasMoreOrders(result.metadata?.hasNext || false);
                    this.orderStore.setNextCursor(result.metadata?.cursors?.next || '');
                } else {
                    this.orderStore.setHasMoreOrders(false);
                }

            } else {
                // Regular load more using OrderService
                const result = await this.orderService.fetchMoreOrders(this.orderStore.nextCursor, 100);

                if (result.success) {
                    this.orderStore.appendOrders(result.orders);
                    this.orderStore.setHasMoreOrders(result.hasMore);
                    this.orderStore.setNextCursor(result.nextCursor || '');
                } else {
                    this.orderStore.setHasMoreOrders(false);
                }
            }

        } catch (error) {
            this.orderStore.setHasMoreOrders(false);
            // Don't show toast for load more errors to avoid spam
        } finally {
            this.orderStore.setIsLoadingMore(false);
            this.orderStore.setLoadingStatus('');
        }
    }

    /**
     * Refresh orders
     */
    async refreshOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        this.uiStore.setRefreshing(true);
        this.clearSelection();
        this.clearSearch(); // Clear search on refresh

        try {
            const result = await this.orderService.fetchOrders({
                limit: 50,
                cursor: undefined
            });

            if (result.success && result.orders && result.orders.length > 0) {
                this.orderStore.setOrders(result.orders);

                // Use actual pagination data instead of hardcoding
                this.orderStore.setPagination({
                    hasNext: result.pagination?.hasNext || false,
                    nextCursor: result.pagination?.nextCursor || '',
                    prevCursor: result.pagination?.prevCursor || ''
                });

                this.orderStore.setConnectionStatus('connected');

                this.showToast(`Orders refreshed successfully.`, 'success');
                this.autoSelectOldestUnfulfilled();

            } else {
                this.handleNoOrdersFound(result.message);
            }

        } catch (error) {
            this.handleRefreshError(error);
        } finally {
            this.uiStore.setRefreshing(false);
        }
    }

    /**
     * Select an order
     */
    selectOrder(order: Order) {
        this.orderStore.selectOrder(order);
        this.uiStore.resetForm();

        // Pre-populate if order has existing tracking info
        if ((order as any).trackingNumber) {
            this.uiStore.setTrackingNumber((order as any).trackingNumber);
        }
        if ((order as any).shippingCarrier) {
            this.uiStore.setSelectedCarrier((order as any).shippingCarrier);
        }
    }

    /**
     * Clear order selection
     */
    clearSelection() {
        this.orderStore.selectOrder(null);
        this.uiStore.resetForm();
    }

    /**
     * Fulfill an order with real-time feedback
     */
    async fulfillOrder(params?: FulfillOrderParams & { sendShippingEmail?: boolean }): Promise<void> {
        // Use params if provided, otherwise use store state
        let fulfillmentParams: FulfillOrderParams & { sendShippingEmail?: boolean };

        if (params) {
            fulfillmentParams = params;
        } else {
            const { selectedOrder } = this.orderStore;
            const { trackingNumber, selectedCarrier } = this.uiStore;

            if (!trackingNumber || !selectedCarrier || !selectedOrder) {
                this.showToast('Please enter tracking number and select carrier', 'error');
                return;
            }

            fulfillmentParams = {
                orderId: selectedOrder._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder.number,
                sendShippingEmail: true // Default to true for backward compatibility
            };
        }

        this.uiStore.setSubmitting(true);

        try {
            const result = await this.orderService.fulfillOrder(fulfillmentParams);

            if (result.success) {
                // Update order status immediately for instant feedback
                this.orderStore.updateOrderStatus(fulfillmentParams.orderId, 'FULFILLED');

                // Show success notification with email info
                let message = `Order #${fulfillmentParams.orderNumber} fulfilled successfully!`;

                if (result.emailInfo) {
                    if (result.emailInfo.emailSentAutomatically) {
                        message += ' • Confirmation email sent to customer';
                    } else {
                        message += ' • No email sent';
                    }
                }

                this.showToast(message, 'success');

                // Refresh the selected order to get latest data
                if (this.orderStore.selectedOrder?._id === fulfillmentParams.orderId) {
                    await this.selectOrderById(fulfillmentParams.orderId);
                }

            } else {
                throw new Error(result.error || 'Fulfillment failed');
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showToast(`Failed to fulfill order: ${errorMessage}`, 'error');
        } finally {
            this.uiStore.resetForm();
            this.uiStore.setSubmitting(false);
        }
    }

    /**
     * Select an order by ID and refresh its data
     */
    async selectOrderById(orderId: string): Promise<void> {
        // Quick selection from current data
        const existingOrder = this.orderStore.getOrderById(orderId);
        if (existingOrder) {
            this.orderStore.selectOrder(existingOrder);
        }

        // Fetch fresh data in background
        try {
            const result = await this.orderService.fetchSingleOrder(orderId);
            if (result.success && result.order) {
                this.orderStore.updateOrder(result.order);
                this.orderStore.selectOrder(result.order);
            }
        } catch (error) {
            // Failed to refresh selected order
        }
    }

    // === ANALYTICS METHODS ===

    /**
     * Load analytics for a specific period
     */
    async loadAnalyticsForPeriod(period: 'today' | 'yesterday' | '7days' | '30days' | 'thisweek' | 'thismonth' | '365days' | 'thisyear' = '30days') {
        try {
            this.orderStore.setAnalyticsLoading(true);
            this.orderStore.setAnalyticsError(null);

            const analyticsService = new AnalyticsService();
            const siteId = getSiteIdFromContext();

            if (!siteId) {
                throw new Error('Site ID not found - using fallback');
            }

            // Get analytics with comparison data
            const result = await analyticsService.getAnalyticsWithComparison(period);

            if (result.success) {
                // Store the analytics data with comparison
                this.orderStore.setAnalyticsData({
                    TOTAL_SALES: { total: result.data.totalSales },
                    TOTAL_ORDERS: { total: result.data.totalOrders },
                    TOTAL_SESSIONS: { total: result.data.totalSessions }
                });

                // Store the formatted analytics with comparison data
                this.orderStore.setFormattedAnalytics({
                    totalSales: result.data.totalSales,
                    totalOrders: result.data.totalOrders,
                    totalSessions: result.data.totalSessions,
                    averageOrderValue: result.data.averageOrderValue,
                    currency: result.data.currency,
                    salesChange: result.data.salesChange,
                    ordersChange: result.data.ordersChange,
                    sessionsChange: result.data.sessionsChange,
                    aovChange: result.data.aovChange,
                    period: period
                });

            } else {
                throw new Error(result.error || 'Analytics API failed');
            }

        } catch (error: any) {
            this.orderStore.setAnalyticsError(error.message);

            // Fallback to order-based analytics with comparison
            this.calculateAnalyticsFromOrdersWithComparison(period);

        } finally {
            this.orderStore.setAnalyticsLoading(false);
        }
    }

    /**
     * Enhanced fallback method with comparison
     */
    private calculateAnalyticsFromOrdersWithComparison(period: string) {
        const { current, previous } = this.getOrderDateRanges(period);

        // Get orders for current period
        const currentOrders = this.orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= current.start && orderDate <= current.end;
        });

        // Get orders for previous period
        const previousOrders = this.orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= previous.start && orderDate <= previous.end;
        });

        // Calculate metrics
        const currentMetrics = this.calculateOrderMetrics(currentOrders);
        const previousMetrics = this.calculateOrderMetrics(previousOrders);

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        // Store fallback analytics with comparison
        this.orderStore.setFormattedAnalytics({
            totalSales: currentMetrics.totalSales,
            totalOrders: currentMetrics.totalOrders,
            totalSessions: 0, // Not available from orders
            averageOrderValue: currentMetrics.averageOrderValue,
            currency: currentMetrics.currency,
            salesChange: calculateChange(currentMetrics.totalSales, previousMetrics.totalSales),
            ordersChange: calculateChange(currentMetrics.totalOrders, previousMetrics.totalOrders),
            sessionsChange: 0,
            aovChange: calculateChange(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue),
            period: period
        });
    }

    /**
     * Helper method to calculate metrics from orders
     */
    private calculateOrderMetrics(orders: any[]) {
        let totalSales = 0;
        let currency = '€';

        orders.forEach(order => {
            const parsedPrice = this.parsePrice(order.total);
            totalSales += parsedPrice;
            const orderCurrency = this.extractCurrency(order.total);
            if (orderCurrency !== '€') {
                currency = orderCurrency;
            }
        });

        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        return {
            totalSales,
            totalOrders,
            averageOrderValue,
            currency
        };
    }

    /**
     * Helper method to get date ranges for order comparison
     */
    private getOrderDateRanges(period: string) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (period) {
            case 'today':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    current: { start: today, end: today },
                    previous: { start: yesterday, end: yesterday }
                };

            case 'yesterday':
                const yesterdayStart = new Date(today);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                const dayBefore = new Date(today);
                dayBefore.setDate(dayBefore.getDate() - 2);
                return {
                    current: { start: yesterdayStart, end: yesterdayStart },
                    previous: { start: dayBefore, end: dayBefore }
                };

            case '7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const fourteenDaysAgo = new Date(today);
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                return {
                    current: { start: sevenDaysAgo, end: today },
                    previous: { start: fourteenDaysAgo, end: sevenDaysAgo }
                };

            case '30days':
            default:
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const sixtyDaysAgo = new Date(today);
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                return {
                    current: { start: thirtyDaysAgo, end: today },
                    previous: { start: sixtyDaysAgo, end: thirtyDaysAgo }
                };
        }
    }

    // === UTILITY METHODS ===

    /**
     * Helper methods for price parsing
     */
    private parsePrice(priceString: string): number {
        if (!priceString || typeof priceString !== 'string') return 0;

        let cleanPrice = priceString.replace(/[^\d,.-]/g, '');

        if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
            const lastComma = cleanPrice.lastIndexOf(',');
            const lastDot = cleanPrice.lastIndexOf('.');

            if (lastComma > lastDot) {
                cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            } else {
                cleanPrice = cleanPrice.replace(/,/g, '');
            }
        } else if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
            const parts = cleanPrice.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                cleanPrice = cleanPrice.replace(',', '.');
            } else {
                cleanPrice = cleanPrice.replace(/,/g, '');
            }
        }

        const parsed = parseFloat(cleanPrice);
        return isNaN(parsed) ? 0 : parsed;
    }

    private extractCurrency(priceString: string): string {
        if (!priceString) return '€';

        const currencyMatch = priceString.match(/[€$£¥₹₽¢]/);
        if (currencyMatch) return currencyMatch[0];

        const codeMatch = priceString.match(/[A-Z]{3}/);
        if (codeMatch) return codeMatch[0];

        return '€';
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`${label} copied to clipboard`, 'success');
        } catch (error) {
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    /**
     * Auto-select oldest unfulfilled order
     */
    private autoSelectOldestUnfulfilled() {
        const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
        if (oldestUnfulfilled && !this.orderStore.selectedOrder) {
            this.selectOrder(oldestUnfulfilled);
        }
    }

    /**
     * Handle no orders found scenario
     */
    private handleNoOrdersFound(message?: string) {
        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('disconnected');
    }

    /**
     * Handle order loading errors
     */
    private handleLoadError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');
    }

    /**
     * Handle refresh errors
     */
    private handleRefreshError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');

        // Set proper pagination for demo data
        this.orderStore.setPagination({
            hasNext: false,
            nextCursor: '',
            prevCursor: ''
        });

        this.showToast(`Failed to refresh orders: ${errorMessage}`, 'error');
    }

    /**
     * Show toast notification with fallback to console
     */
    private showToast(message: string, type: 'success' | 'error' | 'warning') {
        try {
            dashboard.showToast({ message, type });
        } catch (error) {
            // Fallback to console if dashboard toast fails
        }
    }

    /**
     * Refresh all data
     */
    async refreshData(): Promise<void> {
        await Promise.all([
            this.loadOrders(),
            this.loadAnalyticsForPeriod(this.orderStore.selectedAnalyticsPeriod as any)
        ]);
    }

    /**
     * Cleanup when component unmounts
     */
    destroy(): void {
        // Clear timeouts
        if (this.analyticsRefreshTimeout) {
            clearTimeout(this.analyticsRefreshTimeout);
        }

        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Clear search state
        this.clearSearch();

        // Real-time service cleanup (if needed in future)
    }
}