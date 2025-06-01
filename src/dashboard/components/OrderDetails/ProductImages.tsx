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
        <Box gap="8px" align="left" direction="vertical" >
            <Text size="small" className="section-title">Products:</Text>

            <Box direction="horizontal" align="left" gap="12px" style={{ flexWrap: 'wrap' }}>
                {order.rawOrder?.lineItems?.map((item: any, index: number) => {
                    const imageUrl = processWixImageUrl(item.image);

                    return (
                        <Box key={index} direction="horizontal" gap="12px" style={{ width: '100%' }}>
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
                                        backgroundColor: '#F0F0F0'
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
                                    justifyContent: 'center'
                                }}>
                                    <Text size="tiny" secondary>No Image</Text>
                                </Box>
                            )}

                            <Box direction="vertical" align="left" gap="4px" style={{ flex: 1, minWidth: 0 }}>
                                <Text size="tiny" weight="bold">{item.productName?.original || 'Unknown Product'}</Text>

                                {item.catalogReference?.options?.options && Object.keys(item.catalogReference.options.options).length > 0 && (
                                    <Box direction="vertical" gap="2px" align="left">
                                        {Object.entries(item.catalogReference.options.options).map(([key, value]: [string, any]) => (
                                            <Text key={key} size="tiny" secondary>
                                                {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                            </Text>
                                        ))}
                                    </Box>
                                )}

                                <Text size="tiny">
                                    Qty: {item.quantity || 1}
                                </Text>

                                {/* {item.physicalProperties?.weight && item.physicalProperties.weight > 0 && (
                                    <Text size="tiny" secondary>
                                        {(item.physicalProperties.weight * (item.quantity || 1))} {order.weightUnit}
                                    </Text>
                                )} */}
                            </Box>
                        </Box>

                    );
                })}
            </Box>

            <Box paddingBottom="8px" style={{ borderBottom: '1px solid #e5e7eb' }}>
                <Text size="tiny" align="left" >
                    Total Weight: {(order.rawOrder?.lineItems?.reduce((total: number, item: any) => {
                        const itemWeight = item.physicalProperties?.weight || 0;
                        const quantity = item.quantity || 1;
                        return total + (itemWeight * quantity);
                    }, 0) || 0).toFixed(2)} {order.weightUnit}
                </Text>
            </Box>

            <Box paddingTop="0px" >
                <Text size="tiny" align="left">
                    Items: {order.rawOrder?.priceSummary.subtotal.formattedAmount}
                </Text>
            </Box>
            <Box paddingTop="0px" >
                <Text size="tiny" align="left">
                    Shipping: {order.rawOrder?.priceSummary.shipping.formattedAmount}
                </Text>
            </Box>

            <Box paddingTop="0px" >
                <Text size="tiny" align="left">
                    Tax: {order.rawOrder?.priceSummary.tax.formattedAmount}
                </Text>
            </Box>

            {/* Discount Information */}
            {order.rawOrder?.priceSummary?.discount?.amount &&
                order.rawOrder.priceSummary.discount.amount > 0 && (
                    <Text size="tiny">
                        Discount: {order.rawOrder.priceSummary.discount.formattedAmount ||
                            `${order.rawOrder.priceSummary.discount.amount} ${order.rawOrder.priceSummary.discount.currency || ''}`}
                        {order.rawOrder?.appliedDiscounts && order.rawOrder.appliedDiscounts.length > 0 && (
                            ` (${order.rawOrder.appliedDiscounts.map((discount: any) =>
                                discount.discountName || discount.name || 'Discount'
                            ).join(', ')})`
                        )}
                    </Text>
                )}

            <Box paddingTop="0px" >
                <Text size="tiny" align="left" weight="bold">
                    Total: {order.rawOrder?.priceSummary.total.formattedAmount}
                </Text>
            </Box>

        </Box>
    );
};