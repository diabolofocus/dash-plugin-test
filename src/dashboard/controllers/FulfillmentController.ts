// controllers/FulfillmentController.ts
import { dashboard } from '@wix/dashboard';
import type { OrderStore } from '../stores/OrderStore';
import type { UIStore } from '../stores/UIStore';
import type { OrderService } from '../services/OrderService';
import type { Order, FulfillOrderParams } from '../types/Order';

export class FulfillmentController {
    constructor(
        private orderStore: OrderStore,
        private uiStore: UIStore,
        private orderService: OrderService
    ) { }

    /**
     * Fulfill an order with tracking information
     */
    async fulfillOrder() {
        const { selectedOrder } = this.orderStore;
        const { trackingNumber, selectedCarrier } = this.uiStore;

        if (!this.validateFulfillmentData(selectedOrder, trackingNumber, selectedCarrier)) {
            return;
        }

        this.uiStore.setSubmitting(true);

        try {
            const fulfillmentParams: FulfillOrderParams = {
                orderId: selectedOrder!._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder!.number
            };

            const result = await this.orderService.fulfillOrder(fulfillmentParams);

            if (!result.success) {
                throw new Error(result.message || 'Failed to fulfill order in Wix');
            }

            // Update order status in store
            this.orderStore.updateOrderStatus(selectedOrder!._id, 'FULFILLED');

            // Show success message
            const message = this.getFulfillmentSuccessMessage(selectedOrder!, trackingNumber);
            this.showToast(message, 'success');

            // Clear form
            this.clearForm();

        } catch (error) {
            this.handleFulfillmentError(error);
        } finally {
            this.uiStore.setSubmitting(false);
        }
    }

    /**
     * Update tracking information for an already fulfilled order
     */
    async updateTracking() {
        const { selectedOrder } = this.orderStore;
        const { trackingNumber, selectedCarrier } = this.uiStore;

        if (!this.validateFulfillmentData(selectedOrder, trackingNumber, selectedCarrier)) {
            return;
        }

        this.uiStore.setSubmitting(true);

        try {
            const result = await this.orderService.fulfillOrder({
                orderId: selectedOrder!._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder!.number
            });

            if (result.success) {
                this.showToast(
                    `Tracking updated for order #${selectedOrder!.number}: ${trackingNumber}`,
                    'success'
                );
                this.clearForm();
            } else {
                throw new Error(result.message || 'Failed to update tracking');
            }

        } catch (error) {
            this.handleFulfillmentError(error);
        } finally {
            this.uiStore.setSubmitting(false);
        }
    }

    /**
     * Set tracking information in the form
     */
    setTrackingInfo(trackingNumber: string, carrier: string) {
        this.uiStore.setTrackingNumber(trackingNumber);
        this.uiStore.setSelectedCarrier(carrier);
    }

    /**
     * Clear the fulfillment form
     */
    clearForm() {
        this.uiStore.resetForm();
        this.orderStore.selectOrder(null);
    }

    /**
     * Check if order can be fulfilled
     */
    canFulfillOrder(order: Order): boolean {
        return order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED';
    }

    /**
     * Check if order tracking can be updated
     */
    canUpdateTracking(order: Order): boolean {
        return order.status === 'FULFILLED';
    }

    // Private helper methods
    private validateFulfillmentData(
        order: Order | null,
        trackingNumber: string,
        carrier: string
    ): boolean {
        if (!order) {
            this.showToast('No order selected', 'error');
            return false;
        }

        if (!trackingNumber?.trim()) {
            this.showToast('Please enter a tracking number', 'error');
            return false;
        }

        if (!carrier) {
            this.showToast('Please select a shipping carrier', 'error');
            return false;
        }

        return true;
    }

    private getFulfillmentSuccessMessage(order: Order, trackingNumber: string): string {
        return order.status === 'FULFILLED'
            ? `Order #${order.number} tracking updated: ${trackingNumber} | Email not sent to customer`
            : `Order #${order.number} fulfilled with tracking: ${trackingNumber} | Email not sent to customer`;
    }

    private handleFulfillmentError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.showToast(`Failed to process fulfillment: ${errorMessage}`, 'error');
    }

    private showToast(message: string, type: 'success' | 'error' | 'warning') {
        dashboard.showToast({ message, type });
    }
}