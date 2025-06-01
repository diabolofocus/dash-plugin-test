// backend/services/wix-fulfillment.service.ts

export class WixFulfillmentService {
    private fulfillmentAPI: any;

    constructor() {
        this.initializeFulfillmentAPI();
    }

    private async initializeFulfillmentAPI() {
        try {
            const ecomModule = await import('@wix/ecom');
            this.fulfillmentAPI = ecomModule.orderFulfillments;
        } catch (error) {
            console.error('Failed to initialize Wix Fulfillment API:', error);
            throw new Error('Fulfillment API not available');
        }
    }

    /**
     * Create a new fulfillment for an order
     */
    async createFulfillment(orderId: string, fulfillmentData: {
        lineItems: Array<{ id: string; quantity: number }>;
        trackingInfo: {
            trackingNumber: string;
            shippingProvider: string;
        };
    }) {
        if (!this.fulfillmentAPI) {
            await this.initializeFulfillmentAPI();
        }

        try {
            const createMethod = this.fulfillmentAPI.createFulfillment;

            if (typeof createMethod !== 'function') {
                throw new Error('createFulfillment method not available');
            }

            const result = await createMethod(orderId, fulfillmentData);

            return {
                success: true,
                method: 'createFulfillment',
                result,
                fulfillmentId: result.fulfillment?._id
            };

        } catch (error) {
            console.error('Error creating fulfillment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                method: 'createFulfillment'
            };
        }
    }

    /**
     * Update existing fulfillment tracking information
     */
    async updateFulfillment(orderId: string, fulfillmentId: string, trackingInfo: {
        trackingNumber: string;
        shippingProvider: string;
    }) {
        if (!this.fulfillmentAPI) {
            await this.initializeFulfillmentAPI();
        }

        try {
            const updateMethod = this.fulfillmentAPI.updateFulfillment;

            if (typeof updateMethod !== 'function') {
                throw new Error('updateFulfillment method not available');
            }

            const result = await updateMethod(
                { orderId, fulfillmentId },
                { fulfillment: { trackingInfo } }
            );

            return {
                success: true,
                method: 'updateFulfillment',
                result
            };

        } catch (error) {
            console.error('Error updating fulfillment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                method: 'updateFulfillment'
            };
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
            'canada-post': 'canada-post'
        };

        return mapping[provider.toLowerCase()] || provider.toLowerCase();
    }
}