// components/FulfillmentForm/FulfillmentForm.tsx - FIXED email status display

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Button, FormField, Input, Dropdown, Loader, Text, Checkbox } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { SHIPPING_CARRIERS } from '../../utils/constants';

export const FulfillmentForm: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();

    const { selectedOrder } = orderStore;
    const { trackingNumber, selectedCarrier, submitting } = uiStore;

    // 🔥 NEW: Email checkbox state (checked by default)
    const [sendConfirmationEmail, setSendConfirmationEmail] = useState(true);
    const [lastFulfillmentResult, setLastFulfillmentResult] = useState<any>(null);

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

    const handleFulfillOrder = async () => {
        const { selectedOrder } = orderStore;
        const { trackingNumber, selectedCarrier } = uiStore;

        if (!trackingNumber || !selectedCarrier || !selectedOrder) {
            console.warn('Missing required fulfillment data');
            return;
        }

        uiStore.setSubmitting(true);

        try {
            console.log(`🚀 Frontend: Starting fulfillOrder with email setting:`, {
                orderId: selectedOrder._id,
                orderNumber: selectedOrder.number,
                trackingNumber,
                shippingProvider: selectedCarrier,
                sendConfirmationEmail
            });

            // FIXED: Use existing OrderService instead of direct backend import
            const orderService = new (await import('../../services/OrderService')).OrderService();

            const result = await orderService.fulfillOrder({
                orderId: selectedOrder._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder.number,
                sendShippingEmail: sendConfirmationEmail // Pass email preference
            });

            setLastFulfillmentResult(result);

            if (!result.success) {
                throw new Error(result.message || 'Failed to fulfill order in Wix');
            }

            // Update order status in store
            orderStore.updateOrderStatus(selectedOrder._id, 'FULFILLED');

            // 🔥 FIXED: Show accurate email status message
            let message = selectedOrder.status === 'FULFILLED'
                ? `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`
                : `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`;

            // Check actual email status from backend response
            if (result.emailInfo) {
                if (result.emailInfo.emailSentAutomatically && result.emailInfo.customerEmail) {
                    message += ` • Email sent to ${result.emailInfo.customerEmail}`;
                } else if (result.emailInfo.emailRequested) {
                    message += ' • Email not sent (check dashboard email settings)';
                } else {
                    message += ' • No email requested';
                }
            } else {
                // Fallback for cases where emailInfo is missing
                if (sendConfirmationEmail) {
                    message += ' • Email status unknown (check dashboard settings)';
                } else {
                    message += ' • No email sent';
                }
            }

            console.log('✅ Fulfillment completed:', message);

            // Clear form
            orderController.clearSelection();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Fulfillment failed:', errorMessage);

            setLastFulfillmentResult({
                success: false,
                error: errorMessage,
                emailInfo: {
                    emailRequested: sendConfirmationEmail,
                    emailSentAutomatically: false,
                    note: 'Email not sent due to fulfillment failure'
                }
            });
        } finally {
            uiStore.setSubmitting(false);
        }
    };

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

            {/* Email confirmation checkbox */}
            <Box gap="8px" direction="vertical" >
                <Checkbox
                    checked={sendConfirmationEmail}
                    onChange={() => setSendConfirmationEmail(!sendConfirmationEmail)}
                    disabled={submitting}
                    size="small"
                >
                    Send confirmation email to customer
                </Checkbox>
                {sendConfirmationEmail && (
                    <Text size="tiny" secondary>
                        💡 Make sure email settings are enabled in your Wix dashboard (Checkout → Edit Emails)
                    </Text>
                )}
            </Box>

            {/* Show email result from last fulfillment */}
            {lastFulfillmentResult?.emailInfo && (
                <Box
                    padding="12px"
                    backgroundColor={lastFulfillmentResult.success ? '#f0f9ff' : '#fef2f2'}
                    style={{
                        borderRadius: '4px',
                        border: `1px solid ${lastFulfillmentResult.success ? '#bfdbfe' : '#fecaca'}`
                    }}
                >
                    <Box gap="8px" direction="vertical">
                        <Text size="small" weight="bold">
                            {lastFulfillmentResult.emailInfo.emailSentAutomatically ? '✅ Email Status' : '⚠️ Email Status'}
                        </Text>
                        <Text size="tiny">
                            {lastFulfillmentResult.emailInfo.note}
                        </Text>
                        {lastFulfillmentResult.emailInfo.customerEmail && (
                            <Text size="tiny">
                                📧 Customer: {lastFulfillmentResult.emailInfo.customerEmail}
                            </Text>
                        )}
                    </Box>
                </Box>
            )}

            <Box gap="12px" direction="vertical">
                <Button
                    onClick={handleFulfillOrder}
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