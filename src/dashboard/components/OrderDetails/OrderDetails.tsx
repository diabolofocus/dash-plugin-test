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

export const OrderDetails: React.FC = observer(() => {
    const { orderStore } = useStores();
    const orderController = useOrderController();
    const { selectedOrder } = orderStore;

    if (!selectedOrder) {
        return (
            <Card>
                <Card.Header title="Select an Order" />
                <Card.Content>
                    <Box align="center" paddingTop="40px" paddingBottom="40px" gap="16px" direction="vertical">
                        <Icons.Package size="48px" style={{ color: '#ccc' }} />
                        <Text secondary size="small">
                            Click "Fulfill" on any pending order to start the fulfillment process
                        </Text>
                    </Box>
                </Card.Content>
            </Card>
        );
    }

    const handleOrderLinkClick = () => {
        const siteId = 'c114497e-2dc7-4739-804d-bda72c8bd27f'; // Replace with your actual site ID
        const orderId = selectedOrder._id;
        const orderUrl = `https://manage.wix.com/dashboard/${siteId}/ecom-platform/order-details/${orderId}`;
        window.open(orderUrl, '_blank');
    };

    return (
        <Box gap="16px"
            direction="vertical"
        >
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
                                    textDecoration: 'none'
                                }}
                            >
                                Order #{selectedOrder.number}
                            </Heading>
                            <Icons.ExternalLink
                                size="22px"
                                style={{ color: '#3b82f6', cursor: 'pointer' }}
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
                                className="clickable-info"
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
                                    <Text size="small">Cost: {selectedOrder.shippingInfo.cost}</Text>
                                </Box>

                                <Card.Divider />
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