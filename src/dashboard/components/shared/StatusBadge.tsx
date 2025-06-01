// components/shared/StatusBadge.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import type { OrderStatus, PaymentStatus } from '../../types/Order';

interface StatusBadgeProps {
    status: OrderStatus | PaymentStatus;
    type: 'order' | 'payment';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
    const getStatusStyles = (status: string, type: string) => {
        if (type === 'order') {
            switch (status) {
                case 'FULFILLED':
                    return { backgroundColor: '#dcfce7', color: '#16a34a' };
                case 'CANCELED':
                    return { backgroundColor: '#f3f4f6', color: '#6b7280' };
                default:
                    return { backgroundColor: '#fecaca', color: '#dc2626' };
            }
        } else {
            switch (status) {
                case 'PAID':
                    return { backgroundColor: '#dcfce7', color: '#16a34a' };
                case 'FULLY_REFUNDED':
                case 'PARTIALLY_REFUNDED':
                    return { backgroundColor: '#FFFFFF', color: '#d97706', border: '1px solid #CCCCCC' };
                default:
                    return { backgroundColor: '#fecaca', color: '#dc2626' };
            }
        }
    };

    const getStatusLabel = (status: string, type: string) => {
        if (type === 'order') {
            switch (status) {
                case 'FULFILLED': return 'Fulfilled';
                case 'CANCELED': return 'Canceled';
                default: return 'Unfulfilled';
            }
        } else {
            switch (status) {
                case 'PAID': return 'Paid';
                case 'FULLY_REFUNDED': return 'Refunded';
                case 'PARTIALLY_REFUNDED': return 'Part. Refund';
                default: return 'Unpaid';
            }
        }
    };

    const styles = getStatusStyles(status, type);
    const label = getStatusLabel(status, type);

    return (
        <Box
            paddingTop="0px"
            paddingBottom="0px"
            paddingLeft="8px"
            paddingRight="8px"
            style={{
                ...styles,
                borderRadius: '2px',
                display: 'inline-block'
            }}
        >
            <Text size="tiny" style={{ color: styles.color }}>
                {label}
            </Text>
        </Box>
    );
};