// components/shared/RefreshButton.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Loader } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';

export const RefreshButton: React.FC = observer(() => {
    const { uiStore } = useStores();
    const orderController = useOrderController();

    return (
        <Button
            size="small"
            border="outlined"
            onClick={() => orderController.refreshOrders()}
            disabled={uiStore.refreshing}
            prefixIcon={uiStore.refreshing ? <Loader size="tiny" /> : <Icons.Refresh />}
        >
            {uiStore.refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
    );
});