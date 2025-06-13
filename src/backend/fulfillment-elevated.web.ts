// 🔥 UPDATED: Update fulfillment with ELEVATED permissions (automatic emails)
export const updateFulfillmentElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        fulfillmentId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail = true
    }: {
        orderId: string;
        fulfillmentId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
        sendShippingEmail?: boolean;
    }) => {
        console.log(`📧 ELEVATED: updateFulfillmentElevated called for order ${orderNumber} (EMAILS ENABLED)`);

        try {
            // Get order details for email logging
            const elevatedGetOrder = auth.elevate(orders.getOrder);
            const orderDetails = await elevatedGetOrder(orderId);

            // Enhanced carrier mapping
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royalMail',
                'australia-post': 'australiaPost',
                'deutsche-post': 'deutschePost',
                'la-poste': 'laPoste',
                'japan-post': 'japanPost',
                'china-post': 'chinaPost',
                'tnt': 'tnt',
                'aramex': 'aramex',
                'other': 'other'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || 'other';
            console.log(`ELEVATED: Using carrier: ${mappedCarrier} (from ${shippingProvider})`);

            console.log(`ELEVATED: Updating fulfillment ${fulfillmentId} with tracking: ${trackingNumber}`);
            console.log(`📧 ELEVATED: Email notification: ENABLED - emails will be sent automatically`);
            console.log(`📧 ELEVATED: Customer email: ${orderDetails?.buyerInfo?.email || 'Unknown'}`);

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

            console.log(`ELEVATED: Update parameters:`, {
                identifiers: JSON.stringify(identifiers, null, 2),
                options: JSON.stringify(options, null, 2)
            });

            // 🔥 USE ELEVATED PERMISSIONS (automatic emails)
            const elevatedUpdateFulfillment = auth.elevate(orderFulfillments.updateFulfillment);
            const updateResult = await elevatedUpdateFulfillment(identifiers, options);

            console.log(`ELEVATED: Successfully updated fulfillment for order ${orderNumber} (emails sent):`, updateResult);

            return {
                success: true,
                method: 'updateFulfillmentElevated',
                message: `Tracking updated for order ${orderNumber}: ${trackingNumber}`,
                emailSent: true, // Elevated permissions always send emails
                result: updateResult
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`ELEVATED: updateFulfillmentElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to update fulfillment for order ${orderNumber}: ${errorMsg}`,
                method: 'updateFulfillmentElevated'
            };
        }
    }
);// src/backend/fulfillment-elevated.web.ts - CONDITIONAL ELEVATION based on email control

import { webMethod, Permissions } from '@wix/web-methods';
import { auth } from '@wix/essentials';
import { orderFulfillments, orders } from '@wix/ecom';

// 🔥 IMPROVED: Smart fulfillment with conditional elevation based on email preference
export const smartFulfillOrderElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail = true // 🔥 NEW: Accept email preference
    }: {
        orderId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
        sendShippingEmail?: boolean; // 🔥 NEW: Email control parameter
    }) => {
        console.log(`SMART: smartFulfillOrderElevated called for order ${orderNumber}`, {
            trackingNumber,
            shippingProvider,
            sendShippingEmail,
            useElevatedPermissions: sendShippingEmail
        });

        try {
            // First, check if order already has fulfillments (always use elevated for reading)
            const fulfillmentsCheck = await getFulfillmentsElevated({ orderId, orderNumber });

            if (!fulfillmentsCheck.success) {
                throw new Error(`Failed to check existing fulfillments: ${fulfillmentsCheck.error}`);
            }

            if (fulfillmentsCheck.hasExistingFulfillments && fulfillmentsCheck.fulfillments.length > 0) {
                // Order already has fulfillments - UPDATE existing fulfillment
                console.log(`SMART: Order ${orderNumber} already has fulfillments, updating existing fulfillment...`);

                const existingFulfillment = fulfillmentsCheck.fulfillments[0];
                const fulfillmentId = existingFulfillment._id;

                // 🔥 NEW: Use elevated permissions only if we want to send emails
                if (sendShippingEmail) {
                    console.log(`📧 SMART: Using ELEVATED permissions for update (emails will be sent automatically)`);
                    return await updateFulfillmentElevated({
                        orderId,
                        fulfillmentId,
                        trackingNumber,
                        shippingProvider,
                        orderNumber,
                        sendShippingEmail
                    });
                } else {
                    console.log(`🚫 SMART: Using REGULAR permissions for update (no emails will be sent)`);
                    return await updateFulfillmentRegular({
                        orderId,
                        fulfillmentId,
                        trackingNumber,
                        shippingProvider,
                        orderNumber,
                        sendShippingEmail
                    });
                }

            } else {
                // No existing fulfillments - CREATE new fulfillment
                console.log(`📦 SMART: Creating new fulfillment for order ${orderNumber}`);

                // 🔥 NEW: Use elevated permissions only if we want to send emails
                if (sendShippingEmail) {
                    console.log(`📧 SMART: Using ELEVATED permissions for create (emails will be sent automatically)`);
                    return await createFulfillmentElevated({
                        orderId,
                        trackingNumber,
                        shippingProvider,
                        orderNumber,
                        sendShippingEmail
                    });
                } else {
                    console.log(`🚫 SMART: Using REGULAR permissions for create (no emails will be sent)`);
                    return await createFulfillmentRegular({
                        orderId,
                        trackingNumber,
                        shippingProvider,
                        orderNumber,
                        sendShippingEmail
                    });
                }
            }

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`SMART: smartFulfillOrderElevated failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Smart fulfillment failed for order ${orderNumber}: ${errorMsg}`,
                method: 'smartFulfillOrderElevated'
            };
        }
    }
);

