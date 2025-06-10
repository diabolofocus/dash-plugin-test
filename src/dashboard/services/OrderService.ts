// services/OrderService.ts - FIXED: Direct imports instead of dynamic imports

import type { OrdersResponse, FulfillOrderParams, FulfillmentResponse, Order, OrderStatus, PaymentStatus } from '../types/Order';

// 🔥 FIXED: Import web methods directly instead of using dynamic imports
import {
    testOrdersConnection,
    getSingleOrder,
    fulfillOrderInWix
} from '../../backend/orders-api.web';

// 🔥 UPDATED: Add sendShippingEmail to the FulfillOrderParams interface
interface ExtendedFulfillOrderParams extends FulfillOrderParams {
    sendShippingEmail?: boolean;
}

export class OrderService {

    private orderCache: { orders: Order[]; timestamp: number; hasMore: boolean; nextCursor: string } | null = null;
    private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for progressive loading

    // Add this new method to OrderService.ts
    async fetchOrdersChunked(
        initialLimit: number = 100,
        onProgress?: (orders: Order[], totalLoaded: number, hasMore: boolean) => void
    ): Promise<{ success: boolean; orders: Order[]; totalCount: number; hasMore: boolean; nextCursor?: string; error?: string }> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
        let allOrders: Order[] = [];
        let cursor = '';
        let totalFetched = 0;
        const batchSize = 100;

        console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Starting chunked loading (initial: ${initialLimit} orders)...`);

        try {
            // Fetch orders until we reach the initial limit
            while (totalFetched < initialLimit) {
                // 🔥 FIXED: Use direct import instead of dynamic import
                const result = await testOrdersConnection({
                    limit: Math.min(batchSize, initialLimit - totalFetched),
                    cursor: cursor
                });

                if (result.success && result.orders) {
                    const transformedOrders = result.orders.map(this.transformOrderFromBackend);
                    allOrders = [...allOrders, ...transformedOrders];
                    totalFetched += transformedOrders.length;

                    // Update cursor for potential future loads
                    const hasMore = result.pagination?.hasNext || false;
                    cursor = result.pagination?.nextCursor || '';

                    console.log(`📦 Chunk batch: ${transformedOrders.length} orders, total: ${totalFetched}, hasMore: ${hasMore}`);

                    // Update UI immediately
                    if (onProgress) {
                        onProgress(allOrders, totalFetched, hasMore);
                    }

                    // Stop if no more orders or we hit our initial limit
                    if (!hasMore || totalFetched >= initialLimit) {
                        return {
                            success: true,
                            orders: allOrders,
                            totalCount: totalFetched,
                            hasMore: hasMore && totalFetched >= initialLimit,
                            nextCursor: cursor
                        };
                    }

                    // Small delay between batches
                    await new Promise(resolve => setTimeout(resolve, 50));
                } else {
                    throw new Error(result.error || 'Failed to fetch orders batch');
                }
            }

            return {
                success: true,
                orders: allOrders,
                totalCount: totalFetched,
                hasMore: !!cursor,
                nextCursor: cursor
            };

        } catch (error: any) {
            console.error(`💥 Chunked loading error:`, error);
            return {
                success: false,
                orders: allOrders,
                totalCount: allOrders.length,
                hasMore: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    // Add this method for loading additional chunks
    async fetchMoreOrders(
        cursor: string,
        limit: number = 100
    ): Promise<{ success: boolean; orders: Order[]; hasMore: boolean; nextCursor?: string; error?: string }> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');
        let allOrders: Order[] = [];
        let currentCursor = cursor;
        let totalFetched = 0;
        const batchSize = 100;

        console.log(`📦 [${isProd ? 'PROD' : 'DEV'}] Loading more orders (limit: ${limit})...`);

        try {
            while (totalFetched < limit && currentCursor) {
                // 🔥 FIXED: Use direct import instead of dynamic import
                const result = await testOrdersConnection({
                    limit: Math.min(batchSize, limit - totalFetched),
                    cursor: currentCursor
                });

                if (result.success && result.orders) {
                    const transformedOrders = result.orders.map(this.transformOrderFromBackend);
                    allOrders = [...allOrders, ...transformedOrders];
                    totalFetched += transformedOrders.length;

                    const hasMore = result.pagination?.hasNext || false;
                    currentCursor = result.pagination?.nextCursor || '';

                    console.log(`📦 More orders batch: ${transformedOrders.length} orders, total new: ${totalFetched}`);

                    if (!hasMore || totalFetched >= limit) {
                        break;
                    }

                    await new Promise(resolve => setTimeout(resolve, 50));
                } else {
                    throw new Error(result.error || 'Failed to fetch more orders');
                }
            }

            return {
                success: true,
                orders: allOrders,
                hasMore: !!currentCursor,
                nextCursor: currentCursor
            };

        } catch (error: any) {
            console.error(`💥 Load more orders error:`, error);
            return {
                success: false,
                orders: [],
                hasMore: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

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

                // 🔥 FIXED: Use direct import instead of dynamic import
                const result = await testOrdersConnection({ limit, cursor });

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

            // 🔥 FIXED: Use direct import instead of dynamic import
            const result = await getSingleOrder(orderId);

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

    // 🔥 UPDATED: Support sendShippingEmail parameter
    async fulfillOrder(params: ExtendedFulfillOrderParams): Promise<FulfillmentResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Frontend: Starting fulfillOrder:`, {
                orderId: params.orderId,
                orderNumber: params.orderNumber,
                trackingNumber: params.trackingNumber,
                shippingProvider: params.shippingProvider,
                sendShippingEmail: params.sendShippingEmail, // 🔥 NEW: Log email preference
                environment: isProd ? 'PRODUCTION' : 'DEVELOPMENT'
            });

            console.log(`📞 [${isProd ? 'PROD' : 'DEV'}] Frontend: Calling backend fulfillOrderInWix...`);
            const startTime = Date.now();

            // 🔥 FIXED: Use direct import instead of dynamic import
            // 🔥 UPDATED: Pass all parameters including sendShippingEmail
            const result = await fulfillOrderInWix({
                orderId: params.orderId,
                trackingNumber: params.trackingNumber,
                shippingProvider: params.shippingProvider,
                orderNumber: params.orderNumber,
                sendShippingEmail: params.sendShippingEmail // 🔥 NEW: Pass email preference
            });

            const duration = Date.now() - startTime;
            console.log(`📊 [${isProd ? 'PROD' : 'DEV'}] Frontend: fulfillOrderInWix completed in ${duration}ms:`, {
                success: result.success,
                method: result.method,
                hasError: !!result.error,
                hasMessage: !!result.message,
                hasFulfillmentId: 'fulfillmentId' in result && !!(result as any).fulfillmentId,
                hasEmailInfo: !!result.emailInfo, // 🔥 NEW: Log email info presence
                resultKeys: Object.keys(result)
            });

            if (result.success) {
                console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Frontend: Fulfillment successful:`, {
                    orderNumber: params.orderNumber,
                    fulfillmentId: 'fulfillmentId' in result ? result.fulfillmentId : undefined,
                    message: result.message,
                    emailInfo: result.emailInfo // 🔥 NEW: Log email info
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
                error: errorMsg,
                emailInfo: { // 🔥 NEW: Include email info in error response
                    emailRequested: params.sendShippingEmail || false,
                    emailSentAutomatically: false,
                    note: 'Email not sent due to fulfillment failure'
                }
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