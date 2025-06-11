// components/OrderDetails/TrackingNumberDisplay.tsx
import React, { useState, useEffect } from 'react';
import { Text, Box, TextButton } from '@wix/design-system';
import { orderFulfillments } from '@wix/ecom';

interface TrackingInfo {
    trackingNumber?: string;
    trackingLink?: string;
    shippingProvider?: string;
}

interface TrackingNumberDisplayProps {
    orderId: string;
}

export const TrackingNumberDisplay: React.FC<TrackingNumberDisplayProps> = ({
    orderId
}) => {
    const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        // Reset tracking info when orderId changes
        setTrackingInfo(null);

        if (!orderId) {
            return;
        }

        const fetchTrackingInfo = async () => {
            try {
                setLoading(true);

                const response = await orderFulfillments.listFulfillmentsForSingleOrder(orderId);
                const fulfillments = response.orderWithFulfillments?.fulfillments || [];

                // Get the most recent fulfillment with tracking info
                const withTracking = fulfillments
                    .filter(f => f.trackingInfo?.trackingNumber)
                    .sort((a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime())[0];

                // Always set tracking info (either the found tracking or null)
                setTrackingInfo(withTracking?.trackingInfo || null);
            } catch (error) {
                console.error('Error fetching tracking info:', error);
                // On error, also reset to null
                setTrackingInfo(null);
            } finally {
                setLoading(false);
            }
        };

        fetchTrackingInfo();
    }, [orderId]);

    if (loading) {
        return (
            <Text size="small" secondary>
                Loading tracking info...
            </Text>
        );
    }

    // Only show tracking if tracking info exists (regardless of order status)
    if (!trackingInfo?.trackingNumber) {
        return null;
    }

    const handleTrackingClick = () => {
        if (trackingInfo?.trackingLink) {
            window.open(trackingInfo.trackingLink, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <Box direction="vertical" gap="2px">
            {/* Tracking Number Link - Only shown when tracking data exists */}
            <TextButton
                size="small"
                underline="onHover"
                onClick={handleTrackingClick}
            >
                Tracking: {trackingInfo.trackingNumber}
            </TextButton>
        </Box>
    );
};