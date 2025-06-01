// services/OrderService.ts
import type { OrdersResponse, FulfillOrderParams, FulfillmentResponse, Order, OrderStatus, PaymentStatus } from '../types/Order';

export class OrderService {
    async fetchOrders({ limit = 50, cursor = '' }): Promise<OrdersResponse> {
        try {
            const backendModule = await import('../../backend/orders-api.web');
            const result = await backendModule.testOrdersConnection({ limit, cursor });

            // Transform the backend response to match our frontend types
            const transformedResult: OrdersResponse = {
                success: result.success,
                method: result.method,
                orders: result.orders ? result.orders.map(this.transformOrderFromBackend) : [],
                orderCount: result.orderCount || 0,
                pagination: result.pagination ? {
                    hasNext: result.pagination.hasNext || false,
                    nextCursor: result.pagination.nextCursor || '',
                    prevCursor: result.pagination.prevCursor || ''
                } : {
                    hasNext: false,
                    nextCursor: '',
                    prevCursor: ''
                },
                message: result.message || 'Success',
                error: result.error,
                ecomError: result.ecomError
            };

            return transformedResult;
        } catch (error) {
            // Return properly typed error response
            return {
                success: false,
                message: `Failed to fetch orders: ${error}`,
                error: error instanceof Error ? error.message : String(error),
                orders: [],
                orderCount: 0,
                pagination: {
                    hasNext: false,
                    nextCursor: '',
                    prevCursor: ''
                }
            };
        }
    }

    async fulfillOrder(params: FulfillOrderParams): Promise<FulfillmentResponse> {
        try {
            const backendModule = await import('../../backend/orders-api.web');

            if (typeof backendModule.fulfillOrderInWix !== 'function') {
                throw new Error('fulfillOrderInWix API is not available');
            }

            return await backendModule.fulfillOrderInWix(params);
        } catch (error) {
            return {
                success: false,
                message: `Failed to fulfill order: ${error}`,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // services/OrderService.ts - Enhanced status debugging
    private transformOrderFromBackend = (backendOrder: any): Order => {
        // 🔍 DEBUG: Log all status-related fields from raw order
        console.log('🐛 Status Debug - Raw order status fields:', {
            orderId: backendOrder._id,
            orderNumber: backendOrder.number,
            // Check ALL possible status fields
            status: backendOrder.status,
            fulfillmentStatus: backendOrder.fulfillmentStatus,
            paymentStatus: backendOrder.paymentStatus,
            // Raw order might have different fields
            rawOrderStatus: backendOrder.rawOrder?.status,
            rawOrderFulfillmentStatus: backendOrder.rawOrder?.fulfillmentStatus,
            // Check the actual Wix order status
            wixStatus: backendOrder.rawOrder?.status,
            wixFulfillmentStatus: backendOrder.rawOrder?.fulfillmentStatus,
        });

        // Use rawOrder status as primary source (most reliable)
        const primaryStatus = backendOrder.rawOrder?.status || backendOrder.status;
        const normalizedStatus = this.normalizeOrderStatus(primaryStatus);

        console.log('🐛 Status Debug - Normalization:', {
            orderId: backendOrder._id,
            primaryStatus,
            normalizedStatus,
            shouldBeCanceled: primaryStatus === 'CANCELED' || primaryStatus === 'CANCELLED'
        });

        return {
            _id: backendOrder._id,
            number: backendOrder.number,
            _createdDate: backendOrder._createdDate,
            customer: {
                firstName: backendOrder.customer.firstName,
                lastName: backendOrder.customer.lastName,
                email: backendOrder.customer.email,
                phone: backendOrder.customer.phone,
                company: backendOrder.customer.company
            },
            items: backendOrder.items || [],
            totalWeight: backendOrder.totalWeight || 0,
            total: backendOrder.total,
            status: normalizedStatus, // Use the carefully normalized status
            paymentStatus: this.normalizePaymentStatus(backendOrder.paymentStatus),
            shippingInfo: backendOrder.shippingInfo || {
                carrierId: '',
                title: '',
                cost: '$0.00'
            },
            weightUnit: backendOrder.weightUnit || 'KG',
            shippingAddress: backendOrder.shippingAddress || null,
            billingInfo: backendOrder.billingInfo,
            recipientInfo: backendOrder.recipientInfo,
            rawOrder: backendOrder.rawOrder || backendOrder
        };
    }

    /**
     * Enhanced status normalization with better debugging
     */
    private normalizeOrderStatus = (status: any): OrderStatus => {
        const statusString = String(status).toUpperCase();

        console.log('🐛 Status Normalization:', {
            input: status,
            stringified: statusString,
            type: typeof status
        });

        switch (statusString) {
            case 'NOT_FULFILLED':
            case 'UNFULFILLED':
                console.log('🐛 → Normalized to NOT_FULFILLED');
                return 'NOT_FULFILLED';
            case 'PARTIALLY_FULFILLED':
            case 'PARTIAL':
                console.log('🐛 → Normalized to PARTIALLY_FULFILLED');
                return 'PARTIALLY_FULFILLED';
            case 'FULFILLED':
            case 'COMPLETE':
            case 'COMPLETED':
                console.log('🐛 → Normalized to FULFILLED');
                return 'FULFILLED';
            case 'CANCELED':
            case 'CANCELLED':
                console.log('🐛 → Normalized to CANCELED');
                return 'CANCELED';
            default:
                console.warn('🐛 → Unknown status, defaulting to UNKNOWN:', statusString);
                return 'UNKNOWN';
        }
    }

    /**
     * Ensure payment status matches PaymentStatus type
     */
    private normalizePaymentStatus = (paymentStatus: any): PaymentStatus => {
        const statusString = String(paymentStatus).toUpperCase();

        switch (statusString) {
            case 'PAID':
                return 'PAID';
            case 'PARTIALLY_PAID':
            case 'PARTIAL':
                return 'PARTIALLY_PAID';
            case 'UNPAID':
            case 'PENDING':
                return 'UNPAID';
            case 'FULLY_REFUNDED':
            case 'REFUNDED':
                return 'FULLY_REFUNDED';
            case 'PARTIALLY_REFUNDED':
            case 'PARTIAL_REFUND':
                return 'PARTIALLY_REFUNDED';
            default:
                return 'UNKNOWN';
        }
    }
}