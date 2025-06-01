// types/Order.ts
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
    shippingAddress: ShippingAddress | null;
    billingInfo?: any;
    recipientInfo?: any;
    rawOrder: any;
}

export interface Customer {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
}

export interface OrderItem {
    name: string;
    quantity: number;
    price: string;
    image: string;
    weight: number;
    options: Record<string, any>;
}

export interface ShippingInfo {
    carrierId: string;
    title: string;
    cost: string;
}

export interface ShippingAddress {
    streetAddress?: {
        name: string;
        number: string;
        apt: string;
    } | null;
    city: string;
    postalCode: string;
    country: string;
    countryFullname: string;
    subdivision: string;
    subdivisionFullname: string;
    addressLine1: string;
    addressLine2: string;
}

export type OrderStatus = 'NOT_FULFILLED' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELED' | 'UNKNOWN';
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'UNPAID' | 'FULLY_REFUNDED' | 'PARTIALLY_REFUNDED' | 'UNKNOWN';

export interface Pagination {
    hasNext: boolean;
    nextCursor: string;
    prevCursor: string;
    ordersPerPage: number;
}

export interface ConnectionStatus {
    success: boolean;
    message: string;
}

// API Response Types - Updated to match backend exactly
export interface OrdersResponse {
    success: boolean;
    method?: string;
    orders?: Order[];
    orderCount?: number;
    pagination?: {
        hasNext: boolean;
        nextCursor: string;
        prevCursor: string;
        // Remove ordersPerPage from this interface since backend doesn't return it
    };
    message: string;
    error?: string;
    ecomError?: string; // Add this since backend can return ecomError
}

export interface FulfillmentResponse {
    success: boolean;
    method?: string;
    message: string;
    result?: any;
    error?: string;
}

// Request Types
export interface FetchOrdersParams {
    limit?: number;
    cursor?: string;
}

export interface FulfillOrderParams {
    orderId: string;
    trackingNumber: string;
    shippingProvider: string;
    orderNumber: string;
}

// UI State Types
export interface UIState {
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    submitting: boolean;
    trackingNumber: string;
    selectedCarrier: string;
}

// Shipping Carrier Types
export interface ShippingCarrier {
    id: string;
    value: string;
}