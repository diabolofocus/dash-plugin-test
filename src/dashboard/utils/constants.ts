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