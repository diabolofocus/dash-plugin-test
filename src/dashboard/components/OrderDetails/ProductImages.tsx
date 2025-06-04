// components/OrderDetails/ProductImages.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { processWixImageUrl } from '../../utils/image-processor';
import type { Order } from '../../types/Order';

interface ProductImagesProps {
    order: Order;
}

export const ProductImages: React.FC<ProductImagesProps> = ({ order }) => {
    return (
        <Box gap="8px" direction="vertical" style={{ width: '100%' }}>
            <Text size="small" className="section-title">Products:</Text>

            <Box direction="vertical" gap="16px" style={{ width: '100%' }}>
                {order.rawOrder?.lineItems?.map((item: any, index: number) => {
                    const imageUrl = processWixImageUrl(item.image);

                    return (
                        <Box key={index} direction="vertical" gap="8px" style={{ width: '100%' }}>
                            {/* Image and Details Row */}
                            <Box direction="horizontal" gap="12px" style={{ width: '100%' }}>
                                {/* Product Image */}
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={item.productName?.original || 'Product'}
                                        style={{
                                            width: '80px',
                                            height: '60px',
                                            objectFit: 'cover',
                                            borderRadius: '4px',
                                            border: '1px solid #e5e7eb',
                                            backgroundColor: '#F0F0F0',
                                            flexShrink: 0
                                        }}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const altUrl = `https://static.wixstatic.com/media/${item.image?.replace('wix:image://v1/', '').split('#')[0]}`;
                                            if (target.src !== altUrl) {
                                                target.src = altUrl;
                                            }
                                        }}
                                    />
                                ) : (
                                    <Box style={{
                                        width: '80px',
                                        height: '60px',
                                        backgroundColor: '#f3f4f6',
                                        borderRadius: '4px',
                                        border: '1px solid #e5e7eb',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Text size="tiny" secondary>No Image</Text>
                                    </Box>
                                )}

                                {/* Product Details - Name, Options, Qty, and Price */}
                                <Box direction="vertical" gap="4px" style={{ flex: 1, minWidth: 0 }}>
                                    {/* Product Name and Price Row */}
                                    <Box
                                        direction="horizontal"
                                        align="space-between"
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <Text size="tiny" weight="bold" style={{
                                            flex: 1,
                                            textAlign: 'left',
                                            paddingRight: '16px'
                                        }}>
                                            {item.productName?.original || 'Unknown Product'}
                                        </Text>
                                        <Text size="tiny" weight="bold" style={{
                                            flexShrink: 0,
                                            textAlign: 'right'
                                        }}>
                                            {item.price?.formattedAmount || '$0.00'}
                                        </Text>
                                    </Box>

                                    {/* Product Options */}
                                    {item.catalogReference?.options?.options && Object.keys(item.catalogReference.options.options).length > 0 && (
                                        <Box direction="vertical" gap="2px" align="left">
                                            {Object.entries(item.catalogReference.options.options).map(([key, value]: [string, any]) => (
                                                <Text key={key} size="tiny" secondary>
                                                    {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                </Text>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Quantity */}
                                    <Text size="tiny" secondary>
                                        Qty: {item.quantity || 1}
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    );
                })}
            </Box>

            {/* Summary Section */}
            <Box paddingTop="16px" direction="vertical" gap="8px">
                {/* Total Weight */}
                <Text size="tiny" align="left">
                    Total Weight: {(order.rawOrder?.lineItems?.reduce((total: number, item: any) => {
                        const itemWeight = item.physicalProperties?.weight || 0;
                        const quantity = item.quantity || 1;
                        return total + (itemWeight * quantity);
                    }, 0) || 0).toFixed(2)} {order.weightUnit}
                </Text>

                {/* Price Breakdown */}
                <Box direction="horizontal" align="space-between">
                    <Text size="tiny" align="left">Items:</Text>
                    <Text size="tiny">{order.rawOrder?.priceSummary.subtotal.formattedAmount}</Text>
                </Box>

                <Box direction="horizontal" align="space-between">
                    <Text size="tiny" align="left">Shipping:</Text>
                    <Text size="tiny">{order.rawOrder?.priceSummary.shipping.formattedAmount}</Text>
                </Box>

                <Box direction="horizontal" align="space-between">
                    <Text size="tiny" align="left">Tax:</Text>
                    <Text size="tiny">{order.rawOrder?.priceSummary.tax.formattedAmount}</Text>
                </Box>

                {/* Discount Information */}
                {order.rawOrder?.priceSummary?.discount?.amount &&
                    order.rawOrder.priceSummary.discount.amount > 0 && (
                        <Box direction="horizontal" align="space-between">
                            <Text size="tiny">
                                Discount:
                                {order.rawOrder?.appliedDiscounts && order.rawOrder.appliedDiscounts.length > 0 && (
                                    <Text size="tiny" secondary>
                                        {` (${order.rawOrder.appliedDiscounts.map((discount: any) =>
                                            discount.discountName || discount.name || 'Discount'
                                        ).join(', ')})`}
                                    </Text>
                                )}
                            </Text>
                            <Text size="tiny">
                                {order.rawOrder.priceSummary.discount.formattedAmount ||
                                    `${order.rawOrder.priceSummary.discount.amount} ${order.rawOrder.priceSummary.discount.currency || ''}`}
                            </Text>
                        </Box>
                    )}

                {/* Total */}
                <Box direction="horizontal" align="space-between" style={{ paddingTop: '8px' }}>
                    <Text size="tiny" align="left" weight="bold">Total:</Text>
                    <Text size="tiny" weight="bold">{order.rawOrder?.priceSummary.total.formattedAmount}</Text>
                </Box>
            </Box>
        </Box>
    );
};