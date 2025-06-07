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

    // Replace your loadOrders method in OrderController.ts
    async loadOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        console.log(`🚀 [${isDev ? 'DEV' : 'PROD'}] Starting chunked order loading (200 initial)...`);

        try {
            this.uiStore.setLoading(true);
            this.orderStore.setConnectionStatus('connecting');
            this.orderStore.setLoadingStatus('Loading orders...');

            // Load initial 200 orders with progress updates
            const result = await this.orderService.fetchOrdersChunked(200, (orders, totalLoaded, hasMore) => {
                // Update orders immediately with each batch
                this.orderStore.setOrders(orders);
                this.orderStore.setLoadingStatus(`Loading orders... (${totalLoaded})`);

                // Set connected after first batch so UI is responsive
                if (totalLoaded >= 100) {
                    this.orderStore.setConnectionStatus('connected');
                    this.uiStore.setLoading(false);
                }
            });

            console.log(`📊 [${isDev ? 'DEV' : 'PROD'}] Initial chunk complete: ${result.totalCount} orders, hasMore: ${result.hasMore}`);

            if (result.success) {
                this.orderStore.setOrders(result.orders);
                this.orderStore.setHasMoreOrders(result.hasMore);
                this.orderStore.setNextCursor(result.nextCursor || '');
                this.orderStore.setConnectionStatus('connected');
                this.orderStore.setLoadingStatus('');

                console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] Loaded initial ${result.totalCount} orders, can load more: ${result.hasMore}`);
            } else {
                this.handleLoadError(new Error(result.error || 'Failed to load orders'));
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Error in chunked loading:`, error);
            this.orderStore.setLoadingStatus('');
            this.handleLoadError(error);
        } finally {
            this.uiStore.setLoading(false);
        }
    }

    // Add this method to OrderController.ts
    async loadMoreOrders() {
        if (!this.orderStore.hasMoreOrders || this.orderStore.isLoadingMore) {
            return;
        }

        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        console.log(`📦 [${isDev ? 'DEV' : 'PROD'}] Loading more orders...`);

        try {
            this.orderStore.setIsLoadingMore(true);
            this.orderStore.setLoadingStatus('Loading more orders...');

            const result = await this.orderService.fetchMoreOrders(this.orderStore.nextCursor, 200);

            if (result.success) {
                this.orderStore.appendOrders(result.orders);
                this.orderStore.setHasMoreOrders(result.hasMore);
                this.orderStore.setNextCursor(result.nextCursor || '');

                console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] Loaded ${result.orders.length} more orders, total: ${this.orderStore.orders.length}`);
            } else {
                console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Failed to load more orders:`, result.error);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Error loading more orders:`, error);
        } finally {
            this.orderStore.setIsLoadingMore(false);
            this.orderStore.setLoadingStatus('');
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

                // Use actual pagination data instead of hardcoding
                this.orderStore.setPagination({
                    hasNext: result.pagination?.hasNext || false,
                    nextCursor: result.pagination?.nextCursor || '',
                    prevCursor: result.pagination?.prevCursor || ''
                });

                this.orderStore.setConnectionStatus('connected');

                this.showToast(`Orders refreshed successfully! Found ${result.orders.length} orders.`, 'success');

            } else {
                this.handleNoOrdersFound(result.message);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh error:`, error);
            this.handleRefreshError(error);
        } finally {
            this.uiStore.setRefreshing(false);
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
            this.uiStore.resetForm();
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

    private handleNoOrdersFound(message?: string) {
        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('disconnected');
    }

    private handleLoadError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');
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