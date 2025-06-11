// types/Order.ts - UPDATED with email parameter

export interface CustomField {
    title: string;
    translatedTitle?: string;
    value: any;
}

export interface ExtendedFields {
    namespaces?: Record<string, Record<string, any>>;
}

export interface FullAddressContactDetails {
    company?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export interface BillingInfo {
    address?: Address;
    contactDetails?: FullAddressContactDetails;
    vatId?: VatId;
    paymentMethod?: string;
    paymentProviderTransactionId?: string;
    externalTransactionId?: string;
}

export interface VatId {
    type?: string;
    number?: string;
}
export interface FulfillmentResponse {
    success: boolean;
    method?: string;
    message?: string;
    error?: string;
    fulfillmentId?: string;
    trackingNumber?: string;
    orderWithFulfillments?: {
        orderId: string;
        fulfillments: Array<{
            _id: string;
            _createdDate: string;
            lineItems: Array<{
                _id: string;
                quantity: number;
            }>;
            trackingInfo?: {
                trackingNumber: string;
                shippingProvider: string;
                trackingLink?: string;
            };
            status?: string;
            completed?: boolean;
        }>;
    };
    // Email information in response
    emailInfo?: {
        emailRequested?: boolean;
        emailSentAutomatically?: boolean;
        customerEmail?: string;
        note?: string;
    };
}

// Add sendShippingEmail parameter
export interface FulfillOrderParams {
    orderId: string;
    trackingNumber: string;
    shippingProvider: string;
    orderNumber: string;
    trackingUrl?: string;
    sendShippingEmail?: boolean; // Optional email parameter
}

export type OrderStatus = 'NOT_FULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELED';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'FULLY_REFUNDED' | 'PARTIALLY_REFUNDED' | 'UNKNOWN';

export interface Customer {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
}

export interface OrderItem {
    name: string;
    quantity: number;
    price: string;
    weight?: number;
    sku?: string;
    productId?: string;
    variantId?: string;
    image?: string;
    _id?: string;
}

export interface ShippingInfo {
    carrierId: string;
    title: string;
    cost: string;
}

export interface ShippingAddress {
    firstName?: string;
    lastName?: string;
    company?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    subdivision?: string;
    subdivisionFullname?: string;
    country?: string;
    countryFullname?: string;
    postalCode?: string;
    phone?: string;
    streetAddress?: {
        name?: string;
        number?: string;
        apt?: string;
    };
}

// UPDATE: Also update your Address interface to include streetAddress and fullname fields
export interface Address {
    firstName?: string;
    lastName?: string;
    company?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    subdivision?: string;
    subdivisionFullname?: string;
    country?: string;
    countryFullname?: string;
    postalCode?: string;
    phone?: string;
    streetAddress?: {
        name?: string;
        number?: string;
        apt?: string;
    };
}

export interface RecipientInfo {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    // Add contactDetails structure to match actual data
    contactDetails?: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
        company?: string;
        address?: Address;
    };
}

export interface Order {
    _id: string;
    number: string;
    _createdDate: string;
    customer: Customer;
    items: OrderItem[];
    totalWeight: number;
    total: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    shippingInfo: ShippingInfo;
    weightUnit: string;
    shippingAddress?: Address;
    billingInfo?: BillingInfo;
    recipientInfo?: RecipientInfo;
    buyerNote?: string;
    rawOrder?: any;
    customFields?: CustomField[];
    extendedFields?: ExtendedFields;
}

export interface OrdersResponse {
    success: boolean;
    method?: string;
    orders: Order[];
    orderCount: number;
    pagination: {
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
    };
    message?: string;
    error?: string;
    ecomError?: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface BackendOrdersResponse {
    success: boolean;
    method?: string;
    orders?: any[];
    orderCount?: number;
    pagination?: {
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
    };
    message?: string;
    error?: string;
    ecomError?: string;
}

export interface BackendSingleOrderResponse {
    success: boolean;
    order?: any;
    error?: string;
}

export interface QueryOrdersResponse {
    success: boolean;
    orders: Order[];
    totalCount: number;
    hasNext: boolean;
    error?: string;
}