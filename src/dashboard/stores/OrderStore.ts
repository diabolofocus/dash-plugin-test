// stores/OrderStore.ts - FIXED with proper imports and missing properties
import { makeAutoObservable, observable, action } from 'mobx';
import type { Order, OrderStatus, ConnectionStatus } from '../types/Order'; // 🔥 FIXED: Import ConnectionStatus

export class OrderStore {

    // Add these analytics properties to OrderStore.ts
    @observable analyticsData: any = null;
    @observable analyticsLoading: boolean = false;
    @observable analyticsError: string | null = null;

    @action
    setAnalyticsData(data: any) {
        this.analyticsData = data;
    }

    @action
    setAnalyticsLoading(loading: boolean) {
        this.analyticsLoading = loading;
    }

    @action
    setAnalyticsError(error: string | null) {
        this.analyticsError = error;
    }

    // Getter for formatted analytics
    get formattedAnalytics() {
        if (!this.analyticsData) return null;

        const totalSales = this.analyticsData.TOTAL_SALES?.total || 0;
        const totalOrders = this.analyticsData.TOTAL_ORDERS?.total || 0;
        const totalSessions = this.analyticsData.TOTAL_SESSIONS?.total || 0;

        return {
            totalSales: totalSales,
            totalOrders: totalOrders,
            totalSessions: totalSessions,
            averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
            currency: '€' // You might want to get this from site settings
        };
    }

    // Add these properties to OrderStore.ts
    @observable hasMoreOrders: boolean = false;

    @observable nextCursor: string = '';
    @observable isLoadingMore: boolean = false;
    @observable loadingStatus: string = '';

    @action
    setHasMoreOrders(hasMore: boolean) {
        this.hasMoreOrders = hasMore;
    }

    @action
    setNextCursor(cursor: string) {
        this.nextCursor = cursor;
    }

    @action
    setIsLoadingMore(loading: boolean) {
        this.isLoadingMore = loading;
    }

    @action
    setLoadingStatus(status: string) {
        this.loadingStatus = status;
    }

    @action
    appendOrders(newOrders: Order[]) {
        this.orders = [...this.orders, ...newOrders];
    }


    orders: Order[] = [];
    selectedOrder: Order | null = null;
    connectionStatus: ConnectionStatus = 'disconnected'; // 🔥 FIXED: Use proper type
    searchQuery: string = ''; // 🔥 ADDED: Missing search query property

    // 🔥 FIXED: Proper pagination type with totalCount
    pagination = {
        hasNext: false,
        nextCursor: '',
        prevCursor: '',
        totalCount: 0  // 🔥 ADDED: Include totalCount
    };

    constructor() {
        makeAutoObservable(this);
    }

    // Order management
    setOrders(orders: Order[]) {
        this.orders = orders;
    }

    clearOrders() {
        this.orders = [];
        this.selectedOrder = null;
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

        // Update selected order if it's the same one
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

        // Update selected order if it's the same one
        if (this.selectedOrder?._id === updatedOrder._id) {
            this.selectedOrder = updatedOrder;
        }
    }

    removeOrder(orderId: string) {
        this.orders = this.orders.filter(o => o._id !== orderId);

        if (this.selectedOrder?._id === orderId) {
            this.selectedOrder = null;
        }
    }

    // Search functionality - 🔥 ADDED: Missing search methods
    setSearchQuery(query: string) {
        this.searchQuery = query;
    }

    clearSearch() {
        this.searchQuery = '';
    }

    // Connection status
    setConnectionStatus(status: ConnectionStatus) {
        this.connectionStatus = status;
    }

    // Pagination
    setPagination(pagination: {
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
        totalCount?: number; // Add this optional property
    }) {
        this.pagination = {
            hasNext: pagination.hasNext,
            nextCursor: pagination.nextCursor,
            prevCursor: pagination.prevCursor,
            totalCount: pagination.totalCount || 0
        };
    }

    // Getters
    get ordersCount() {
        return this.orders.length;
    }

