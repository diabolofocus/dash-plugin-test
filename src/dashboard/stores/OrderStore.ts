// stores/OrderStore.ts
import { makeAutoObservable } from 'mobx';
import type { Order, Pagination, ConnectionStatus } from '../types/Order';

export class OrderStore {
    orders: Order[] = [];
    selectedOrder: Order | null = null;
    searchQuery = '';
    connectionStatus: ConnectionStatus | null = null;
    pagination: Pagination = {
        hasNext: false,
        nextCursor: '',
        prevCursor: '',
        ordersPerPage: 50
    };

    constructor() {
        makeAutoObservable(this);
    }

    // Actions
    setOrders = (orders: Order[]) => {
        this.orders = orders;
    };

    addOrders = (newOrders: Order[]) => {
        this.orders = [...this.orders, ...newOrders];
    };

    selectOrder = (order: Order | null) => {
        this.selectedOrder = order;
    };

    updateOrderStatus = (orderId: string, status: string) => {
        const orderIndex = this.orders.findIndex(order => order._id === orderId);
        if (orderIndex !== -1) {
            this.orders[orderIndex] = {
                ...this.orders[orderIndex],
                status: status as any
            };
        }
    };

    // Updated to handle backend pagination response
    setPagination = (pagination: Partial<{
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
        ordersPerPage?: number;
    }>) => {
        this.pagination = {
            ...this.pagination,
            ...pagination,
            ordersPerPage: pagination.ordersPerPage || this.pagination.ordersPerPage // Keep existing ordersPerPage if not provided
        };
    };

    setSearchQuery = (query: string) => {
        this.searchQuery = query;
    };

    setConnectionStatus = (status: ConnectionStatus | null) => {
        this.connectionStatus = status;
    };

    clearOrders = () => {
        this.orders = [];
        this.selectedOrder = null;
        this.connectionStatus = null;
        this.pagination = {
            hasNext: false,
            nextCursor: '',
            prevCursor: '',
            ordersPerPage: 50
        };
    };

    // Computed values
    get filteredOrders(): Order[] {
        if (!this.searchQuery) return this.orders;

        const query = this.searchQuery.toLowerCase();
        return this.orders.filter(order =>
            order.number.toLowerCase().includes(query) ||
            `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase().includes(query) ||
            order.customer.email.toLowerCase().includes(query) ||
            (order.customer.company && order.customer.company.toLowerCase().includes(query))
        );
    }

    get unfulfilledOrdersCount(): number {
        return this.orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        ).length;
    }

    get oldestUnfulfilledOrder(): Order | null {
        const unfulfilled = this.orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        );

        if (unfulfilled.length === 0) return null;

        return unfulfilled.sort((a, b) =>
            new Date(a._createdDate).getTime() - new Date(b._createdDate).getTime()
        )[0];
    }

    hasMorePages = (): boolean => {
        return this.pagination.hasNext && !!this.pagination.nextCursor;
    };
}