// components/shared/ConnectionStatus.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Box, Text, Button } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';

export const ConnectionStatus: React.FC = observer(() => {
    const { orderStore } = useStores();
    const orderController = useOrderController();

    // Don't show anything if disconnected or no orders
    if (orderStore.connectionStatus === 'disconnected' || orderStore.orders.length === 0) {
        return null;
    }

    const getStatusIcon = () => {
        switch (orderStore.connectionStatus) {
            case 'connected':
                return <Icons.Time size="16px" style={{ color: '#000000' }} />;
            case 'connecting':
                return <Icons.Time size="16px" style={{ color: '#3b82f6' }} />;
            case 'error':
                return <Icons.StatusWarningFilled size="16px" style={{ color: '#ef4444' }} />;
            default:
                return <Icons.StatusWarningFilled size="16px" style={{ color: '#f59e0b' }} />;
        }
    };

    const getStatusMessage = () => {
        const pendingCount = orderStore.unfulfilledOrdersCount;
        const totalCount = orderStore.orders.length;

        switch (orderStore.connectionStatus) {
            case 'connected':
                if (pendingCount === 0) {
                    return `All orders are fulfilled!`;
                }
                return `${pendingCount} pending fulfillment`;
            case 'connecting':
                return 'Loading orders...';
            case 'error':
                return 'Failed to load orders. Showing demo data.';
            default:
                return 'Connection status unknown';
        }
    };

    const getStatusColor = () => {
        switch (orderStore.connectionStatus) {
            case 'connected':
                return orderStore.unfulfilledOrdersCount === 0 ? '#22c55e' : '#3b82f6';
            case 'connecting':
                return '#6b7280';
            case 'error':
                return '#ef4444';
            default:
                return '#f59e0b';
        }
    };

    return (
        <Card>
            <Card.Content>
                <Box direction="horizontal" align="center" gap="16px" style={{ alignItems: 'center' }}>
                    {getStatusIcon()}
                    <Box direction="vertical" gap="4px" style={{ flex: 1 }}>
                        <Text size="small" style={{ color: getStatusColor() }}>
                            {getStatusMessage()}
                        </Text>

                    </Box>
                    {orderStore.connectionStatus === 'error' && (
                        <Button
                            size="tiny"
                            border="outlined"
                            onClick={() => orderController.refreshOrders()}
                        >
                            Try Again
                        </Button>
                    )}
                </Box>
            </Card.Content>
        </Card>
    );
});