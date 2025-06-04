// services/OrderService.ts - ENHANCED with production debugging

import type { OrdersResponse, FulfillOrderParams, FulfillmentResponse, Order, OrderStatus, PaymentStatus } from '../types/Order';

export class OrderService {
    async fetchOrders({ limit = 50, cursor = '' }): Promise<OrdersResponse> {
        const maxRetries = 3;
        let lastError: any;
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        console.log(`🌍 [${isProd ? 'PROD' : 'DEV'}] OrderService.fetchOrders starting:`, {
            limit,
            cursor,
            hostname: window.location.hostname,
            href: window.location.href
        });

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Frontend: Fetch orders attempt ${attempt}/${maxRetries}`);

                const backendModule = await import('../../backend/orders-api.web');
                console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Backend module imported successfully:`, {
                    hasTestOrdersConnection: typeof backendModule.testOrdersConnection === 'function',
                    hasFulfillOrderInWix: typeof backendModule.fulfillOrderInWix === 'function',
                    moduleKeys: Object.keys(backendModule)
                });

                const result = await backendModule.testOrdersConnection({ limit, cursor });

                console.log(`📊 [${isProd ? 'PROD' : 'DEV'}] Frontend: Orders fetch attempt ${attempt} result:`, {
                    success: result.success,
                    orderCount: result.orders?.length || 0,
                    method: result.method,
                    hasOrders: !!result.orders,
                    hasPagination: !!result.pagination,
                    errorPresent: !!result.error
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

                console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Frontend: Final transformed result:`, {
                    success: transformedResult.success,
                    orderCount: transformedResult.orderCount,
                    transformedOrdersCount: transformedResult.orders.length,
                    hasError: !!transformedResult.error
                });

                return transformedResult;

            } catch (currentError: any) {
                lastError = currentError;
                const errorMsg = currentError instanceof Error ? currentError.message : String(currentError);

                console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Frontend: Fetch orders attempt ${attempt}/${maxRetries} failed:`, {
                    errorMessage: errorMsg,
                    errorType: currentError?.constructor?.name,
                    errorStack: currentError?.stack,
                    fullError: currentError
                });

                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ [${isProd ? 'PROD' : 'DEV'}] Frontend: Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        const finalErrorMsg = lastError instanceof Error ? lastError.message : String(lastError);
        console.error(`💥 [${isProd ? 'PROD' : 'DEV'}] Frontend: All fetch attempts failed:`, {
            finalError: finalErrorMsg,
            lastErrorType: lastError?.constructor?.name,
            maxRetries
        });

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
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Frontend: Fetching single order ${orderId}`);

            const backendModule = await import('../../backend/orders-api.web');
            console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Backend module imported for single order:`, {
                hasGetSingleOrder: typeof backendModule.getSingleOrder === 'function'
            });

            if (typeof backendModule.getSingleOrder === 'function') {
                const result = await backendModule.getSingleOrder(orderId);

                console.log(`📊 [${isProd ? 'PROD' : 'DEV'}] Frontend: Single order result:`, {
                    success: result.success,
                    hasOrder: !!result.order,
                    errorPresent: !!result.error
                });

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
                console.warn(`⚠️ [${isProd ? 'PROD' : 'DEV'}] Frontend: getSingleOrder not available, using fallback`);
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
            console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Frontend: fetchSingleOrder error:`, {
                orderId,
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    async fulfillOrder(params: FulfillOrderParams): Promise<FulfillmentResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Frontend: Starting fulfillOrder:`, {
                orderId: params.orderId,
                orderNumber: params.orderNumber,
                trackingNumber: params.trackingNumber,
                shippingProvider: params.shippingProvider,
                environment: isProd ? 'PRODUCTION' : 'DEVELOPMENT'
            });

            const backendModule = await import('../../backend/orders-api.web');
            console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Backend module imported for fulfillment:`, {
                hasFulfillOrderInWix: typeof backendModule.fulfillOrderInWix === 'function',
                moduleKeys: Object.keys(backendModule)
            });

            if (typeof backendModule.fulfillOrderInWix !== 'function') {
                throw new Error('fulfillOrderInWix API is not available in backend module');
            }

            console.log(`📞 [${isProd ? 'PROD' : 'DEV'}] Frontend: Calling backend fulfillOrderInWix...`);
            const startTime = Date.now();

            const result = await backendModule.fulfillOrderInWix(params);

            const duration = Date.now() - startTime;
            console.log(`📊 [${isProd ? 'PROD' : 'DEV'}] Frontend: fulfillOrderInWix completed in ${duration}ms:`, {
                success: result.success,
                method: result.method,
                hasError: !!result.error,
                hasMessage: !!result.message,
                hasFulfillmentId: !!(result as any).fulfillmentId,
                resultKeys: Object.keys(result)
            });

            if (result.success) {
                console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Frontend: Fulfillment successful:`, {
                    orderNumber: params.orderNumber,
                    fulfillmentId: 'fulfillmentId' in result ? result.fulfillmentId : undefined,
                    message: result.message
                });
            } else {
                console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Frontend: Fulfillment failed:`, {
                    orderNumber: params.orderNumber,
                    error: result.error,
                    message: result.message
                });
            }

            return result;

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`💥 [${isProd ? 'PROD' : 'DEV'}] Frontend: fulfillOrder exception:`, {
                orderNumber: params.orderNumber,
                errorMessage: errorMsg,
                errorType: error instanceof Error ? error.constructor.name : 'Unknown',
                errorStack: error instanceof Error ? error.stack : undefined
            });

            return {
                success: false,
                message: `Failed to fulfill order: ${errorMsg}`,
                error: errorMsg
            };
        }
    }

    private transformOrderFromBackend = (backendOrder: any): Order => {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        console.log(`🔄 [${isProd ? 'PROD' : 'DEV'}] Frontend: Transforming order:`, {
            orderId: backendOrder._id,
            orderNumber: backendOrder.number,
            rawStatus: backendOrder.rawOrder?.status,
            fulfillmentStatus: backendOrder.rawOrder?.fulfillmentStatus,
            backendStatus: backendOrder.status
        });

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

        console.log(`📊 [${isProd ? 'PROD' : 'DEV'}] Frontend: Order status transformation:`, {
            orderNumber: backendOrder.number,
            originalStatus: orderStatus,
            originalFulfillmentStatus: backendOrder.rawOrder?.fulfillmentStatus,
            finalStatus
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
                console.warn(`🚨 Unknown order status: "${statusString}" - defaulting to NOT_FULFILLED`);
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