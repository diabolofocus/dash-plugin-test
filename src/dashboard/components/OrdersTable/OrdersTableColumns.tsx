// components/OrdersTable/components/OrderTableColumns.tsx - Updated with Invoice button
import React from 'react';
import { Text, Box, TableActionCell } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate } from '../../utils/formatters';
import type { Order } from '../../types/Order';

interface OrderTableColumnsProps {
    onViewOrder: (order: Order) => void;
    onTrackOrder: (order: Order) => void;
    onPrintOrder: (order: Order) => void;
    onArchiveOrder: (order: Order) => void;
    orderTrackingCache: Record<string, { trackingNumber?: string; trackingLink?: string } | null>;
    getTrackingInfo: (orderId: string) => Promise<any>;
}

export const OrderTableColumns = ({
    onViewOrder,
    onTrackOrder,
    onPrintOrder,
    onArchiveOrder,
    orderTrackingCache,
    getTrackingInfo,
}: OrderTableColumnsProps) => [
        {
            title: 'Order',
            render: (order: Order) => (
                <Text size="small" weight="normal">
                    #{order.number}
                </Text>
            ),
            width: '70px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Date Created',
            render: (order: Order) => (
                <Text size="small">
                    {formatDate(order._createdDate)}
                </Text>
            ),
            width: '90px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Customer',
            render: (order: Order) => {
                const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
                const billingContact = order.rawOrder?.billingInfo?.contactDetails;

                const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
                const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
                const customerName = `${firstName} ${lastName}`;
                const company = recipientContact?.company || billingContact?.company || order.customer.company;

                return (
                    <Box direction="vertical" gap="2px">
                        <Text size="small" ellipsis>{customerName}</Text>
                        {company && (
                            <Text size="tiny" secondary ellipsis>{company}</Text>
                        )}
                    </Box>
                );
            },
            width: '140px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Payment',
            render: (order: Order) => (
                <StatusBadge status={order.paymentStatus} type="payment" />
            ),
            width: '80px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Fulfillment',
            render: (order: Order) => (
                <StatusBadge status={order.status} type="order" />
            ),
            width: '100px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Total',
            render: (order: Order) => (
                <Text size="small">{order.total}</Text>
            ),
            width: '70px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Actions',
            render: (order: Order) => {
                const cachedTracking = orderTrackingCache[order._id];
                const hasTracking = cachedTracking?.trackingNumber;

                const secondaryActions = [
                    {
                        text: "View Order",
                        icon: <Icons.Order />,
                        onClick: () => onViewOrder(order)
                    }
                ];

                if (hasTracking) {
                    secondaryActions.push({
                        text: "Track Order",
                        icon: <Icons.ExternalLink />,
                        onClick: () => onTrackOrder(order)
                    });
                }

                secondaryActions.push({
                    text: "Print Order",
                    icon: <Icons.Print />,
                    onClick: () => onPrintOrder(order)
                });

                secondaryActions.push({ divider: true } as any);

                secondaryActions.push({
                    text: "Archive Order",
                    icon: <Icons.Archive />,
                    onClick: () => onArchiveOrder(order)
                });

                return (
                    <TableActionCell
                        size="small"
                        popoverMenuProps={{
                            zIndex: 1000,
                            appendTo: "window",
                            onShow: async () => {
                                // Fetch tracking info if not cached
                                if (orderTrackingCache[order._id] === undefined) {
                                    getTrackingInfo(order._id);
                                }
                            }
                        }}
                        secondaryActions={secondaryActions}
                        numOfVisibleSecondaryActions={0}
                        alwaysShowSecondaryActions={false}
                    />
                );
            },
            width: '80px',
            align: 'end' as const,
            stickyActionCell: true,
            overflow: 'hidden'
        }
    ];