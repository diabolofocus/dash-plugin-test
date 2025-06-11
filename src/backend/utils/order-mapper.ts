// backend/utils/order-mapper.ts

/**
 * Extract product options from catalog reference
 * Handles both Wix Stores products and custom catalog SPI products
 */
function extractProductOptions(lineItem: any) {
    console.log('=== EXTRACT OPTIONS DEBUG ===');
    console.log('Line item:', lineItem);
    console.log('Catalog ref:', lineItem.catalogReference);
    console.log('Catalog ref options:', lineItem.catalogReference?.options);

    const catalogRef = lineItem.catalogReference;
    if (!catalogRef?.options) {
        console.log('No options found in catalogRef.options');
        return null;
    }

    const result = {
        variantId: catalogRef.options.variantId || null,
        options: catalogRef.options.options || {},
        customTextFields: catalogRef.options.customTextFields || {}
    };

    console.log('Extracted options result:', result);
    console.log('=== END EXTRACT OPTIONS DEBUG ===');

    return result;
}

/**
 * Extract shipping address from order
 */
function extractShippingAddress(rawOrder: any) {
    const shippingInfo = rawOrder.shippingInfo;
    if (!shippingInfo?.logistics?.shippingDestination?.contactDetails) {
        return null;
    }

    const contactDetails = shippingInfo.logistics.shippingDestination.contactDetails;
    const address = shippingInfo.logistics.shippingDestination.address;

    return {
        firstName: contactDetails.firstName || '',
        lastName: contactDetails.lastName || '',
        company: contactDetails.company || '',
        phone: contactDetails.phone || '',
        address: {
            addressLine1: address?.addressLine1 || '',
            addressLine2: address?.addressLine2 || '',
            city: address?.city || '',
            subdivision: address?.subdivision || '',
            country: address?.country || '',
            postalCode: address?.postalCode || ''
        }
    };
}

/**
 * Extract billing address from order
 */
function extractBillingAddress(rawOrder: any) {
    const billingInfo = rawOrder.billingInfo;
    if (!billingInfo?.contactDetails) {
        return null;
    }

    return {
        firstName: billingInfo.contactDetails.firstName || '',
        lastName: billingInfo.contactDetails.lastName || '',
        company: billingInfo.contactDetails.company || '',
        phone: billingInfo.contactDetails.phone || '',
        email: billingInfo.contactDetails.email || '',
        address: {
            addressLine1: billingInfo.address?.addressLine1 || '',
            addressLine2: billingInfo.address?.addressLine2 || '',
            city: billingInfo.address?.city || '',
            subdivision: billingInfo.address?.subdivision || '',
            country: billingInfo.address?.country || '',
            postalCode: billingInfo.address?.postalCode || ''
        }
    };
}

/**
 * Map fulfillment status to readable format
 */
function mapFulfillmentStatus(fulfillmentStatus: string): string {
    const statusMap: Record<string, string> = {
        'NOT_FULFILLED': 'NOT_FULFILLED',
        'PARTIALLY_FULFILLED': 'PARTIALLY_FULFILLED',
        'FULFILLED': 'FULFILLED',
        'CANCELLED': 'CANCELLED'
    };

    return statusMap[fulfillmentStatus] || fulfillmentStatus;
}

/**
 * Map order status to readable format
 */
function mapOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
        'INITIALIZED': 'INITIALIZED',
        'APPROVED': 'APPROVED',
        'CANCELED': 'CANCELED',
        'REFUNDED': 'REFUNDED',
        'PARTIALLY_REFUNDED': 'PARTIALLY_REFUNDED'
    };

    return statusMap[status] || status;
}

/**
 * Map raw Wix order to standardized Order interface
 * Handles both regular Wix Stores products and custom catalog SPI products
 */
export const mapWixOrder = (rawOrder: any) => {
    if (!rawOrder) {
        throw new Error('Raw order data is required');
    }

    return {
        _id: rawOrder._id || rawOrder.id,
        number: rawOrder.number?.toString() || 'N/A',
        status: mapOrderStatus(rawOrder.status || 'UNKNOWN'),
        fulfillmentStatus: mapFulfillmentStatus(rawOrder.fulfillmentStatus || 'NOT_FULFILLED'),

        // Order dates
        _createdDate: rawOrder._createdDate || rawOrder.createdDate,
        _updatedDate: rawOrder._updatedDate || rawOrder.updatedDate,

        // Customer information
        buyerInfo: {
            contactId: rawOrder.buyerInfo?.contactId || '',
            email: rawOrder.buyerInfo?.email || rawOrder.billingInfo?.contactDetails?.email || '',
            firstName: rawOrder.buyerInfo?.firstName || rawOrder.billingInfo?.contactDetails?.firstName || '',
            lastName: rawOrder.buyerInfo?.lastName || rawOrder.billingInfo?.contactDetails?.lastName || '',
            phone: rawOrder.buyerInfo?.phone || rawOrder.billingInfo?.contactDetails?.phone || ''
        },

        // Line items with product options support
        lineItems: rawOrder.lineItems?.map((item: any) => ({
            _id: item._id || item.id,
            productName: item.productName?.original || item.name || 'Unknown Product',
            quantity: item.quantity || 1,
            price: item.price?.amount || item.price || '0',

            // Product options (supports both Wix Stores and custom catalog SPI)
            productOptions: extractProductOptions(item),

            // Catalog reference
            catalogReference: {
                catalogItemId: item.catalogReference?.catalogItemId || '',
                appId: item.catalogReference?.appId || '',
                options: item.catalogReference?.options || {}
            },

            // Additional item details
            image: item.image || '',
            sku: item.sku || '',
            weight: item.weight || 0,
            itemType: item.itemType?.preset || 'PHYSICAL',

            // Tax and pricing details
            taxInfo: {
                taxAmount: item.taxInfo?.taxAmount?.amount || '0',
                taxRate: item.taxInfo?.taxRate || 0
            }
        })) || [],

        // Price summary
        priceSummary: {
            subtotal: rawOrder.priceSummary?.subtotal?.amount || '0',
            shipping: rawOrder.priceSummary?.shipping?.amount || '0',
            tax: rawOrder.priceSummary?.tax?.amount || '0',
            discount: rawOrder.priceSummary?.discount?.amount || '0',
            total: rawOrder.priceSummary?.total?.amount || '0'
        },

        // Addresses
        shippingAddress: extractShippingAddress(rawOrder),
        billingAddress: extractBillingAddress(rawOrder),

        // Channel and payment info
        channelInfo: {
            type: rawOrder.channelInfo?.type || 'WEB',
            externalOrderId: rawOrder.channelInfo?.externalOrderId || ''
        },

        paymentStatus: rawOrder.paymentStatus || 'PENDING',
        currency: rawOrder.currency || 'USD',

        // Additional metadata
        customFields: rawOrder.customFields || {},
        internalNotes: rawOrder.internalNotes || '',
        customerNotes: rawOrder.activities?.find((activity: any) =>
            activity.type === 'ORDER_PLACED'
        )?.orderPlaced?.note || '',

        // Fulfillment tracking (if available)
        trackingInfo: rawOrder.fulfillments?.[0]?.trackingInfo ? {
            trackingNumber: rawOrder.fulfillments[0].trackingInfo.trackingNumber || '',
            shippingProvider: rawOrder.fulfillments[0].trackingInfo.shippingProvider || '',
            trackingLink: rawOrder.fulfillments[0].trackingInfo.trackingLink || ''
        } : null
    };
};