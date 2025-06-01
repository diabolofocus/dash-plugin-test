// controllers/OrderController.ts - Using queryOrders with offset pagination and 50 limit
import { dashboard } from '@wix/dashboard';
import type { OrderStore } from '../stores/OrderStore';
import type { UIStore } from '../stores/UIStore';
import type { OrderService } from '../services/OrderService';
import type { Order, FulfillOrderParams } from '../types/Order';
import { DEMO_ORDERS } from '../utils/constants';

export class OrderController {
    constructor(
        private orderStore: OrderStore,
        private uiStore: UIStore,
        private orderService: OrderService
    ) { }

    async loadOrders(offset = 0) {
        const isInitialLoad = offset === 0;
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        console.log(`🚀 [${isDev ? 'DEV' : 'PROD'}] OrderController: Starting loadOrders`, {
            isInitialLoad,
            offset: offset,
            requestedLimit: 50 // Updated to 50
        });

        try {
            if (isInitialLoad) {
                this.uiStore.setLoading(true);
                this.orderStore.setConnectionStatus(null);
            } else {
                this.uiStore.setLoadingMore(true);
            }

            console.log(`📞 [${isDev ? 'DEV' : 'PROD'}] OrderController: Calling orderService.fetchOrders`);

            const result = await this.orderService.fetchOrders({
                limit: 50, // Changed to 50
                cursor: offset === 0 ? undefined : String(offset)
            });

            console.log(`📊 [${isDev ? 'DEV' : 'PROD'}] OrderController: Response received:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                hasNext: result.pagination?.hasNext,
                nextOffset: result.pagination?.nextCursor || 'none',
                message: result.message?.substring(0, 100) + '...'
            });

            // 🔍 CRITICAL DEBUG: Log pagination details
            if (result.pagination) {
                console.log(`🎯 [${isDev ? 'DEV' : 'PROD'}] OrderController: PAGINATION ANALYSIS:`, {
                    hasNext: result.pagination.hasNext,
                    nextOffset: result.pagination.nextCursor,
                    nextOffsetExists: !!result.pagination.nextCursor,
                    currentOffset: offset,
                    willShowLoadMore: true, // Always true now
                    paginationObject: result.pagination
                });
            }

            if (result.success && result.orders && result.orders.length > 0) {
                if (isInitialLoad) {
                    console.log(`📥 [${isDev ? 'DEV' : 'PROD'}] OrderController: Setting ${result.orders.length} orders (initial load)`);
                    this.orderStore.setOrders(result.orders);

                    const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
                    if (oldestUnfulfilled) {
                        this.selectOrder(oldestUnfulfilled);
                        console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] OrderController: Auto-selected order ${oldestUnfulfilled.number}`);
                    }
                } else {
                    console.log(`📥 [${isDev ? 'DEV' : 'PROD'}] OrderController: Adding ${result.orders.length} more orders (load more)`);
                    this.orderStore.addOrders(result.orders);
                }

                // 🔍 CRITICAL DEBUG: Pagination setting - ALWAYS SHOW LOAD MORE
                const paginationToSet = {
                    hasNext: true, // Always true to show load more button
                    nextCursor: result.pagination?.nextCursor || String(offset + 50), // Use offset-based pagination
                    prevCursor: result.pagination?.prevCursor || String(Math.max(0, offset - 50))
                };

                console.log(`⚙️ [${isDev ? 'DEV' : 'PROD'}] OrderController: Setting pagination (ALWAYS SHOW LOAD MORE):`, paginationToSet);
                this.orderStore.setPagination(paginationToSet);

                this.orderStore.setConnectionStatus({
                    success: true,
                    message: `${this.orderStore.unfulfilledOrdersCount} pending fulfillment out of ${result.orders.length} orders.`
                });

