// components/FulfillmentForm/FulfillmentForm.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Button, FormField, Input, Dropdown, Loader, Text } from '@wix/design-system'; // ADD Text import
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { SHIPPING_CARRIERS } from '../../utils/constants';

export const FulfillmentForm: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();

    const { selectedOrder } = orderStore;
    const { trackingNumber, selectedCarrier, submitting } = uiStore;

    if (!selectedOrder) {
        return (
            <Box align="center" paddingTop="40px" paddingBottom="40px" gap="16px" direction="vertical">
                <Icons.Package size="48px" style={{ color: '#ccc' }} />
                <Text secondary size="small">
                    Click "Fulfill" on any order to start the fulfillment process
                </Text>
            </Box>
        );
    }

    return (
        <Box gap="24px" direction="vertical">
            <FormField label="Shipping Carrier">
                <Dropdown
                    options={SHIPPING_CARRIERS}
                    selectedId={selectedCarrier}
                    onSelect={(option) => uiStore.setSelectedCarrier(option.id as string)}
                    placeholder="Select carrier"
                    disabled={submitting}
                />
            </FormField>

            <FormField label="Tracking Number">
                <Input
                    value={trackingNumber}
                    onChange={(e) => uiStore.setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    disabled={submitting}
                />
            </FormField>

            <Box gap="12px" direction="vertical">
                <Button
                    onClick={() => orderController.fulfillOrder()}
                    disabled={submitting || !trackingNumber || !selectedCarrier}
                    prefixIcon={submitting ? <Loader size="tiny" /> : <Icons.Package />}
                    fullWidth
                >
                    {submitting
                        ? (selectedOrder.status === 'FULFILLED' ? 'Updating...' : 'Fulfilling...')
                        : (selectedOrder.status === 'FULFILLED' ? 'Update Tracking' : 'Fulfill Order')
                    }
                </Button>

                <Button
                    priority="secondary"
                    onClick={() => orderController.clearSelection()}
                    disabled={submitting}
                    fullWidth
                >
                    Cancel
                </Button>
            </Box>
        </Box>
    );
});