// services/OrderService.ts - Fixed import path for production
import type { OrdersResponse, FulfillOrderParams, FulfillmentResponse, Order, OrderStatus, PaymentStatus } from '../types/Order';

export class OrderService {
    async fetchOrders({ limit = 50, cursor = '' }): Promise<OrdersResponse> {
        const maxRetries = 3;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🚀 Frontend: Fetch orders attempt ${attempt}/${maxRetries}`);

                // 🔥 FIX: Correct path from dashboard/services/ to backend/
                const backendModule = await import('../../backend/orders-api.web');

                console.log('✅ Backend module imported successfully');

                const result = await backendModule.testOrdersConnection({ limit, cursor });

                console.log(`✅ Frontend: Orders fetch attempt ${attempt} successful:`, {
                    success: result.success,
                    orderCount: result.orders?.length || 0
                });

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

            } catch (currentError: any) {
                lastError = currentError;
                const errorMsg = currentError instanceof Error ? currentError.message : String(currentError);

                console.error(`❌ Frontend: Fetch orders attempt ${attempt}/${maxRetries} failed:`, errorMsg);

                if (attempt < maxRetries) {
                    // Exponential backoff
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Frontend: Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // All retries failed - return error response
        const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError);

        return {
            success: false,
            message: `Failed to fetch orders after ${maxRetries} attempts: ${finalErrorMsg}`,
            error: finalErrorMsg,
            orders: [],
            orderCount: 0,
            pagination: {
                hasNext: false,
                nextCursor: '',
                prevCursor: ''
            }
        };
    }

    async fetchSingleOrder(orderId: string): Promise<{ success: boolean; order?: Order; error?: string }> {
        try {
            console.log(`🚀 Frontend: Fetching single order ${orderId}`);

            // 🔥 FIX: Correct path from dashboard/services/ to backend/
            const backendModule = await import('../../backend/orders-api.web');

            if (typeof backendModule.getSingleOrder === 'function') {
                const result = await backendModule.getSingleOrder(orderId);

                if (result.success && result.order) {
                    return {
                        success: true,
                        order: this.transformOrderFromBackend(result.order)
                    };
                } else {
                    return {
                        success: false,
                        error: result.error || 'Order not found'
                    };
                }
            } else {
                // Fallback method
                console.warn('⚠️ Frontend: getSingleOrder not available, using fallback');
                const allOrdersResult = await this.fetchOrders({ limit: 200 });

                if (allOrdersResult.success) {
                    const foundOrder = allOrdersResult.orders.find(order => order._id === orderId);
                    if (foundOrder) {
                        return { success: true, order: foundOrder };
                    }
                }

                return { success: false, error: 'Order not found in fallback method' };
            }

        } catch (error: any) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async fulfillOrder(params: FulfillOrderParams): Promise<FulfillmentResponse> {
        try {
            // 🔥 FIX: Correct path from dashboard/services/ to backend/
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

    private transformOrderFromBackend = (backendOrder: any): Order => {
        // Enhanced status handling
        let finalStatus: OrderStatus;

        const orderStatus = backendOrder.rawOrder?.status || backendOrder.status;
        if (orderStatus === 'CANCELED' || orderStatus === 'CANCELLED') {
            finalStatus = 'CANCELED';
        } else {
            const fulfillmentStatus = backendOrder.rawOrder?.fulfillmentStatus ||
                backendOrder.fulfillmentStatus ||
                'NOT_FULFILLED';
            finalStatus = this.normalizeOrderStatus(fulfillmentStatus);
        }

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
            status: finalStatus,
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
            rawOrder: backendOrder.rawOrder || backendOrder,
            buyerNote: backendOrder.buyerNote || '',
        };
    }

    private normalizeOrderStatus = (status: any): OrderStatus => {
        if (!status) return 'NOT_FULFILLED';

        const statusString = String(status).toUpperCase().trim();

        switch (statusString) {
            case 'NOT_FULFILLED':
            case 'UNFULFILLED':
            case 'PENDING':
                return 'NOT_FULFILLED';
            case 'PARTIALLY_FULFILLED':
            case 'PARTIAL':
                return 'PARTIALLY_FULFILLED';
            case 'FULFILLED':
            case 'COMPLETE':
            case 'COMPLETED':
            case 'SHIPPED':
                return 'FULFILLED';
            case 'CANCELED':
            case 'CANCELLED':
                return 'CANCELED';
            default:
                console.warn('🚨 Unknown order status:', statusString, '- defaulting to NOT_FULFILLED');
                return 'NOT_FULFILLED';
        }
    }

    private normalizePaymentStatus = (paymentStatus: any): PaymentStatus => {
        if (!paymentStatus) return 'UNKNOWN';

        const statusString = String(paymentStatus).toUpperCase().trim();

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