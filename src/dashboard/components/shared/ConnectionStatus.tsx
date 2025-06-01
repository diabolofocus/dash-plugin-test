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

    if (!orderStore.connectionStatus) return null;

    return (
        <Card>
            <Card.Content>
                <Box direction="horizontal" align="center" gap="16px" style={{ alignItems: 'center' }}>
                    {orderStore.connectionStatus.success ? (
                        <Icons.Time size="16px" style={{ color: '#000000' }} />
                    ) : (
                        <Icons.StatusWarningFilled style={{ color: '#f59e0b' }} />
                    )}
                    <Text size="small" align="center">
                        {orderStore.connectionStatus.message}
                    </Text>
                    {!orderStore.connectionStatus.success && (
                        <Button
                            size="tiny"
                            border="outlined"
                            onClick={() => orderController.loadOrders()}
                        >
                            Try Again
                        </Button>
                    )}
                </Box>
            </Card.Content>
        </Card>
    );
});