// stores/OrderStore.ts - FIXED with proper imports and missing properties
import { makeAutoObservable } from 'mobx';
import type { Order, OrderStatus, ConnectionStatus } from '../types/Order'; // 🔥 FIXED: Import ConnectionStatus

export class OrderStore {
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

    addOrders(orders: Order[]) {
        // Avoid duplicates when adding more orders
        const existingIds = new Set(this.orders.map(o => o._id));
        const newOrders = orders.filter(o => !existingIds.has(o._id));
        this.orders = [...this.orders, ...newOrders];
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

    // 🔥 ADDED: Missing hasMorePages method
    hasMorePages() {
        return this.pagination.hasNext && this.pagination.nextCursor;
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

    get canLoadMore() {
        return this.pagination.hasNext && this.pagination.nextCursor;
    }

    get isConnected() {
        return this.connectionStatus === 'connected';
    }

    // 🔥 ADDED: Missing oldestUnfulfilledOrder getter
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

    getOrdersByDateRange(startDate: Date, endDate: Date): Order[] {
        return this.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= startDate && orderDate <= endDate;
        });
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