// 🔥 NEW: Create fulfillment with REGULAR permissions (no automatic emails)
export const createFulfillmentRegular = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail = false
    }: {
        orderId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
        sendShippingEmail?: boolean;
    }) => {
        console.log(`🚫 REGULAR: createFulfillmentRegular called for order ${orderNumber} (NO EMAILS)`);

        try {
            // Get order details with elevated permissions (read-only)
            const elevatedGetOrder = auth.elevate(orders.getOrder);
            const orderDetails = await elevatedGetOrder(orderId);

            if (!orderDetails) {
                throw new Error(`Order ${orderNumber} not found`);
            }

            console.log(`REGULAR: Order ${orderNumber} details:`, {
                id: orderDetails._id,
                status: orderDetails.status,
                fulfillmentStatus: orderDetails.fulfillmentStatus,
                lineItemsCount: orderDetails.lineItems?.length || 0,
                customerEmail: orderDetails.buyerInfo?.email || 'No email found'
            });

            if (!orderDetails.lineItems || orderDetails.lineItems.length === 0) {
                throw new Error(`Order ${orderNumber} has no line items to fulfill`);
            }

            // Enhanced carrier mapping
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royalMail',
                'australia-post': 'australiaPost',
                'deutsche-post': 'deutschePost',
                'la-poste': 'laPoste',
                'japan-post': 'japanPost',
                'china-post': 'chinaPost',
                'tnt': 'tnt',
                'aramex': 'aramex',
                'other': 'other'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || 'other';
            console.log(`🚚 REGULAR: Using carrier: ${mappedCarrier} (from ${shippingProvider})`);

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

            console.log(`🔨 REGULAR: Creating fulfillment with REGULAR permissions (no automatic emails):`, JSON.stringify(fulfillmentData, null, 2));
            console.log(`📧 REGULAR: Email notification: DISABLED - using regular permissions`);

            // 🔥 USE REGULAR PERMISSIONS (no automatic emails)
            const fulfillmentResult = await orderFulfillments.createFulfillment(orderId, fulfillmentData);

            console.log(`✅ REGULAR: Successfully created fulfillment for order ${orderNumber} (no emails sent):`, fulfillmentResult);

            return {
                success: true,
                method: 'createFulfillmentRegular',
                fulfillmentId: fulfillmentResult.fulfillmentId,
                message: `Order ${orderNumber} fulfilled successfully with tracking: ${trackingNumber} (no email sent)`,
                emailSent: false,
                result: fulfillmentResult
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`❌ REGULAR: createFulfillmentRegular failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to create fulfillment for order ${orderNumber}: ${errorMsg}`,
                method: 'createFulfillmentRegular'
            };
        }
    }
);

// 🔥 NEW: Update fulfillment with REGULAR permissions (no automatic emails)
export const updateFulfillmentRegular = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        fulfillmentId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail = false
    }: {
        orderId: string;
        fulfillmentId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
        sendShippingEmail?: boolean;
    }) => {
        console.log(`🚫 REGULAR: updateFulfillmentRegular called for order ${orderNumber} (NO EMAILS)`);

        try {
            // Get order details for logging (elevated for read-only)
            const elevatedGetOrder = auth.elevate(orders.getOrder);
            const orderDetails = await elevatedGetOrder(orderId);

            // Enhanced carrier mapping
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royalMail',
                'australia-post': 'australiaPost',
                'deutsche-post': 'deutschePost',
                'la-poste': 'laPoste',
                'japan-post': 'japanPost',
                'china-post': 'chinaPost',
                'tnt': 'tnt',
                'aramex': 'aramex',
                'other': 'other'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || 'other';
            console.log(`REGULAR: Using carrier: ${mappedCarrier} (from ${shippingProvider})`);

            console.log(`REGULAR: Updating fulfillment ${fulfillmentId} with tracking: ${trackingNumber}`);
            console.log(`📧 REGULAR: Email notification: DISABLED - using regular permissions`);
            console.log(`📧 REGULAR: Customer email: ${orderDetails?.buyerInfo?.email || 'Unknown'}`);

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

            console.log(`REGULAR: Update parameters:`, {
                identifiers: JSON.stringify(identifiers, null, 2),
                options: JSON.stringify(options, null, 2)
            });

            // 🔥 USE REGULAR PERMISSIONS (no automatic emails)
            const updateResult = await orderFulfillments.updateFulfillment(identifiers, options);

            console.log(`REGULAR: Successfully updated fulfillment for order ${orderNumber} (no emails sent):`, updateResult);

            return {
                success: true,
                method: 'updateFulfillmentRegular',
                message: `Tracking updated for order ${orderNumber}: ${trackingNumber} (no email sent)`,
                emailSent: false,
                result: updateResult
            };

        } catch (error: unknown) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`REGULAR: updateFulfillmentRegular failed for order ${orderNumber}:`, error);

            return {
                success: false,
                error: errorMsg,
                message: `Failed to update fulfillment for order ${orderNumber}: ${errorMsg}`,
                method: 'updateFulfillmentRegular'
            };
        }
    }
);

