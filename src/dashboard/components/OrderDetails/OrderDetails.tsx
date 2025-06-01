// components/OrderDetails/OrderDetails.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Box, Text } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController'; // ADD THIS IMPORT
import { formatDate } from '../../utils/formatters';
import { CustomerInfo } from './CustomerInfo';
import { ProductImages } from './ProductImages';
import { ShippingAddress } from './ShippingAddress';
import { FulfillmentForm } from '../FulfillmentForm/FulfillmentForm';

export const OrderDetails: React.FC = observer(() => {
    const { orderStore } = useStores();
    const orderController = useOrderController(); // ADD THIS LINE
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
        <Card>
            <Box style={{ borderBottom: '1px solid #e5e7eb' }}>
                <Card.Header
                    title={
                        <Box direction="horizontal" align="left" gap="16px">
                            <Text
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
                            </Text>
                            <Icons.ExternalLink
                                size="22px"
                                style={{ color: '#3b82f6', cursor: 'pointer' }}
                                onClick={handleOrderLinkClick}
                            />
                        </Box>
                    }
                    subtitle={
                        <Text size="small">{formatDate(selectedOrder._createdDate)}</Text>
                    }
                />
            </Box>

            <Card.Content>
                <Box gap="24px" direction="vertical">

                    {/* Customer Information */}
                    <CustomerInfo order={selectedOrder} />

                    {/* Shipping Address */}
                    <ShippingAddress order={selectedOrder} />

                    {/* Product Images */}
                    <ProductImages order={selectedOrder} />

                    {/* Shipping Information */}
                    {selectedOrder.shippingInfo && (
                        <Box gap="8px" direction="vertical">
                            <Text size="small" className="section-title">Shipping Information:</Text>
                            <Text size="small">Method: {selectedOrder.shippingInfo.title}</Text>
                            <Text size="small">Carrier ID: {selectedOrder.shippingInfo.carrierId}</Text>
                        </Box>
                    )}

                    {/* Buyer Note */}
                    {selectedOrder.rawOrder?.buyerNote && (
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
                    )}

                    {/* Fulfillment Form */}
                    <FulfillmentForm />
                </Box>
            </Card.Content>
        </Card>
    );
});