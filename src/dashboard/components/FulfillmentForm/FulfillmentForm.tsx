// components/FulfillmentForm/FulfillmentForm.tsx 

import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Button, FormField, Input, Dropdown, Loader, Text, Checkbox, TextButton } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { SHIPPING_CARRIERS } from '../../utils/constants';
import { dashboard } from '@wix/dashboard';

interface FulfillmentResponse {
    success: boolean;
    message?: string;
    error?: string;
    method?: string;
    isTrackingUpdate?: boolean;
    emailInfo?: {
        emailRequested: boolean;
        emailSentAutomatically: boolean;
        emailSent?: boolean;
        customerEmail?: string;
        note: string;
        isTrackingUpdate?: boolean;
    };
}

export const FulfillmentForm: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();

    const { selectedOrder } = orderStore;
    const { trackingNumber, selectedCarrier, submitting, trackingUrl } = uiStore;

    const generateTrackingUrl = (carrier: string, trackingNumber: string): string => {
        const trackingUrls: Record<string, string> = {
            'fedex': `https://www.fedex.com/apps/fedextrack/?action=track&trackingnumber=${trackingNumber}`,
            'ups': `https://www.ups.com/track?track=yes&trackNums=${trackingNumber}`,
            'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
            'dhl': `https://www.logistics.dhl/global-en/home/tracking.html?tracking-id=${trackingNumber}`,
            'canadaPost': `https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=${trackingNumber}`
        };

        return trackingUrls[carrier] || '';
    };

    const isOrderFulfilled = selectedOrder?.status === 'FULFILLED';

    // Always set to true and don't allow changes
    const sendConfirmationEmail = true;

    const [lastFulfillmentResult, setLastFulfillmentResult] = useState<any>(null);

    const [showEmailNote, setShowEmailNote] = useState(false);
    const [emailNoteMessage, setEmailNoteMessage] = useState('');

    useEffect(() => {
        if (selectedOrder) {
            setLastFulfillmentResult(null);
            setShowEmailNote(false);
            setEmailNoteMessage('');

            if (!selectedCarrier && SHIPPING_CARRIERS.length > 0) {
                const firstCarrier = SHIPPING_CARRIERS[0].id as string;
                uiStore.setSelectedCarrier(firstCarrier);
                console.log(`🚛 Auto-selected first carrier: ${firstCarrier}`);
            }
        }
    }, [selectedOrder?._id, selectedCarrier]);

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
        const { trackingNumber, selectedCarrier, trackingUrl } = uiStore;

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
                trackingUrl,
                sendConfirmationEmail: true // Always true
            });

            const orderService = new (await import('../../services/OrderService')).OrderService();

            const result = await orderService.fulfillOrder({
                orderId: selectedOrder._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder.number,
                trackingUrl,
                sendShippingEmail: true // Always true
            }) as FulfillmentResponse;

            setLastFulfillmentResult(result);

            if (!result.success) {
                throw new Error(result.message || 'Failed to fulfill order in Wix');
            }

            orderStore.updateOrderStatus(selectedOrder._id, 'FULFILLED');

            let message = result.isTrackingUpdate
                ? `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`
                : `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`;

            if (result.emailInfo) {
                if (result.emailInfo.emailSentAutomatically && result.emailInfo.customerEmail) {
                    message += ` • Email sent to ${result.emailInfo.customerEmail}`;
                } else if (result.emailInfo.emailRequested) {
                    message += ' • Email not sent (check dashboard email settings)';
                } else {
                    message += ' • No email requested';
                }
            } else {
                message += ' • Email status unknown (check dashboard settings)';
            }

            console.log('✅ Fulfillment completed:', message);

            if (result.isTrackingUpdate) {
                dashboard.showToast({
                    message: `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`,
                    type: 'success',
                    timeout: 'normal'
                });
            } else {
                dashboard.showToast({
                    message: `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`,
                    type: 'success',
                    timeout: 'normal'
                });
            }

            setEmailNoteMessage('Shipping confirmation sent automatically by Wix');
            setShowEmailNote(true);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error('❌ Fulfillment failed:', errorMessage);

            setLastFulfillmentResult({
                success: false,
                error: errorMessage,
                emailInfo: {
                    emailRequested: true,
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
            <FormField label="Tracking Information">
                <Box
                    direction="horizontal"
                    gap="6px"
                    width="100%"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '100px 1fr',
                        gap: '6px'
                    }}
                >
                    <Dropdown
                        options={SHIPPING_CARRIERS}
                        selectedId={selectedCarrier}
                        onSelect={(option) => {
                            uiStore.setSelectedCarrier(option.id as string);
                            if (trackingNumber && option.id) {
                                const autoUrl = generateTrackingUrl(option.id as string, trackingNumber);
                                uiStore.setTrackingUrl(autoUrl);
                            }
                        }}
                        placeholder="Select carrier"
                        disabled={submitting}
                        minWidthPixels="120px"
                    />
                    <Input
                        value={trackingNumber}
                        onChange={(e) => {
                            uiStore.setTrackingNumber(e.target.value);
                            if (e.target.value && selectedCarrier) {
                                const autoUrl = generateTrackingUrl(selectedCarrier, e.target.value);
                                uiStore.setTrackingUrl(autoUrl);
                            }
                        }}
                        placeholder="Enter tracking number"
                        disabled={submitting}
                    />
                </Box>
            </FormField>

            {/* Tracking URL Field */}
            <FormField label="Tracking URL">
                <Input
                    value={trackingUrl || ''}
                    onChange={(e) => uiStore.setTrackingUrl(e.target.value)}
                    placeholder="Auto-generated or enter custom URL"
                    disabled={submitting}
                />
            </FormField>

            {/* Always checked and disabled email confirmation checkbox */}
            <Box gap="8px" direction="vertical">
                <Checkbox
                    checked={true}
                    onChange={() => { }}
                    disabled={true}
                    size="small"
                >
                    Send confirmation email to customer
                </Checkbox>

                {/* Updated helper text */}
                <Text size="tiny" secondary>
                    Shipping confirmation Email sent automatically by Wix
                </Text>
            </Box>

            {/* Email confirmation note based on checkbox state */}
            {showEmailNote && (
                <Box
                    padding="12px"
                    backgroundColor="#f0f9ff"
                    style={{
                        borderRadius: '4px',
                        border: '1px solid #bfdbfe'
                    }}
                >
                    <Text size="tiny">
                        {emailNoteMessage}
                    </Text>
                </Box>
            )}

            <Box gap="12px" direction="vertical">
                <Button
                    onClick={handleFulfillOrder}
                    disabled={submitting || !trackingNumber || !selectedCarrier}
                    suffixIcon={submitting ? <Loader size="tiny" /> : <Icons.Package />}
                    fullWidth
                >
                    {submitting
                        ? (isOrderFulfilled ? 'Updating...' : 'Fulfilling...')
                        : (isOrderFulfilled ? 'Update Tracking' : 'Fulfill Order')
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