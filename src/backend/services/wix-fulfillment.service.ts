// backend/services/wix-fulfillment.service.ts

export class WixFulfillmentService {
    private fulfillmentAPI: any;
    private ordersAPI: any;

    constructor() {
        this.initializeFulfillmentAPI();
    }

    private async initializeFulfillmentAPI() {
        console.log(`🔧 WixFulfillmentService.initializeFulfillmentAPI starting...`);

        try {
            console.log(`📦 Importing @wix/ecom module...`);
            const importStartTime = Date.now();

            const ecomModule = await import('@wix/ecom');

            console.log(`⏱️ @wix/ecom import took ${Date.now() - importStartTime}ms`);
            console.log(`📋 ecomModule structure:`, {
                hasOrderFulfillments: !!ecomModule.orderFulfillments,
                hasOrders: !!ecomModule.orders,
                orderFulfillmentsType: typeof ecomModule.orderFulfillments,
                ordersType: typeof ecomModule.orders,
                moduleKeys: Object.keys(ecomModule)
            });

            this.fulfillmentAPI = ecomModule.orderFulfillments;
            this.ordersAPI = ecomModule.orders;

            console.log(`✅ APIs assigned:`, {
                fulfillmentAPI: !!this.fulfillmentAPI,
                ordersAPI: !!this.ordersAPI,
                fulfillmentMethods: this.fulfillmentAPI ? Object.getOwnPropertyNames(this.fulfillmentAPI) : 'undefined',
                ordersMethods: this.ordersAPI ? Object.getOwnPropertyNames(this.ordersAPI) : 'undefined'
            });

            console.log(`🎉 WixFulfillmentService.initializeFulfillmentAPI completed successfully`);

        } catch (error) {
            console.error(`❌ WixFulfillmentService.initializeFulfillmentAPI ERROR:`, {
                errorType: error?.constructor?.name,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fullError: error
            });
            throw new Error('Fulfillment API not available');
        }
    }

