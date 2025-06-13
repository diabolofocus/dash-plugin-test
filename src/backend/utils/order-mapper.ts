// utils/order-mapper.ts
import type { Order } from '../../dashboard/types/Order';

/**
 * Extract product options from catalog reference
 * Handles both Wix Stores products and custom catalog SPI products
 */
function extractProductOptions(lineItem: any) {
    const catalogRef = lineItem.catalogReference;
    if (!catalogRef?.options) {
        return null;
    }

    return {
        variantId: catalogRef.options.variantId || null,
        options: catalogRef.options.options || {},
        customTextFields: catalogRef.options.customTextFields || {}
    };
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
 * Maps a raw Wix order object to our standardized Order type
 * This matches your existing implementation but provides the simplified Order interface
 */
export function mapWixOrder(rawOrder: any): Order {
    if (!rawOrder) {
        throw new Error('Cannot map null or undefined order');
    }

    // Extract contact details from multiple sources
    const recipientContact = rawOrder.recipientInfo?.contactDetails;
    const billingContact = rawOrder.billingInfo?.contactDetails;
    const buyerInfo = rawOrder.buyerInfo;

    // Get customer information with fallbacks
    const firstName = recipientContact?.firstName || billingContact?.firstName || 'Unknown';
    const lastName = recipientContact?.lastName || billingContact?.lastName || 'Customer';
    const phone = recipientContact?.phone || billingContact?.phone || '';
    const company = recipientContact?.company || billingContact?.company || '';
    const email = buyerInfo?.email || recipientContact?.email || billingContact?.email || 'no-email@example.com';

    // Extract shipping address
    let shippingAddress = null;
    if (rawOrder.recipientInfo?.address) {
        const addr = rawOrder.recipientInfo.address;
        shippingAddress = {
            streetAddress: addr.streetAddress ? {
                name: addr.streetAddress.name || '',
                number: addr.streetAddress.number || '',
                apt: addr.streetAddress.apt || ''
            } : null,
            city: addr.city || '',
            postalCode: addr.postalCode || '',
            country: addr.country || '',
            countryFullname: addr.countryFullname || addr.country || '',
            subdivision: addr.subdivision || '',
            subdivisionFullname: addr.subdivisionFullname || '',
            addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
            addressLine2: addr.addressLine2 || (addr.streetAddress?.apt || '')
        };
    } else if (rawOrder.billingInfo?.address) {
        const addr = rawOrder.billingInfo.address;
        shippingAddress = {
            streetAddress: addr.streetAddress ? {
                name: addr.streetAddress.name || '',
                number: addr.streetAddress.number || '',
                apt: addr.streetAddress.apt || ''
            } : null,
            city: addr.city || '',
            postalCode: addr.postalCode || '',
            country: addr.country || '',
            countryFullname: addr.countryFullname || addr.country || '',
            subdivision: addr.subdivision || '',
            subdivisionFullname: addr.subdivisionFullname || '',
            addressLine1: addr.addressLine1 || (addr.streetAddress ? `${addr.streetAddress.name || ''} ${addr.streetAddress.number || ''}`.trim() : ''),
            addressLine2: addr.addressLine2 || (addr.streetAddress?.apt || '')
        };
    }

    // Process line items with image handling
    const processedItems = rawOrder.lineItems?.map((item: any) => {
        let imageUrl = '';

        if (item.image && typeof item.image === 'string') {
            if (item.image.startsWith('wix:image://v1/')) {
                const imageId = item.image
                    .replace('wix:image://v1/', '')
                    .split('#')[0]
                    .split('~')[0];
                imageUrl = `https://static.wixstatic.com/media/${imageId}`;
            } else if (item.image.startsWith('wix:image://')) {
                const imageId = item.image.replace(/^wix:image:\/\/[^\/]*\//, '').split('#')[0].split('~')[0];
                imageUrl = `https://static.wixstatic.com/media/${imageId}`;
            } else if (item.image.startsWith('http')) {
                imageUrl = item.image;
            } else {
                imageUrl = `https://static.wixstatic.com/media/${item.image}`;
            }
        }

        return {
            name: item.productName?.original || 'Unknown Product',
            quantity: item.quantity || 1,
            price: item.price?.formattedAmount || '$0.00',
            image: imageUrl,
            weight: item.physicalProperties?.weight || 0,
            sku: item.catalogReference?.catalogItemId || '',
            productId: item.catalogReference?.catalogItemId || '',
            variantId: item.catalogReference?.options?.variantId || '',
            _id: item._id
        };
    }) || [];

    // Determine order status with improved logic
    const rawStatus = rawOrder.status;
    const fulfillmentStatus = rawOrder.fulfillmentStatus;

    let orderStatus = 'NOT_FULFILLED';

    if (rawStatus === 'CANCELED' || rawStatus === 'CANCELLED') {
        orderStatus = 'CANCELED';
    } else {
        const actualFulfillmentStatus = fulfillmentStatus || 'NOT_FULFILLED';
        orderStatus = actualFulfillmentStatus;
    }

    // Enhanced payment status mapping
    let paymentStatus = rawOrder.paymentStatus || 'UNKNOWN';

    // Calculate total weight
    const totalWeight = rawOrder.lineItems?.reduce((total: number, item: any) => {
        const itemWeight = item.physicalProperties?.weight || 0;
        const quantity = item.quantity || 1;
        return total + (itemWeight * quantity);
    }, 0) || 0;

    // Build the standardized Order object
    const mappedOrder: Order = {
        _id: rawOrder._id,
        number: rawOrder.number,
        _createdDate: rawOrder._createdDate,
        customer: {
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            company: company
        },
        items: processedItems,
        totalWeight: totalWeight,
        total: rawOrder.priceSummary?.total?.formattedAmount || '$0.00',
        status: orderStatus as any,
        paymentStatus: paymentStatus,
        shippingInfo: {
            carrierId: rawOrder.shippingInfo?.carrierId || '',
            title: rawOrder.shippingInfo?.title || 'No shipping method',
            cost: rawOrder.shippingInfo?.cost?.formattedAmount || '$0.00'
        },
        weightUnit: rawOrder.weightUnit || 'KG',
        shippingAddress: shippingAddress,
        billingInfo: rawOrder.billingInfo,
        recipientInfo: rawOrder.recipientInfo,
        rawOrder: rawOrder
    };

    return mappedOrder;
}

/**
 * Maps an array of raw Wix orders to our Order type
 */
export function mapWixOrders(rawOrders: any[]): Order[] {
    if (!Array.isArray(rawOrders)) {
        console.warn('mapWixOrders: expected array, got', typeof rawOrders);
        return [];
    }

    return rawOrders
        .filter(order => order != null) // Filter out null/undefined orders
        .map(rawOrder => {
            try {
                return mapWixOrder(rawOrder);
            } catch (error) {
                console.error('Failed to map order:', rawOrder?._id || 'unknown', error);
                return null;
            }
        })
        .filter((order): order is Order => order !== null); // Filter out failed mappings
}

/**
 * Helper function to extract just the essential search fields from a raw order
 * Used for quick search operations without full mapping
 */
export function extractSearchFields(rawOrder: any): {
    _id: string;
    number: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    company: string;
    productNames: string[];
    _createdDate: string;
} {
    const recipientContact = rawOrder.recipientInfo?.contactDetails;
    const billingContact = rawOrder.billingInfo?.contactDetails;
    const buyerInfo = rawOrder.buyerInfo;

    const firstName = recipientContact?.firstName || billingContact?.firstName || '';
    const lastName = recipientContact?.lastName || billingContact?.lastName || '';
    const customerName = `${firstName} ${lastName}`.trim();
    const customerEmail = buyerInfo?.email || recipientContact?.email || billingContact?.email || '';
    const customerPhone = recipientContact?.phone || billingContact?.phone || '';
    const company = recipientContact?.company || billingContact?.company || '';

    const productNames = rawOrder.lineItems?.map((item: any) =>
        item.productName?.original || 'Unknown Product'
    ) || [];

    return {
        _id: rawOrder._id,
        number: rawOrder.number,
        customerName,
        customerEmail,
        customerPhone,
        company,
        productNames,
        _createdDate: rawOrder._createdDate
    };
}

/**
 * Validate that a raw order has the minimum required fields
 */
export function validateRawOrder(rawOrder: any): boolean {
    return !!(
        rawOrder &&
        rawOrder._id &&
        rawOrder.number &&
        rawOrder._createdDate
    );
}

/**
 * Helper to determine if an order matches a search term based on extracted fields
 */
export function orderMatchesSearchTerm(searchFields: ReturnType<typeof extractSearchFields>, searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();

    return (
        searchFields.number.toLowerCase().includes(term) ||
        searchFields.customerName.toLowerCase().includes(term) ||
        searchFields.customerEmail.toLowerCase().includes(term) ||
        searchFields.customerPhone.toLowerCase().includes(term) ||
        searchFields.company.toLowerCase().includes(term) ||
        searchFields.productNames.some(name => name.toLowerCase().includes(term))
    );
}