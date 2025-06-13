// components/shared/ActionsBar.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Loader, Box } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';


const AddNewOrderButton: React.FC = () => {

    const handleAddNewOrder = async () => {
        try {

            await dashboard.navigate(
                pages.newOrder(),
                {
                    displayMode: "overlay"
                }
            );

        } catch (error) {
            console.error('Error navigating to new order page:', error);
            dashboard.showToast({
                message: 'Failed to open new order page. Please try again.',
                type: 'error'
            });
        }
    };

    return (
        <Button
            size="medium"
            border="outlined"
            onClick={handleAddNewOrder}
            prefixIcon={<Icons.Add />}
        >
            Add New Order
        </Button>
    );
};

const RefreshButton: React.FC = observer(() => {
    const { uiStore } = useStores();
    const orderController = useOrderController();

    return (
        <Button
            size="medium"
            priority="secondary"
            onClick={() => orderController.refreshOrders()}
            disabled={uiStore.refreshing}
            prefixIcon={uiStore.refreshing ? <Loader size="tiny" /> : <Icons.Refresh />}
        >
            {uiStore.refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
    );
});

export const ActionsBar: React.FC = observer(() => {
    return (
        <Box gap="12px" direction="horizontal">
            <RefreshButton />
            <AddNewOrderButton />
        </Box>
    );
});