// 🔥 UPDATED: Create fulfillment with ELEVATED permissions (automatic emails)
export const createFulfillmentElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        trackingNumber,
        shippingProvider,
        orderNumber,
        sendShippingEmail = true
    }: {
        orderId: string;
        trackingNumber: string;
        shippingProvider: string;
        orderNumber: string;
        sendShippingEmail?: boolean;
    }) => {
        console.log(`📧 ELEVATED: createFulfillmentElevated called for order ${orderNumber} (EMAILS ENABLED)`);

        try {
            // Get order details first with elevated permissions
            const elevatedGetOrder = auth.elevate(orders.getOrder);
            const orderDetails = await elevatedGetOrder(orderId);

            if (!orderDetails) {
                throw new Error(`Order ${orderNumber} not found`);
            }

            console.log(`ELEVATED: Order ${orderNumber} details:`, {
                id: orderDetails._id,
                status: orderDetails.status,
                fulfillmentStatus: orderDetails.fulfillmentStatus,
                lineItemsCount: orderDetails.lineItems?.length || 0,
                customerEmail: orderDetails.buyerInfo?.email || 'No email found'
            });

            if (!orderDetails.lineItems || orderDetails.lineItems.length === 0) {
                throw new Error(`Order ${orderNumber} has no line items to fulfill`);
            }

            // Enhanced carrier mapping
            const carrierMapping: Record<string, string> = {
                'dhl': 'dhl',
                'ups': 'ups',
                'fedex': 'fedex',
                'usps': 'usps',
                'canada-post': 'canadaPost',
                'royal-mail': 'royalMail',
                'australia-post': 'australiaPost',
                'deutsche-post': 'deutschePost',
                'la-poste': 'laPoste',
                'japan-post': 'japanPost',
                'china-post': 'chinaPost',
                'tnt': 'tnt',
                'aramex': 'aramex',
                'other': 'other'
            };

            const mappedCarrier = carrierMapping[shippingProvider.toLowerCase()] || 'other';
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

            console.log(`🔨 ELEVATED: Creating fulfillment with ELEVATED permissions (automatic emails):`, JSON.stringify(fulfillmentData, null, 2));
            console.log(`📧 ELEVATED: Email notification: ENABLED - emails will be sent automatically`);
            console.log(`📧 ELEVATED: Customer email: ${orderDetails.buyerInfo?.email || 'Unknown'}`);

            // 🔥 USE ELEVATED PERMISSIONS (automatic emails)
            const elevatedCreateFulfillment = auth.elevate(orderFulfillments.createFulfillment);
            const fulfillmentResult = await elevatedCreateFulfillment(orderId, fulfillmentData);

            console.log(`✅ ELEVATED: Successfully created fulfillment for order ${orderNumber} (emails sent):`, fulfillmentResult);

            return {
                success: true,
                method: 'createFulfillmentElevated',
                fulfillmentId: fulfillmentResult.fulfillmentId,
                message: `Order ${orderNumber} fulfilled successfully with tracking: ${trackingNumber}`,
                emailSent: true, // Elevated permissions always send emails
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

// 🔥 IMPROVED: Check existing fulfillments with better error handling
export const getFulfillmentsElevated = webMethod(
    Permissions.Anyone,
    async ({
        orderId,
        orderNumber
    }: {
        orderId: string;
        orderNumber: string;
    }) => {
        console.log(`ELEVATED: getFulfillmentsElevated called for order ${orderNumber}`);

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
                fulfillmentsStructure: fulfillmentsArray.map((f: any) => ({
                    id: f._id,
                    trackingNumber: f.trackingInfo?.trackingNumber,
                    shippingProvider: f.trackingInfo?.shippingProvider,
                    status: f.status
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
            console.error(`ELEVATED: getFulfillmentsElevated failed for order ${orderNumber}:`, error);

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