// components/OrdersTable/hooks/useOrderActions.ts - Updated with Invoice functionality
import { useState, useCallback } from 'react';
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import { orders, orderFulfillments } from '@wix/ecom';
import { printOrderToPDF } from '../utils/printOrderUtils';
import type { Order } from '../types/Order';

export const useOrderActions = () => {
    const [orderTrackingCache, setOrderTrackingCache] = useState<Record<string, { trackingNumber?: string; trackingLink?: string } | null>>({});


    const getTrackingInfo = useCallback(async (orderId: string) => {
        if (orderTrackingCache[orderId] !== undefined) {
            return orderTrackingCache[orderId];
        }

        try {
            const response = await orderFulfillments.listFulfillmentsForSingleOrder(orderId);
            const fulfillments = response.orderWithFulfillments?.fulfillments || [];

            const withTracking = fulfillments
                .filter(f => f.trackingInfo?.trackingNumber)
                .sort((a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime())[0];

            const trackingInfo = withTracking?.trackingInfo || null;

            setOrderTrackingCache(prev => ({
                ...prev,
                [orderId]: trackingInfo
            }));

            return trackingInfo;
        } catch (error) {
            console.error('Error fetching tracking info for order:', orderId, error);
            setOrderTrackingCache(prev => ({
                ...prev,
                [orderId]: null
            }));
            return null;
        }
    }, [orderTrackingCache]);

    const handleViewOrder = useCallback((order: Order) => {
        try {
            if (!order?._id) {
                console.error('Order ID is missing');
                return;
            }

            const orderId = String(order._id).trim();
            console.log(`Opening order details for Order #${order.number}, ID: ${orderId}`);

            dashboard.navigate(
                pages.orderDetails({
                    id: orderId
                }),
                {
                    displayMode: "overlay"
                }
            );
        } catch (error) {
            console.error('Navigation failed:', error);
        }
    }, []);

    const handleTrackOrder = useCallback(async (order: Order) => {
        const trackingInfo = await getTrackingInfo(order._id);
        if (trackingInfo?.trackingLink) {
            window.open(trackingInfo.trackingLink, '_blank', 'noopener,noreferrer');
        }
    }, [getTrackingInfo]);

    const handlePrintOrder = useCallback(async (order: Order) => {
        try {
            await printOrderToPDF(order);
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    }, []);

    const handleArchiveOrder = useCallback(async (order: Order) => {
        try {
            console.log(`Archiving order #${order.number}`);

            const confirmed = window.confirm(`Are you sure you want to archive order #${order.number}?`);
            if (!confirmed) return;

            const ordersToUpdate = [
                {
                    order: {
                        id: order._id,
                        archived: true
                    }
                }
            ];

            const response = await orders.bulkUpdateOrders(ordersToUpdate, { returnEntity: false });
            console.log("Order archived successfully:", response);

            alert(`Order #${order.number} has been archived successfully!`);
        } catch (error) {
            console.error("Error archiving order:", error);
            alert(`Failed to archive order #${order.number}. Please try again.`);
        }
    }, []);

    return {
        handleViewOrder,
        handleTrackOrder,
        handlePrintOrder,
        handleArchiveOrder,
        orderTrackingCache,
        getTrackingInfo,
    };
};