// backend/utils/order-mapper.ts

/**
 * Map raw Wix order data to standardized format
 */
export const mapWixOrder = (rawOrder: any) => {
    // Extract customer info
    const recipientContact = rawOrder.recipientInfo?.contactDetails;
    const billingContact = rawOrder.billingInfo?.contactDetails;
    const buyerInfo = rawOrder.buyerInfo;

    const customer = {
        firstName: recipientContact?.firstName || billingContact?.firstName || 'Unknown',
        lastName: recipientContact?.lastName || billingContact?.lastName || 'Customer',
        email: buyerInfo?.email || recipientContact?.email || billingContact?.email || 'no-email@example.com',
        phone: recipientContact?.phone || billingContact?.phone || '',
        company: recipientContact?.company || billingContact?.company || ''
    };

    // Map shipping address
    const shippingAddress = mapShippingAddress(rawOrder);

    // Map line items
    const items = mapLineItems(rawOrder.lineItems || []);

    // Map order status
    const status = mapOrderStatus(rawOrder);

    // Map payment status
    const paymentStatus = mapPaymentStatus(rawOrder);

    return {
        _id: rawOrder._id,
        number: rawOrder.number,
        _createdDate: rawOrder._createdDate,
        customer,
        items,
        totalWeight: calculateTotalWeight(rawOrder.lineItems || []),
        total: rawOrder.priceSummary?.total?.formattedAmount || '$0.00',
        status,
        paymentStatus,
        shippingInfo: {
            carrierId: rawOrder.shippingInfo?.carrierId || '',
            title: rawOrder.shippingInfo?.title || 'No shipping method',
            cost: rawOrder.shippingInfo?.cost?.formattedAmount || '$0.00'
        },
        weightUnit: rawOrder.weightUnit || 'KG',
        shippingAddress,
        billingInfo: rawOrder.billingInfo,
        recipientInfo: rawOrder.recipientInfo,
        rawOrder
    };
};

/**
 * Map shipping address from different possible locations
 */
const mapShippingAddress = (rawOrder: any) => {
    const address = rawOrder.recipientInfo?.address || rawOrder.billingInfo?.address;

    if (!address) return null;

    return {
        streetAddress: address.streetAddress ? {
            name: address.streetAddress.name || '',
            number: address.streetAddress.number || '',
            apt: address.streetAddress.apt || ''
        } : null,
        city: address.city || '',
        postalCode: address.postalCode || '',
        country: address.country || '',
        countryFullname: address.countryFullname || address.country || '',
        subdivision: address.subdivision || '',
        subdivisionFullname: address.subdivisionFullname || '',
        addressLine1: address.addressLine1 || (address.streetAddress ?
            `${address.streetAddress.name || ''} ${address.streetAddress.number || ''}`.trim() : ''),
        addressLine2: address.addressLine2 || (address.streetAddress?.apt || '')
    };
};

/**
 * Map line items with image processing
 */
const mapLineItems = (lineItems: any[]) => {
    return lineItems.map(item => ({
        name: item.productName?.original || 'Unknown Product',
        quantity: item.quantity || 1,
        price: item.price?.formattedAmount || '$0.00',
        image: processItemImage(item.image),
        weight: item.physicalProperties?.weight || 0,
        options: item.catalogReference?.options || {}
    }));
};

/**
 * Process Wix image URL
 */
const processItemImage = (imageString: string): string => {
    if (!imageString || typeof imageString !== 'string') return '';

    if (imageString.startsWith('wix:image://v1/')) {
        const imageId = imageString
            .replace('wix:image://v1/', '')
            .split('#')[0]
            .split('~')[0];
        return `https://static.wixstatic.com/media/${imageId}`;
    }

    if (imageString.startsWith('wix:image://')) {
        const imageId = imageString.replace(/^wix:image:\/\/[^\/]*\//, '').split('#')[0].split('~')[0];
        return `https://static.wixstatic.com/media/${imageId}`;
    }

    if (imageString.startsWith('http')) return imageString;

    return `https://static.wixstatic.com/media/${imageString}`;
};

/**
 * Map order status with priority for canceled orders
 */
const mapOrderStatus = (rawOrder: any): string => {
    if (rawOrder.status === 'CANCELED' || rawOrder.status === 'CANCELLED') {
        return 'CANCELED';
    }

    return rawOrder.fulfillmentStatus || 'NOT_FULFILLED';
};

/**
 * Map payment status
 */
const mapPaymentStatus = (rawOrder: any): string => {
    const status = rawOrder.paymentStatus;

    if (status === 'FULLY_REFUNDED') return 'FULLY_REFUNDED';
    if (status === 'PARTIALLY_REFUNDED') return 'PARTIALLY_REFUNDED';
    if (status === 'PAID') return 'PAID';

    return 'UNKNOWN';
};

/**
 * Calculate total weight from line items
 */
const calculateTotalWeight = (lineItems: any[]): number => {
    return lineItems.reduce((total, item) => {
        const itemWeight = item.physicalProperties?.weight || 0;
        const quantity = item.quantity || 1;
        return total + (itemWeight * quantity);
    }, 0);
};