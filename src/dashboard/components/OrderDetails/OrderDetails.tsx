// components/OrderDetails/OrderDetails.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Box, Text, Heading } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { formatDate } from '../../utils/formatters';
import { CustomerInfo } from './CustomerInfo';
import { ProductImages } from './ProductImages';
import { ShippingAddress } from './ShippingAddress';
import { FulfillmentForm } from '../FulfillmentForm/FulfillmentForm';
import { OrderActivity } from './OrderActivity';
import { StatusBadge } from '../shared/StatusBadge';
import { BillingInfo } from './BillingInfo'; // Use existing BillingInfo component
import { BillingAddress } from './BillingAddress'; // New BillingAddress component
import { ExtendedFields } from './ExtendedFields';
import { CustomAndExtendedFields } from './CustomAndExtendedFields';
import { TrackingNumberDisplay } from './TrackingNumberDisplay';
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import type { Order } from '../../types/Order';

export const OrderDetails: React.FC = observer(() => {
    const { orderStore } = useStores();
    const orderController = useOrderController();
    const { selectedOrder } = orderStore;

    if (!selectedOrder) {
        return (
            <Card>
                <Card.Header title="Select an Order" />
                <Card.Content>
                    <Box
                        align="center"
                        paddingTop="40px"
                        paddingBottom="40px"
                        gap="16px"
                        direction="vertical"
                        height="calc(100vh - 420px)"
                        style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Icons.Package size="48px" style={{ color: '#ccc' }} />
                        <Text secondary size="small" align="center">
                            Click on any order to view and fulfill it
                        </Text>
                    </Box>
                </Card.Content>
            </Card>
        );
    }

    const handleOrderLinkClick = () => {
        try {
            const order = orderStore.selectedOrder;

            if (!order) {
                console.warn('No order selected for navigation');
                return;
            }

            console.log(`Order link clicked for order #${order.number}`);

            // Use the proper ecom dashboard navigation
            dashboard.navigate(
                pages.orderDetails({
                    id: order._id
                })
            );

        } catch (error) {
            console.error('Failed to navigate to order details:', error);

            // Simple fallback: Show that details are already displayed
            alert(`Order #${selectedOrder?.number || 'unknown'} details are displayed in this panel.`);
        }
    };

    return (
        <Box gap="16px" direction="vertical">
            {/* Main Order Information Card */}
            <Card>
                {/* Order Header */}
                <Card.Header
                    title={
                        <Box direction="horizontal" align="left" gap="16px">
                            <Heading
                                size="medium"
                                weight="bold"
                                onClick={handleOrderLinkClick}
                                style={{
                                    cursor: 'pointer',
                                    color: '#3b82f6',
                                    textDecoration: 'none',
                                    flex: 1
                                }}
                            >
                                Order #{selectedOrder.number}
                            </Heading>
                            <Icons.ExternalLink
                                size="22px"
                                style={{ color: '#3b82f6', cursor: 'pointer', marginLeft: 'auto' }}
                                onClick={handleOrderLinkClick}
                            />
                        </Box>
                    }
                    subtitle={
                        <Box direction="vertical" gap="8px">
                            <Text size="small">{formatDate(selectedOrder._createdDate)}</Text>
                            <Box direction="horizontal" gap="8px" align="left">
                                <StatusBadge status={selectedOrder.paymentStatus} type="payment" />
                                <StatusBadge status={selectedOrder.status} type="order" />
                            </Box>
                        </Box>
                    }
                />
                <Card.Divider />

                <Card.Content>
                    <Box gap="24px" direction="vertical">
                        {/* Customer Information */}
                        <CustomerInfo order={selectedOrder} />

                        <Card.Divider />

                        {/* Shipping Address */}
                        <ShippingAddress order={selectedOrder} />

                        <Card.Divider />

                        {/* Billing Address Section */}
                        <BillingAddress order={selectedOrder} />

                        {/* Custom Fields and Extended Fields Section */}
                        <CustomAndExtendedFields order={selectedOrder} />

                        <Card.Divider />

                        {/* Product Images */}
                        <ProductImages order={selectedOrder} />
                    </Box>
                </Card.Content>
            </Card>

            {/* Buyer Note Card (if exists) */}
            {selectedOrder.rawOrder?.buyerNote && (
                <Card>
                    <Card.Content>
                        <Box gap="8px" direction="vertical">
                            <Text size="small" className="section-title">Buyer Note:</Text>
                            <Text
                                size="small"
                                onClick={() => orderController.copyToClipboard(selectedOrder.rawOrder.buyerNote, 'Buyer Note')}
                            >
                                {selectedOrder.rawOrder.buyerNote}
                            </Text>
                        </Box>
                    </Card.Content>
                </Card>
            )}

            {/* Fulfillment & Shipping Information Card */}
            <Card>
                <Card.Content>
                    <Box gap="24px" direction="vertical">
                        {/* Shipping Information */}
                        {selectedOrder.shippingInfo && (
                            <>
                                <Box gap="8px" direction="vertical">
                                    <Text size="medium" weight="bold">Fulfillment</Text>
                                    <Text size="small">Method: {selectedOrder.shippingInfo.title}</Text>

                                    {/* ADD TRACKING NUMBER DISPLAY HERE */}
                                    <TrackingNumberDisplay orderId={selectedOrder._id} />
                                </Box>
                            </>
                        )}

                        {/* Fulfillment Form */}
                        <FulfillmentForm />
                    </Box>
                </Card.Content>
            </Card>

            {/* Order Activity Card */}
            <Card>
                <Card.Content>
                    <OrderActivity order={selectedOrder} />
                </Card.Content>
            </Card>
        </Box>
    );
});