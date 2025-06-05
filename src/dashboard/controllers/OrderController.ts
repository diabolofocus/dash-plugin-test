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

    async loadOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        console.log(`🚀 [${isDev ? 'DEV' : 'PROD'}] OrderController: Starting loadOrders`);

        try {
            this.uiStore.setLoading(true);
            this.orderStore.setConnectionStatus('connecting');

            console.log(`📞 [${isDev ? 'DEV' : 'PROD'}] OrderController: Calling orderService.fetchOrders`);

            const result = await this.orderService.fetchOrders({
                limit: 50,
                cursor: undefined
            });

            console.log(`📊 [${isDev ? 'DEV' : 'PROD'}] OrderController: Response received:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                message: result.message?.substring(0, 100) + '...'
            });

            if (result.success && result.orders && result.orders.length > 0) {
                console.log(`📥 [${isDev ? 'DEV' : 'PROD'}] OrderController: Setting ${result.orders.length} orders`);
                this.orderStore.setOrders(result.orders);

                // Auto-select oldest unfulfilled order
                const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
                if (oldestUnfulfilled) {
                    this.selectOrder(oldestUnfulfilled);
                    console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] OrderController: Auto-selected order ${oldestUnfulfilled.number}`);
                }

                this.orderStore.setConnectionStatus('connected');

                console.log(`🏁 [${isDev ? 'DEV' : 'PROD'}] OrderController: Successfully loaded ${result.orders.length} orders`);

            } else {
                console.warn(`⚠️ [${isDev ? 'DEV' : 'PROD'}] OrderController: No orders found, using demo data`);
                this.handleNoOrdersFound(result.message);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] OrderController: Error loading orders:`, error);
            this.handleLoadError(error);
        } finally {
            this.uiStore.setLoading(false);
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