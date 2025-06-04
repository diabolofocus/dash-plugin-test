// components/OrderDetails/OrderActivity.tsx
import React, { useState } from 'react';
import { Box, Text, Button, InputArea } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import type { Order } from '../../types/Order';

interface OrderActivityProps {
    order: Order;
}

// Activity type to human-readable mapping
const getActivityDescription = (activity: any): string => {
    const customerName = activity.order?.customer?.firstName || 'Customer';

    switch (activity.type) {
        case 'ORDER_PLACED':
            return `${customerName} placed an order`;
        case 'ORDER_PAID':
            return 'Order marked as Paid';
        case 'INVOICE_ADDED':
        case 'INVOICE_SENT':
            return 'Invoice created';
        case 'SHIPPING_CONFIRMATION_EMAIL_SENT':
            return `Shipping confirmation email sent to ${customerName}`;
        case 'ORDER_FULFILLED':
            return 'Order fulfilled';
        case 'TRACKING_NUMBER_ADDED':
            return 'Tracking number added';
        case 'TRACKING_NUMBER_EDITED':
            return 'Tracking number updated';
        case 'TRACKING_LINK_ADDED':
            return 'Tracking link added';
        case 'ORDER_CANCELED':
            return 'Order canceled';
        case 'ORDER_REFUNDED':
            return 'Order refunded';
        case 'MERCHANT_COMMENT':
            return 'Note added';
        case 'CUSTOM_ACTIVITY':
            return activity.customActivity?.type || 'Custom activity';
        default:
            return activity.type?.replace(/_/g, ' ').toLowerCase() || 'Activity';
    }
};

// Format activity date and time
const formatActivityDateTime = (dateString: string): { date: string; time: string } => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const timeStr = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    if (date.toDateString() === today.toDateString()) {
        return { date: 'Today', time: timeStr };
    } else if (date.toDateString() === yesterday.toDateString()) {
        return { date: 'Yesterday', time: timeStr };
    } else {
        return {
            date: date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }),
            time: timeStr
        };
    }
};

export const OrderActivity: React.FC<OrderActivityProps> = ({ order }) => {
    const orderController = useOrderController();
    const [newNote, setNewNote] = useState('');

    // Get activities from the raw order
    const activities = order.rawOrder?.activities || [];

    // Sort activities by date (newest first)
    const sortedActivities = [...activities].sort((a, b) =>
        new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime()
    );

    const handleAddNote = () => {
        if (newNote.trim()) {
            // TODO: Implement add note functionality
            console.log('Adding note:', newNote);
            // You would call a backend method here to add the note
            setNewNote('');
        }
    };

    return (
        <Box gap="24px" direction="vertical" style={{
            paddingTop: '16px',
        }}>
            <Text size="medium" weight="bold">Order activity</Text>

            {/* Add Note Section */}
            <Box gap="16px" direction="vertical" >

                <Box gap="8px" direction="vertical">
                    <Text size="small" secondary>Add a note (Your customer won't see this)</Text>

                    <InputArea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Enter your note here..."
                        size="small"
                        autoGrow={true}
                        minRowsAutoGrow={1}
                        resizable
                        rows={2}
                        maxLength={300}
                    />

                </Box>

                <Button
                    size="small"
                    disabled={!newNote.trim()}
                    onClick={handleAddNote}
                    priority="secondary"
                >
                    Add Note
                </Button>
            </Box>

            {/* Activity Timeline */}
            <Box gap="0px" direction="vertical" style={{ position: 'relative' }}>
                {sortedActivities.length === 0 ? (
                    <Text size="small" secondary>No activity recorded</Text>
                ) : (
                    sortedActivities.map((activity, index) => {
                        const { date, time } = formatActivityDateTime(activity._createdDate);
                        const description = getActivityDescription(activity);
                        const isLast = index === sortedActivities.length - 1;

                        return (
                            <Box key={activity._id} direction="horizontal" gap="12px" style={{ position: 'relative' }}>
                                {/* Timeline dot and line */}
                                <Box
                                    style={{
                                        position: 'relative',
                                        paddingTop: '4px',
                                        minWidth: '12px',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {/* Timeline dot */}
                                    <Box
                                        style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: '#1976d2',
                                            position: 'relative',
                                            zIndex: 1
                                        }}
                                    />

                                    {/* Timeline line */}
                                    {!isLast && (
                                        <Box
                                            style={{
                                                position: 'absolute',
                                                top: '12px',
                                                left: '3px',
                                                width: '2px',
                                                height: '40px',
                                                backgroundColor: '#e0e0e0'
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* Activity content */}
                                <Box gap="4px" direction="vertical" style={{ flex: 1, paddingBottom: '24px' }}>
                                    {/* Date header (only show if different from previous) */}
                                    {(index === 0 ||
                                        formatActivityDateTime(sortedActivities[index - 1]._createdDate).date !== date
                                    ) && (
                                            <Text size="tiny" secondary weight="normal" style={{ marginBottom: '8px', marginTop: index === 0 ? '24px' : '16px' }}>
                                                {date}
                                            </Text>
                                        )}

                                    {/* Activity description and time */}
                                    <Box direction="horizontal" align="space-between">
                                        <Text size="tiny" style={{ flex: 1 }}>
                                            {description}
                                        </Text>
                                        <Text size="tiny" secondary style={{ marginLeft: '12px' }}>
                                            {time}
                                        </Text>
                                    </Box>

                                    {/* Additional details for specific activity types */}
                                    {activity.type === 'MERCHANT_COMMENT' && activity.merchantComment?.message && (
                                        <Box
                                            style={{
                                                backgroundColor: '#f5f5f5',
                                                padding: '8px 12px',
                                                borderRadius: '4px',
                                                marginTop: '4px'
                                            }}
                                        >
                                            <Text size="tiny">{activity.merchantComment.message}</Text>
                                        </Box>
                                    )}

                                    {activity.type === 'ORDER_REFUNDED' && activity.orderRefunded && (
                                        <Box gap="4px" direction="vertical" style={{ marginTop: '4px' }}>
                                            <Text size="small" secondary>
                                                Amount: {activity.orderRefunded.amount?.formattedAmount}
                                            </Text>
                                            {activity.orderRefunded.reason && (
                                                <Text size="tiny" secondary>
                                                    Reason: {activity.orderRefunded.reason}
                                                </Text>
                                            )}
                                        </Box>
                                    )}

                                    {activity.type === 'CUSTOM_ACTIVITY' && activity.customActivity?.additionalData && (
                                        <Box gap="4px" direction="vertical" style={{ marginTop: '4px' }}>
                                            {Object.entries(activity.customActivity.additionalData).map(([key, value]) => (
                                                <Text key={key} size="tiny" secondary>
                                                    {key}: {value}
                                                </Text>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Author email if available */}
                                    {activity.authorEmail && (
                                        <Text size="tiny" secondary style={{ marginTop: '2px' }}>
                                            by {activity.authorEmail}
                                        </Text>
                                    )}
                                </Box>
                            </Box>
                        );
                    })
                )}
            </Box>
        </Box>
    );
};