// utils/constants.ts
import type { ShippingCarrier } from '../types/UI';

export const SHIPPING_CARRIERS: ShippingCarrier[] = [
    { id: 'dhl', value: 'DHL' },
    { id: 'ups', value: 'UPS' },
    { id: 'fedex', value: 'FedEx' },
    { id: 'usps', value: 'USPS' }
];

export const DEMO_ORDERS = [
    {
        _id: "demo_10003",
        number: "10003",
        _createdDate: "2025-05-27T21:44:00.000Z",
        customer: {
            firstName: "Demo",
            lastName: "Customer",
            email: "demo@example.com",
            phone: "+1-555-0123",
            company: "Demo Company LLC"
        },
        items: [{ name: "Test Product", quantity: 1, price: "$16.00", image: "", weight: 0, options: {} }],
        totalWeight: 0,
        total: "$16.00",
        status: "NOT_FULFILLED" as const,
        paymentStatus: "PAID" as const,
        shippingInfo: {
            carrierId: "dhl",
            title: "DHL Express",
            cost: "$12.50"
        },
        weightUnit: "KG",
        shippingAddress: null,
        rawOrder: {}
    }
];

export const statusFilterOptions = [
    { id: 'unfulfilled', value: 'Unfulfilled' },
    { id: 'fulfilled', value: 'Fulfilled' },
    { id: 'unpaid', value: 'Unpaid' },
    { id: 'refunded', value: 'Refunded' },
    { id: 'canceled', value: 'Canceled' },
    { id: 'archived', value: 'Archived' }
];

// components/OrdersTable/constants/invoiceConfig.ts
export const INVOICE_MODAL_CONFIG = {
    // Replace this with your actual modal ID from Wix Dev Center
    modalId: "invoice-viewer-modal",

    // Default parameters for the invoice modal
    defaultParams: {
        mode: "view",
        source: "orders-table"
    },

    // Modal configuration options
    options: {
        width: 800,
        height: 600,
        resizable: true
    }
};

// Invoice-related constants
export const INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
} as const;

// Cache configuration
export const INVOICE_CACHE_CONFIG = {
    // Cache invoices for 5 minutes
    ttl: 5 * 60 * 1000,

    // Maximum number of cached invoice records
    maxCacheSize: 1000,

    // Batch size for bulk invoice checks
    batchSize: 50
};