    // 🔥 ADDED: Missing filteredOrders getter
    get filteredOrders() {
        if (!this.searchQuery.trim()) {
            return this.orders;
        }

        const term = this.searchQuery.toLowerCase();
        return this.orders.filter(order => {
            // Get customer info from multiple sources
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
                company.toLowerCase().includes(term) ||
                order.items?.some(item =>
                    item.name?.toLowerCase().includes(term) ||
                    item.sku?.toLowerCase().includes(term)
                )
            );
        });
    }

    get fulfilledOrders() {
        return this.orders.filter(order => order.status === 'FULFILLED');
    }

    get pendingOrders() {
        return this.orders.filter(order => order.status === 'NOT_FULFILLED');
    }

    get partiallyFulfilledOrders() {
        return this.orders.filter(order => order.status === 'PARTIALLY_FULFILLED');
    }

    get canceledOrders() {
        return this.orders.filter(order => order.status === 'CANCELED');
    }

    get hasSelectedOrder() {
        return this.selectedOrder !== null;
    }

    get isConnected() {
        return this.connectionStatus === 'connected';
    }

    // Add these methods to your OrderStore.ts class

    // Analytics and reporting methods
    getLast30DaysOrders(): Order[] {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return this.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= thirtyDaysAgo;
        });
    }

    getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
        return this.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= startDate && orderDate <= endDate;
        });
    }

    calculateSalesMetrics(orders: Order[] = this.orders) {
        let totalSales = 0;
        let currency = '€';

        orders.forEach(order => {
            // Extract numeric value from formatted price
            const priceMatch = order.total.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
                const numericValue = parseFloat(priceMatch[0].replace(',', ''));
                if (!isNaN(numericValue)) {
                    totalSales += numericValue;
                }
            }

            // Extract currency symbol
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

    // Getter for 30-day analytics
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

    // Missing oldestUnfulfilledOrder getter
    get oldestUnfulfilledOrder() {
        const unfulfilledOrders = this.orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        );

        if (unfulfilledOrders.length === 0) return null;

        // Sort by creation date (oldest first)
        return unfulfilledOrders.sort((a, b) =>
            new Date(a._createdDate).getTime() - new Date(b._createdDate).getTime()
        )[0];
    }

    // 🔥 ADDED: Missing unfulfilledOrdersCount getter
    get unfulfilledOrdersCount() {
        return this.orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        ).length;
    }

    // Search and filter
    getOrderById(orderId: string): Order | undefined {
        return this.orders.find(order => order._id === orderId);
    }

    getOrderByNumber(orderNumber: string): Order | undefined {
        return this.orders.find(order => order.number === orderNumber);
    }

    searchOrders(searchTerm: string): Order[] {
        if (!searchTerm.trim()) {
            return this.orders;
        }

        const term = searchTerm.toLowerCase();
        return this.orders.filter(order =>
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
        return this.orders.filter(order => order.status === status);
    }

    // Statistics
    getOrderStats() {
        return {
            total: this.orders.length,
            fulfilled: this.fulfilledOrders.length,
            pending: this.pendingOrders.length,
            partiallyFulfilled: this.partiallyFulfilledOrders.length,
            canceled: this.canceledOrders.length,
            totalValue: this.orders.reduce((sum, order) => {
                const value = parseFloat(order.total.replace(/[^0-9.-]+/g, ''));
                return sum + (isNaN(value) ? 0 : value);
            }, 0)
        };
    }

    // Bulk operations
    selectMultipleOrders(orderIds: string[]) {
        // For future bulk operations
        console.log('Bulk selection not implemented yet:', orderIds);
    }

    bulkUpdateStatus(orderIds: string[], status: OrderStatus) {
        orderIds.forEach(orderId => {
            this.updateOrderStatus(orderId, status);
        });
    }

    // Debug
    logCurrentState() {
        console.log('📊 OrderStore State:', {
            ordersCount: this.ordersCount,
            selectedOrder: this.selectedOrder?.number || 'none',
            connectionStatus: this.connectionStatus,
            searchQuery: this.searchQuery,
            filteredCount: this.filteredOrders.length,
            pagination: this.pagination,
            stats: this.getOrderStats()
        });
    }
}