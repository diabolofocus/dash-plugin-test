// src/backend/fulfillment-elevated.web.ts
import { webMethod, Permissions } from '@wix/web-methods';
import { auth } from '@wix/essentials';
import { orderFulfillments, orders } from '@wix/ecom';

// 🔥 ELEVATED: Create fulfillment with elevated permissions
export const createFulfillmentElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber
    }: {
        orderId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
    }) => {
        console.log(`🚀 ELEVATED: createFulfillmentElevated called for order ${orderNumber}`);

        try {
            // Get order details first with elevated permissions
            const elevatedGetOrder = auth.elevate(orders.getOrder);
            const orderDetails = await elevatedGetOrder(orderId);

            if (!orderDetails) {
                throw new Error(`Order ${orderNumber} not found`);
            }

            console.log(`📊 ELEVATED: Order ${orderNumber} details:`, {
                id: orderDetails._id,
                status: orderDetails.status,
                fulfillmentStatus: orderDetails.fulfillmentStatus,
                lineItemsCount: orderDetails.lineItems?.length || 0
            });

            if (!orderDetails.lineItems || orderDetails.lineItems.length === 0) {
                throw new Error(`Order ${orderNumber} has no line items to fulfill`);
            }

            // Map shipping provider
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royal-mail'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || shippingProvider.toLowerCase();
            console.log(`🚚 ELEVATED: Using carrier: ${mappedCarrier} (from ${shippingProvider})`);

            // Prepare line items for fulfillment
            const fulfillmentLineItems = orderDetails.lineItems.map((item: any) => ({
                _id: item._id,
                quantity: item.quantity || 1
            }));

            const fulfillmentData = {
                lineItems: fulfillmentLineItems,
                trackingInfo: {
                    trackingNumber: trackingNumber,
                    shippingProvider: mappedCarrier
                },
                status: 'Fulfilled'
            };

            console.log(`🔨 ELEVATED: Creating fulfillment with data:`, JSON.stringify(fulfillmentData, null, 2));

            // Use elevated permissions for createFulfillment
            const elevatedCreateFulfillment = auth.elevate(orderFulfillments.createFulfillment);
            const fulfillmentResult = await elevatedCreateFulfillment(orderId, fulfillmentData);

            console.log(`✅ ELEVATED: Successfully created fulfillment for order ${orderNumber}:`, fulfillmentResult);

            return {
                success: true,
                method: 'createFulfillmentElevated',
                fulfillmentId: fulfillmentResult.fulfillmentId,
                message: `Order ${orderNumber} fulfilled successfully with tracking: ${trackingNumber}`,
                result: fulfillmentResult
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ ELEVATED: createFulfillmentElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to create fulfillment for order ${orderNumber}: ${errorMsg}`,
                method: 'createFulfillmentElevated'
            };
        }
    }
);

// 🔥 ELEVATED: Update fulfillment with elevated permissions
export const updateFulfillmentElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        fulfillmentId,
        trackingNumber,
        shippingProvider,
        orderNumber
    }: {
        orderId: string;
        fulfillmentId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
    }) => {
        console.log(`🚀 ELEVATED: updateFulfillmentElevated called for order ${orderNumber}`);

        try {
            // Map shipping provider
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royal-mail'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || shippingProvider.toLowerCase();
            console.log(`🚚 ELEVATED: Using carrier: ${mappedCarrier} (from ${shippingProvider})`);

            console.log(`🔄 ELEVATED: Updating fulfillment ${fulfillmentId} with tracking: ${trackingNumber}`);

            const identifiers = {
                orderId: orderId,
                fulfillmentId: fulfillmentId
            };

            const options = {
                fulfillment: {
                    trackingInfo: {
                        trackingNumber: trackingNumber,
                        shippingProvider: mappedCarrier
                    }
                }
            };

            console.log(`🔧 ELEVATED: Update parameters:`, {
                identifiers: JSON.stringify(identifiers, null, 2),
                options: JSON.stringify(options, null, 2)
            });

            // Use elevated permissions for updateFulfillment
            const elevatedUpdateFulfillment = auth.elevate(orderFulfillments.updateFulfillment);
            const updateResult = await elevatedUpdateFulfillment(identifiers, options);

            console.log(`✅ ELEVATED: Successfully updated fulfillment for order ${orderNumber}:`, updateResult);

            return {
                success: true,
                method: 'updateFulfillmentElevated',
                message: `Tracking updated for order ${orderNumber}: ${trackingNumber}`,
                result: updateResult
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ ELEVATED: updateFulfillmentElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to update fulfillment for order ${orderNumber}: ${errorMsg}`,
                method: 'updateFulfillmentElevated'
            };
        }
    }
);

