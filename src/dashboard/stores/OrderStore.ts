// stores/OrderStore.ts - UPDATED with Search Support
import { makeAutoObservable } from 'mobx';
import type { Order, OrderStatus, ConnectionStatus } from '../types/Order';
import type { SearchResult } from '../services/AdvancedSearchService';

interface FormattedAnalytics {
    totalSales: number;
    totalOrders: number;
    totalSessions: number;
    averageOrderValue: number;
    currency: string;
    salesChange: number;
    ordersChange: number;
    sessionsChange: number;
    aovChange: number;
    period: string;
}

export class OrderStore {
    // Analytics properties
    analyticsData: any = null;
    analyticsLoading: boolean = false;
    analyticsError: string | null = null;
    formattedAnalytics: FormattedAnalytics | null = null;
    selectedAnalyticsPeriod: string = '30days';

    // Order management properties
    hasMoreOrders: boolean = false;
    nextCursor: string = '';
    isLoadingMore: boolean = false;
    loadingStatus: string = '';
    orders: Order[] = [];
    selectedOrder: Order | null = null;
    connectionStatus: ConnectionStatus = 'disconnected';
    searchQuery: string = '';

    // NEW: Search-related properties
    searchResults: SearchResult | null = null;
    isSearching: boolean = false;

    pagination = {
        hasNext: false,
        nextCursor: '',
        prevCursor: '',
        totalCount: 0
    };

    constructor() {
        // This automatically makes everything observable and actions
        makeAutoObservable(this);
    }

    // Analytics methods
    setAnalyticsData(data: any) {
        this.analyticsData = data;
    }

    setAnalyticsLoading(loading: boolean) {
        this.analyticsLoading = loading;
    }

    setAnalyticsError(error: string | null) {
        this.analyticsError = error;
    }

    setFormattedAnalytics(analytics: FormattedAnalytics | null) {
        this.formattedAnalytics = analytics;
    }

    setSelectedAnalyticsPeriod(period: string) {
        this.selectedAnalyticsPeriod = period;
    }

    // Order management methods
    setHasMoreOrders(hasMore: boolean) {
        this.hasMoreOrders = hasMore;
    }

    setNextCursor(cursor: string) {
        this.nextCursor = cursor;
    }

    setIsLoadingMore(loading: boolean) {
        this.isLoadingMore = loading;
    }

    setLoadingStatus(status: string) {
        this.loadingStatus = status;
    }

    appendOrders(newOrders: Order[]) {
        this.orders = [...this.orders, ...newOrders];
    }

    setOrders(orders: Order[]) {
        this.orders = orders;
    }

    clearOrders() {
        this.orders = [];
        this.selectedOrder = null;
        this.searchResults = null;
    }

    selectOrder(order: Order | null) {
        this.selectedOrder = order;
    }

    updateOrderStatus(orderId: string, status: OrderStatus) {
        const orderIndex = this.orders.findIndex(o => o._id === orderId);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = {
                ...this.orders[orderIndex],
                status
            };
        }

        // Also update in search results if they exist
        if (this.searchResults) {
            const searchOrderIndex = this.searchResults.orders.findIndex(o => o._id === orderId);
            if (searchOrderIndex !== -1) {
                this.searchResults.orders[searchOrderIndex] = {
                    ...this.searchResults.orders[searchOrderIndex],
                    status
                };
            }
        }