                // 🔍 FINAL STATE CHECK
                console.log(`🏁 [${isDev ? 'DEV' : 'PROD'}] OrderController: FINAL STATE:`, {
                    totalOrdersInStore: this.orderStore.orders.length,
                    storeHasMorePages: true, // Always true now
                    storePaginationHasNext: true, // Always true now
                    storePaginationNextOffset: this.orderStore.pagination.nextCursor || 'empty',
                    loadMoreButtonShouldShow: true // Always true now
                });

            } else if (isInitialLoad) {
                console.warn(`⚠️ [${isDev ? 'DEV' : 'PROD'}] OrderController: No orders found, using demo data`);
                this.handleNoOrdersFound(result.message);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] OrderController: Error loading orders:`, error);
            this.handleLoadError(error, isInitialLoad);
        } finally {
            if (isInitialLoad) {
                this.uiStore.setLoading(false);
            } else {
                this.uiStore.setLoadingMore(false);
            }
        }
    }

    async refreshOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        console.log(`🔄 [${isDev ? 'DEV' : 'PROD'}] OrderController: Starting refresh`);

        this.uiStore.setRefreshing(true);
        this.clearSelection();

        try {
            const result = await this.orderService.fetchOrders({
                limit: 50, // Changed to 50
                cursor: undefined
            });

            console.log(`🔄 [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh response:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                hasNext: result.pagination?.hasNext
            });

            if (result.success && result.orders && result.orders.length > 0) {
                this.orderStore.setOrders(result.orders);

                this.orderStore.setPagination({
                    hasNext: true, // Always true to show load more
                    nextCursor: result.pagination?.nextCursor || '50', // Start from offset 50
                    prevCursor: result.pagination?.prevCursor || '0',
                    ordersPerPage: 50 // Updated to 50
                });

                const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
                if (oldestUnfulfilled) {
                    this.selectOrder(oldestUnfulfilled);
                }

                this.orderStore.setConnectionStatus({
                    success: true,
                    message: `${this.orderStore.unfulfilledOrdersCount} pending fulfillment out of ${result.orders.length} orders.`
                });

                this.showToast(`Orders refreshed successfully! Found ${result.orders.length} orders.`, 'success');

            } else {
                this.handleNoOrdersFound(result.message, true);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh error:`, error);
            this.handleRefreshError(error);
        } finally {
            this.uiStore.setRefreshing(false);
        }
    }

    async loadMoreOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        const nextOffset = parseInt(this.orderStore.pagination.nextCursor || '0');

        console.log(`➕ [${isDev ? 'DEV' : 'PROD'}] OrderController: loadMoreOrders called`, {
            hasMorePages: this.orderStore.hasMorePages(),
            nextOffset: nextOffset,
            currentOrderCount: this.orderStore.orders.length
        });

        // Check if we should attempt to load more
        if (this.orderStore.hasMorePages()) {
            await this.loadOrders(nextOffset);
        } else {
            console.log(`📭 [${isDev ? 'DEV' : 'PROD'}] OrderController: Load more called but no more pages flagged`);
            this.showToast('All orders have been loaded', 'success');
        }
    }

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

    clearSelection() {
        this.orderStore.selectOrder(null);
        this.uiStore.resetForm();
    }

    async fulfillOrder() {
        const { selectedOrder } = this.orderStore;
        const { trackingNumber, selectedCarrier } = this.uiStore;

        if (!trackingNumber || !selectedCarrier || !selectedOrder) {
            this.showToast('Please enter tracking number and select carrier', 'error');
            return;
        }

        this.uiStore.setSubmitting(true);

        try {
            const fulfillmentParams: FulfillOrderParams = {
                orderId: selectedOrder._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder.number
            };

            const result = await this.orderService.fulfillOrder(fulfillmentParams);

            if (!result.success) {
                throw new Error(result.message || 'Failed to fulfill order in Wix');
            }

            this.orderStore.updateOrderStatus(selectedOrder._id, 'FULFILLED');

            const message = selectedOrder.status === 'FULFILLED'
                ? `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`
                : `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`;

            this.showToast(message, 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showToast(`Failed to fulfill order: ${errorMessage}`, 'error');
        } finally {
            this.clearSelection();
            this.uiStore.setSubmitting(false);
        }
    }

    updateSearchQuery(query: string) {
        this.orderStore.setSearchQuery(query);
    }

    async copyToClipboard(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast(`${label} copied to clipboard`, 'success');
        } catch (error) {
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    // Private helper methods
    private handleNoOrdersFound(message?: string, isRefresh = false) {
        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus({
            success: false,
            message: message || 'No orders found. Showing demo data.'
        });

        if (isRefresh) {
            this.showToast('No orders found during refresh. Showing demo data.', 'warning');
        }
    }

    private handleLoadError(error: unknown, isInitialLoad: boolean) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isInitialLoad) {
            this.orderStore.setOrders(DEMO_ORDERS as any);
            this.orderStore.setConnectionStatus({
                success: false,
                message: `Failed to load orders: ${errorMessage}. Showing demo data.`
            });
        } else {
            this.showToast(`Failed to load more orders: ${errorMessage}`, 'error');
        }
    }

    private handleRefreshError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus({
            success: false,
            message: `Failed to refresh orders: ${errorMessage}. Showing demo data.`
        });

        this.showToast(`Failed to refresh orders: ${errorMessage}`, 'error');
    }

    private showToast(message: string, type: 'success' | 'error' | 'warning') {
        dashboard.showToast({ message, type });
    }
}