// 🔥 ELEVATED: Check existing fulfillments with elevated permissions
export const getFulfillmentsElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        orderNumber
    }: {
        orderId: string;
        orderNumber: string;
    }) => {
        console.log(`🚀 ELEVATED: getFulfillmentsElevated called for order ${orderNumber}`);

        try {
            // Use elevated permissions for listFulfillmentsForSingleOrder
            const elevatedListFulfillments = auth.elevate(orderFulfillments.listFulfillmentsForSingleOrder);
            const existingFulfillments = await elevatedListFulfillments(orderId);

            console.log(`📋 ELEVATED: Existing fulfillments response:`, existingFulfillments);

            const fulfillmentsArray = existingFulfillments?.orderWithFulfillments?.fulfillments || [];
            const hasExistingFulfillments = fulfillmentsArray.length > 0;

            console.log(`📊 ELEVATED: Fulfillment analysis for ${orderNumber}:`, {
                hasExistingFulfillments,
                existingFulfillmentsCount: fulfillmentsArray.length,
                fulfillmentsStructure: fulfillmentsArray.map(f => ({
                    id: f._id,
                    trackingNumber: f.trackingInfo?.trackingNumber
                }))
            });

            return {
                success: true,
                method: 'getFulfillmentsElevated',
                hasExistingFulfillments,
                fulfillments: fulfillmentsArray,
                result: existingFulfillments
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ ELEVATED: getFulfillmentsElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to get fulfillments for order ${orderNumber}: ${errorMsg}`,
                method: 'getFulfillmentsElevated',
                hasExistingFulfillments: false,
                fulfillments: []
            };
        }
    }
);

// 🔥 ELEVATED: Smart fulfillment - automatically decide create vs update
export const smartFulfillOrderElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber
    }: {
        orderId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
    }) => {
        console.log(`🚀 ELEVATED: smartFulfillOrderElevated called for order ${orderNumber}`);

        try {
            // First, check if order already has fulfillments
            const fulfillmentsCheck = await getFulfillmentsElevated({ orderId, orderNumber });

            if (!fulfillmentsCheck.success) {
                throw new Error(`Failed to check existing fulfillments: ${fulfillmentsCheck.error}`);
            }

            if (fulfillmentsCheck.hasExistingFulfillments && fulfillmentsCheck.fulfillments.length > 0) {
                // Order already has fulfillments - UPDATE existing fulfillment
                console.log(`🔄 ELEVATED: Order ${orderNumber} already has fulfillments, updating existing fulfillment...`);

                const existingFulfillment = fulfillmentsCheck.fulfillments[0];
                const fulfillmentId = existingFulfillment._id;

                return await updateFulfillmentElevated({
                    orderId,
                    fulfillmentId,
                    trackingNumber,
                    shippingProvider,
                    orderNumber
                });

            } else {
                // No existing fulfillments - CREATE new fulfillment
                console.log(`📦 ELEVATED: Creating new fulfillment for order ${orderNumber}`);

                return await createFulfillmentElevated({
                    orderId,
                    trackingNumber,
                    shippingProvider,
                    orderNumber
                });
            }

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ ELEVATED: smartFulfillOrderElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Smart fulfillment failed for order ${orderNumber}: ${errorMsg}`,
                method: 'smartFulfillOrderElevated'
            };
        }
    }
);