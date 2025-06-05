// controllers/OrderController.ts - FIXED pagination logic
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
            requestedLimit: 50
        });

        try {
            if (isInitialLoad) {
                this.uiStore.setLoading(true);
                this.orderStore.setConnectionStatus('connecting');
            } else {
                this.uiStore.setLoadingMore(true);
            }

            console.log(`📞 [${isDev ? 'DEV' : 'PROD'}] OrderController: Calling orderService.fetchOrders`);

            const result = await this.orderService.fetchOrders({
                limit: 50,
                cursor: offset === 0 ? undefined : String(offset)
            });

            console.log(`📊 [${isDev ? 'DEV' : 'PROD'}] OrderController: Response received:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                hasNext: result.pagination?.hasNext,
                nextOffset: result.pagination?.nextCursor || 'none',
                message: result.message?.substring(0, 100) + '...'
            });

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

                // 🔥 FIXED: Use actual pagination data from backend instead of hardcoding
                const paginationToSet = {
                    hasNext: result.pagination?.hasNext || false, // Use actual hasNext from backend
                    nextCursor: result.pagination?.nextCursor || '',
                    prevCursor: result.pagination?.prevCursor || ''
                };

                console.log(`⚙️ [${isDev ? 'DEV' : 'PROD'}] OrderController: Setting pagination from backend response:`, {
                    backendHasNext: result.pagination?.hasNext,
                    backendNextCursor: result.pagination?.nextCursor,
                    finalPagination: paginationToSet
                });

                this.orderStore.setPagination(paginationToSet);
                this.orderStore.setConnectionStatus('connected');

                // 🔍 FINAL STATE CHECK
                console.log(`🏁 [${isDev ? 'DEV' : 'PROD'}] OrderController: FINAL STATE:`, {
                    totalOrdersInStore: this.orderStore.orders.length,
                    storeHasMorePages: this.orderStore.hasMorePages(),
                    storePaginationHasNext: this.orderStore.pagination.hasNext,
                    storePaginationNextCursor: this.orderStore.pagination.nextCursor,
                    loadMoreButtonShouldShow: this.orderStore.hasMorePages()
                });

            } else if (isInitialLoad) {
                console.warn(`⚠️ [${isDev ? 'DEV' : 'PROD'}] OrderController: No orders found, using demo data`);
                this.handleNoOrdersFound(result.message);
            } else {
                // 🔥 NEW: Handle case where load more returns no results
                console.log(`📭 [${isDev ? 'DEV' : 'PROD'}] OrderController: Load more returned no results - end of data reached`);

                // Set hasNext to false since we've reached the end
                this.orderStore.setPagination({
                    hasNext: false,
                    nextCursor: '',
                    prevCursor: this.orderStore.pagination.prevCursor
                });

                this.showToast('All orders have been loaded', 'success');
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
                limit: 50,
                cursor: undefined
            });

            console.log(`🔄 [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh response:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                hasNext: result.pagination?.hasNext
            });

            if (result.success && result.orders && result.orders.length > 0) {
                this.orderStore.setOrders(result.orders);

                // 🔥 FIXED: Use actual pagination data instead of hardcoding
                this.orderStore.setPagination({
                    hasNext: result.pagination?.hasNext || false,
                    nextCursor: result.pagination?.nextCursor || '',
                    prevCursor: result.pagination?.prevCursor || ''
                });

                const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
                if (oldestUnfulfilled) {
                    this.selectOrder(oldestUnfulfilled);
                }

                this.orderStore.setConnectionStatus('connected');

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
            currentOrderCount: this.orderStore.orders.length,
            paginationState: this.orderStore.pagination
        });

        // 🔥 IMPROVED: Better checking logic
        if (!this.orderStore.hasMorePages()) {
            console.log(`📭 [${isDev ? 'DEV' : 'PROD'}] OrderController: No more pages available`);
            this.showToast('All orders have been loaded', 'success');
            return;
        }

        if (!this.orderStore.pagination.nextCursor) {
            console.log(`📭 [${isDev ? 'DEV' : 'PROD'}] OrderController: No next cursor available`);
            this.showToast('All orders have been loaded', 'success');
            return;
        }

        await this.loadOrders(nextOffset);
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

            // 🔥 UPDATED: Include email info in success message
            let message = selectedOrder.status === 'FULFILLED'
                ? `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`
                : `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`;

            // Add email status to message if available
            if (result.emailInfo) {
                if (result.emailInfo.emailSentAutomatically) {
                    message += ' • Confirmation email sent to customer';
                } else {
                    message += ' • No email sent';
                }
            }

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
        this.orderStore.setConnectionStatus('disconnected');

        // 🔥 FIXED: Set proper pagination for demo data
        this.orderStore.setPagination({
            hasNext: false,
            nextCursor: '',
            prevCursor: ''
        });

        if (isRefresh) {
            this.showToast('No orders found during refresh. Showing demo data.', 'warning');
        }
    }

    private handleLoadError(error: unknown, isInitialLoad: boolean) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (isInitialLoad) {
            this.orderStore.setOrders(DEMO_ORDERS as any);
            this.orderStore.setConnectionStatus('error');

            // 🔥 FIXED: Set proper pagination for demo data
            this.orderStore.setPagination({
                hasNext: false,
                nextCursor: '',
                prevCursor: ''
            });
        } else {
            this.showToast(`Failed to load more orders: ${errorMessage}`, 'error');
        }
    }

    private handleRefreshError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');

        // 🔥 FIXED: Set proper pagination for demo data
        this.orderStore.setPagination({
            hasNext: false,
            nextCursor: '',
            prevCursor: ''
        });

        this.showToast(`Failed to refresh orders: ${errorMessage}`, 'error');
    }

    private showToast(message: string, type: 'success' | 'error' | 'warning') {
        dashboard.showToast({ message, type });
    }
}