        if (this.selectedOrder?._id === orderId) {
            this.selectedOrder = {
                ...this.selectedOrder,
                status
            };
        }
    }

    updateOrder(updatedOrder: Order) {
        const orderIndex = this.orders.findIndex(o => o._id === updatedOrder._id);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = updatedOrder;
        }

        // Also update in search results if they exist
        if (this.searchResults) {
            const searchOrderIndex = this.searchResults.orders.findIndex(o => o._id === updatedOrder._id);
            if (searchOrderIndex !== -1) {
                this.searchResults.orders[searchOrderIndex] = updatedOrder;
            }
        }

        if (this.selectedOrder?._id === updatedOrder._id) {
            this.selectedOrder = updatedOrder;
        }
    }

    removeOrder(orderId: string) {
        this.orders = this.orders.filter(o => o._id !== orderId);

        // Also remove from search results if they exist
        if (this.searchResults) {
            this.searchResults.orders = this.searchResults.orders.filter(o => o._id !== orderId);
            this.searchResults.totalFound = this.searchResults.orders.length;
        }

        if (this.selectedOrder?._id === orderId) {
            this.selectedOrder = null;
        }
    }

    setSearchQuery(query: string) {
        this.searchQuery = query;
    }

    clearSearch() {
        this.searchQuery = '';
        this.searchResults = null;
        this.isSearching = false;
    }

    // NEW: Search methods
    setSearchResults(results: SearchResult | null) {
        this.searchResults = results;
    }

    setIsSearching(searching: boolean) {
        this.isSearching = searching;
    }

    setConnectionStatus(status: ConnectionStatus) {
        this.connectionStatus = status;
    }

    setPagination(pagination: {
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
        totalCount?: number;
    }) {
        this.pagination = {
            hasNext: pagination.hasNext,
            nextCursor: pagination.nextCursor,
            prevCursor: pagination.prevCursor,
            totalCount: pagination.totalCount || 0
        };
    }

    // Helper method to get orders for the selected analytics period
    getOrdersForSelectedPeriod(): Order[] {
        const period = this.selectedAnalyticsPeriod;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let startDate: Date;

        switch (period) {
            case 'today':
                startDate = today;
                break;
            case 'yesterday':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 1);
                break;
            case '7days':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 7);
                break;
            case '30days':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
                break;
            case 'thisweek':
                // FIXED: Monday-based weeks (Monday = start, Sunday = end)
                startDate = new Date(today);
                const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday=6 days back, others=dayOfWeek-1
                startDate.setDate(startDate.getDate() - daysFromMonday);
                break;
            case 'thismonth':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case '365days':
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 365);
                break;
            case 'thisyear':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(today);
                startDate.setDate(startDate.getDate() - 30);
        }

        startDate.setHours(0, 0, 0, 0);

        return this.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= startDate;
        });
    }

    // Helper method to get period label for display
    getPeriodLabel(): string {
        const labels: { [key: string]: string } = {
            'today': 'today',
            'yesterday': 'yesterday',
            '7days': '7 days',
            '30days': '30 days',
            'thisweek': 'this week',
            'thismonth': 'this month',
            '365days': '365 days',
            'thisyear': 'this year'
        };
        return labels[this.selectedAnalyticsPeriod] || '30 days';
    }

    // Computed properties
    get ordersCount() {
        return this.orders.length;
    }

    // UPDATED: filteredOrders now considers search results
    get filteredOrders() {
        // If we have search results, return those instead of filtering the main orders
        if (this.searchResults && this.searchQuery.trim()) {
            return this.searchResults.orders;
        }

        // Legacy filtering for when not using advanced search
        if (!this.searchQuery.trim()) {
            return this.orders;
        }

        const term = this.searchQuery.toLowerCase();
        return this.orders.filter(order => {
            const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
            const billingContact = order.rawOrder?.billingInfo?.contactDetails;

            const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || '';
            const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || '';
            const email = recipientContact?.email || billingContact?.email || order.customer.email || '';
            const phone = recipientContact?.phone || billingContact?.phone || order.customer.phone || '';
            const company = recipientContact?.company || billingContact?.company || order.customer.company || '';

            return (
                order.number.toLowerCase().includes(term) ||
                firstName.toLowerCase().includes(term) ||
                lastName.toLowerCase().includes(term) ||
                email.toLowerCase().includes(term) ||
                phone.toLowerCase().includes(term) ||
                company.toLowerCase().includes(term)
            );
        });
    }

    // NEW: Computed properties for search
    get hasActiveSearch(): boolean {
        return this.searchQuery.trim() !== '';
    }

    get searchResultsCount(): number {
        return this.searchResults?.totalFound || 0;
    }

    get isDisplayingSearchResults(): boolean {
        return this.hasActiveSearch && this.searchResults !== null;
    }

    get searchHasMore(): boolean {
        return this.searchResults?.hasMore || false;
    }

    get searchStats() {
        if (!this.searchResults) return null;

        return {
            totalFound: this.searchResults.totalFound,
            fromCache: this.searchResults.fromCache.length,
            fromApi: this.searchResults.fromApi.length,
            searchTime: this.searchResults.searchTime,
            hasMore: this.searchResults.hasMore
        };
    }

    get fulfilledOrders() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => order.status === 'FULFILLED');
    }

    get pendingOrders() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => order.status === 'NOT_FULFILLED');
    }

    get partiallyFulfilledOrders() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => order.status === 'PARTIALLY_FULFILLED');
    }

    get canceledOrders() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => order.status === 'CANCELED');
    }

    get hasSelectedOrder() {
        return this.selectedOrder !== null;
    }

    get isConnected() {
        return this.connectionStatus === 'connected';
    }

    get oldestUnfulfilledOrder() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        const unfulfilledOrders = ordersToCheck.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        );

        if (unfulfilledOrders.length === 0) return null;

        return unfulfilledOrders.sort((a, b) =>
            new Date(a._createdDate).getTime() - new Date(b._createdDate).getTime()
        )[0];
    }

    get unfulfilledOrdersCount() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        ).length;
    }

    get last30DaysAnalytics() {
        const last30DaysOrders = this.getLast30DaysOrders();
        const salesMetrics = this.calculateSalesMetrics(last30DaysOrders);
        const fulfillmentStats = this.getFulfillmentStats(last30DaysOrders);

        return {
            ...salesMetrics,
            ...fulfillmentStats,
            dateRange: {
                start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                end: new Date()
            }
        };
    }

    // Analytics computed property that uses selected period
    get selectedPeriodAnalytics() {
        const selectedPeriodOrders = this.getOrdersForSelectedPeriod();
        const salesMetrics = this.calculateSalesMetrics(selectedPeriodOrders);
        const fulfillmentStats = this.getFulfillmentStats(selectedPeriodOrders);

        return {
            ...salesMetrics,
            ...fulfillmentStats,
            period: this.selectedAnalyticsPeriod,
            periodLabel: this.getPeriodLabel()
        };
    }

    // Helper methods
    getLast30DaysOrders(): Order[] {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= thirtyDaysAgo;
        });
    }

    getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }

    calculateSalesMetrics(orders: Order[] = this.orders) {
        let totalSales = 0;
        let currency = 'EUR';

        orders.forEach(order => {
            const priceMatch = order.total.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
                const numericValue = parseFloat(priceMatch[0].replace(',', ''));
                if (!isNaN(numericValue)) {
                    totalSales += numericValue;
                }
            }

            const currencyMatch = order.total.match(/[€$£¥]/);
            if (currencyMatch) {
                currency = currencyMatch[0];
            }
        });

        return {
            totalSales,
            averageOrderValue: orders.length > 0 ? totalSales / orders.length : 0,
            currency,
            orderCount: orders.length
        };
    }

    getFulfillmentStats(orders: Order[] = this.orders) {
        const fulfilled = orders.filter(order => order.status === 'FULFILLED').length;
        const pending = orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        ).length;
        const cancelled = orders.filter(order => order.status === 'CANCELED').length;

        return {
            fulfilled,
            pending,
            cancelled,
            total: orders.length,
            fulfillmentRate: orders.length > 0 ? (fulfilled / orders.length) * 100 : 0
        };
    }

    getOrderById(orderId: string): Order | undefined {
        // Check search results first if we're in search mode
        if (this.isDisplayingSearchResults) {
            const searchOrder = this.searchResults!.orders.find(order => order._id === orderId);
            if (searchOrder) return searchOrder;
        }

        return this.orders.find(order => order._id === orderId);
    }

    getOrderByNumber(orderNumber: string): Order | undefined {
        // Check search results first if we're in search mode
        if (this.isDisplayingSearchResults) {
            const searchOrder = this.searchResults!.orders.find(order => order.number === orderNumber);
            if (searchOrder) return searchOrder;
        }

        return this.orders.find(order => order.number === orderNumber);
    }

    searchOrders(searchTerm: string): Order[] {
        if (!searchTerm.trim()) {
            return this.orders;
        }

        const term = searchTerm.toLowerCase();
        const ordersToSearch = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;

        return ordersToSearch.filter(order =>
            order.number.toLowerCase().includes(term) ||
            order.customer.firstName.toLowerCase().includes(term) ||
            order.customer.lastName.toLowerCase().includes(term) ||
            order.customer.email.toLowerCase().includes(term) ||
            order.customer.phone?.toLowerCase().includes(term) ||
            order.items.some(item =>
                item.name.toLowerCase().includes(term) ||
                item.sku?.toLowerCase().includes(term)
            )
        );
    }

    getOrdersByStatus(status: OrderStatus): Order[] {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;
        return ordersToCheck.filter(order => order.status === status);
    }

    getOrderStats() {
        const ordersToCheck = this.isDisplayingSearchResults ? this.searchResults!.orders : this.orders;

        return {
            total: ordersToCheck.length,
            fulfilled: this.fulfilledOrders.length,
            pending: this.pendingOrders.length,
            partiallyFulfilled: this.partiallyFulfilledOrders.length,
            canceled: this.canceledOrders.length,
            totalValue: ordersToCheck.reduce((sum, order) => {
                const value = parseFloat(order.total.replace(/[^0-9.-]+/g, ''));
                return sum + (isNaN(value) ? 0 : value);
            }, 0)
        };
    }

    selectMultipleOrders(orderIds: string[]) {
        console.log('Bulk selection not implemented yet:', orderIds);
    }

    bulkUpdateStatus(orderIds: string[], status: OrderStatus) {
        orderIds.forEach(orderId => {
            this.updateOrderStatus(orderId, status);
        });
    }

    logCurrentState() {
        console.log('OrderStore State:', {
            ordersCount: this.ordersCount,
            selectedOrder: this.selectedOrder?.number || 'none',
            connectionStatus: this.connectionStatus,
            searchQuery: this.searchQuery,
            filteredCount: this.filteredOrders.length,
            pagination: this.pagination,
            stats: this.getOrderStats(),
            search: {
                hasActiveSearch: this.hasActiveSearch,
                isDisplayingSearchResults: this.isDisplayingSearchResults,
                searchResultsCount: this.searchResultsCount,
                isSearching: this.isSearching,
                searchStats: this.searchStats
            },
            analytics: {
                loading: this.analyticsLoading,
                error: this.analyticsError,
                hasData: !!this.analyticsData,
                hasFormattedData: !!this.formattedAnalytics,
                selectedPeriod: this.selectedAnalyticsPeriod,
                periodLabel: this.getPeriodLabel()
            }
        });
    }
}