    /**
     * Create a new fulfillment for an order
     */
    async createFulfillment(orderId: string, fulfillmentData: {
        trackingNumber: string;
        shippingProvider: string;
    }) {
        console.log(`🚀 WixFulfillmentService.createFulfillment called with:`, {
            orderId,
            trackingNumber: fulfillmentData.trackingNumber,
            shippingProvider: fulfillmentData.shippingProvider
        });

        if (!this.fulfillmentAPI || !this.ordersAPI) {
            console.log(`⚠️ APIs not initialized, initializing now...`);
            await this.initializeFulfillmentAPI();
        }

        console.log(`✅ APIs available:`, {
            fulfillmentAPI: !!this.fulfillmentAPI,
            ordersAPI: !!this.ordersAPI,
            createFulfillmentMethod: typeof this.fulfillmentAPI?.createFulfillment
        });

        try {
            // First get the order to get line item IDs
            console.log(`📦 Getting order details for fulfillment creation: ${orderId}`);

            const orderStartTime = Date.now();
            const order = await this.ordersAPI.getOrder(orderId);
            console.log(`⏱️ getOrder took ${Date.now() - orderStartTime}ms`);

            console.log(`📋 Order response:`, {
                exists: !!order,
                id: order?._id,
                lineItemsCount: order?.lineItems?.length || 0,
                status: order?.status,
                fulfillmentStatus: order?.fulfillmentStatus
            });

            if (!order) {
                throw new Error(`Order ${orderId} not found`);
            }

            if (!order.lineItems || order.lineItems.length === 0) {
                throw new Error(`Order ${orderId} has no line items to fulfill`);
            }

            console.log(`📋 Order line items details:`, order.lineItems.map((item: any, index: number) => ({
                index,
                id: item._id,
                productName: item.productName?.original,
                quantity: item.quantity
            })));

            // Prepare line items for fulfillment (fulfill all items)
            const lineItems = order.lineItems.map((item: any) => ({
                _id: item._id,
                quantity: item.quantity || 1
            }));

            console.log(`📝 Prepared line items for fulfillment:`, lineItems);

            // Map shipping provider to correct format
            const originalProvider = fulfillmentData.shippingProvider;
            const shippingProvider = this.mapShippingProvider(fulfillmentData.shippingProvider);
            console.log(`🚚 Shipping provider mapping: "${originalProvider}" -> "${shippingProvider}"`);

            // Create fulfillment with proper structure
            const fulfillment = {
                lineItems: lineItems,
                trackingInfo: {
                    trackingNumber: fulfillmentData.trackingNumber,
                    shippingProvider: shippingProvider
                },
                status: 'Fulfilled'
            };

            console.log(`🔨 Creating fulfillment with data:`, JSON.stringify(fulfillment, null, 2));

            const createMethod = this.fulfillmentAPI.createFulfillment;

            if (typeof createMethod !== 'function') {
                console.error(`❌ createFulfillment method not available. Type: ${typeof createMethod}`);
                throw new Error('createFulfillment method not available');
            }

            console.log(`🔥 Calling createFulfillment API...`);
            const fulfillmentStartTime = Date.now();

            const result = await createMethod(orderId, fulfillment);

            console.log(`⏱️ createFulfillment took ${Date.now() - fulfillmentStartTime}ms`);
            console.log(`✅ Fulfillment API response:`, JSON.stringify(result, null, 2));

            const returnValue = {
                success: true,
                method: 'createFulfillment',
                result,
                fulfillmentId: result.fulfillmentId
            };

            console.log(`🎉 WixFulfillmentService.createFulfillment returning:`, returnValue);
            return returnValue;

        } catch (error) {
            console.error(`❌ WixFulfillmentService.createFulfillment ERROR:`, {
                errorType: error?.constructor?.name,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fullError: error
            });

            const returnValue = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                method: 'createFulfillment'
            };

            console.log(`💥 WixFulfillmentService.createFulfillment returning error:`, returnValue);
            return returnValue;
        }
    }

    /**
     * Update existing fulfillment tracking information
     */
    async updateFulfillment(orderId: string, fulfillmentId: string, trackingInfo: {
        trackingNumber: string;
        shippingProvider: string;
    }) {
        console.log(`🚀 WixFulfillmentService.updateFulfillment called with:`, {
            orderId,
            fulfillmentId,
            trackingNumber: trackingInfo.trackingNumber,
            shippingProvider: trackingInfo.shippingProvider
        });

        if (!this.fulfillmentAPI) {
            console.log(`⚠️ fulfillmentAPI not initialized, initializing now...`);
            await this.initializeFulfillmentAPI();
        }

        console.log(`✅ fulfillmentAPI available:`, {
            fulfillmentAPI: !!this.fulfillmentAPI,
            updateFulfillmentMethod: typeof this.fulfillmentAPI?.updateFulfillment
        });

        try {
            const updateMethod = this.fulfillmentAPI.updateFulfillment;

            if (typeof updateMethod !== 'function') {
                console.error(`❌ updateFulfillment method not available. Type: ${typeof updateMethod}`);
                throw new Error('updateFulfillment method not available');
            }

            // Map shipping provider to correct format
            const originalProvider = trackingInfo.shippingProvider;
            const shippingProvider = this.mapShippingProvider(trackingInfo.shippingProvider);
            console.log(`🚚 Shipping provider mapping: "${originalProvider}" -> "${shippingProvider}"`);

            console.log(`🔄 Updating fulfillment ${fulfillmentId} with tracking: ${trackingInfo.trackingNumber}`);

            const identifiers = {
                orderId: orderId,
                fulfillmentId: fulfillmentId
            };

            const options = {
                fulfillment: {
                    trackingInfo: {
                        trackingNumber: trackingInfo.trackingNumber,
                        shippingProvider: shippingProvider
                    }
                }
            };

            console.log(`🔧 Update parameters:`, {
                identifiers: JSON.stringify(identifiers, null, 2),
                options: JSON.stringify(options, null, 2)
            });

            console.log(`🔥 Calling updateFulfillment API...`);
            const updateStartTime = Date.now();

            const result = await updateMethod(identifiers, options);

            console.log(`⏱️ updateFulfillment took ${Date.now() - updateStartTime}ms`);
            console.log(`✅ Update API response:`, JSON.stringify(result, null, 2));

            const returnValue = {
                success: true,
                method: 'updateFulfillment',
                result
            };

            console.log(`🎉 WixFulfillmentService.updateFulfillment returning:`, returnValue);
            return returnValue;

        } catch (error) {
            console.error(`❌ WixFulfillmentService.updateFulfillment ERROR:`, {
                errorType: error?.constructor?.name,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                fullError: error
            });

            const returnValue = {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                method: 'updateFulfillment'
            };

            console.log(`💥 WixFulfillmentService.updateFulfillment returning error:`, returnValue);
            return returnValue;
        }
    }

    /**
     * Get fulfillments for an order
     */
    async getFulfillments(orderId: string) {
        if (!this.fulfillmentAPI) {
            await this.initializeFulfillmentAPI();
        }

        const methods = [
            'listFulfillmentsForSingleOrder',
            'listFulfillments',
            'getFulfillments',
            'queryFulfillments'
        ];

        for (const methodName of methods) {
            try {
                const method = this.fulfillmentAPI[methodName];

                if (typeof method === 'function') {
                    let result;

                    if (methodName === 'listFulfillmentsForSingleOrder') {
                        result = await method(orderId);
                    } else if (methodName === 'listFulfillments') {
                        result = await method({ orderId });
                    } else if (methodName === 'getFulfillments') {
                        result = await method(orderId);
                    } else if (methodName === 'queryFulfillments') {
                        result = await method({ filter: { orderId: { $eq: orderId } } });
                    }

                    if (result) {
                        return {
                            success: true,
                            fulfillments: this.extractFulfillments(result),
                            method: methodName,
                            rawResult: result
                        };
                    }
                }
            } catch (error) {
                console.warn(`Method ${methodName} failed:`, error);
                continue;
            }
        }

        return {
            success: false,
            error: 'Could not retrieve fulfillments using any available method',
            fulfillments: []
        };
    }

    /**
     * Extract fulfillments from different response structures
     */
    private extractFulfillments(result: any): any[] {
        if (result.orderWithFulfillments?.fulfillments) {
            return result.orderWithFulfillments.fulfillments;
        }

        if (result.fulfillments) {
            return result.fulfillments;
        }

        if (Array.isArray(result)) {
            return result;
        }

        return [];
    }

    /**
     * Map shipping provider names to Wix-compatible values
     */
    mapShippingProvider(provider: string): string {
        const mapping: Record<string, string> = {
            'dhl': 'dhl',
            'ups': 'ups',
            'fedex': 'fedex',
            'usps': 'usps',
            'royal-mail': 'royal-mail',
            'canada-post': 'canadaPost'
        };

        return mapping[provider.toLowerCase()] || provider.toLowerCase();
    }
}