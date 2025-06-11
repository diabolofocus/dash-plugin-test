// components/OrderDetails/ProductImages.tsx
import React, { useState, useEffect } from 'react';
import { Box, Text } from '@wix/design-system';
import { processWixImageUrl } from '../../utils/image-processor';
import { orderTransactions } from '@wix/ecom';
import type { Order } from '../../types/Order';

interface ProductImagesProps {
    order: Order;
}

export const ProductImages: React.FC<ProductImagesProps> = ({ order }) => {
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [loadingPayment, setLoadingPayment] = useState<boolean>(false);

    // Function to fetch payment method
    const fetchPaymentMethod = async (orderId: string) => {
        try {
            setLoadingPayment(true);
            const response = await orderTransactions.listTransactionsForSingleOrder(orderId);

            // Get the first payment's method (most orders have one payment)
            const payments = response.orderTransactions?.payments || [];
            if (payments.length > 0) {
                const firstPayment = payments[0];
                let method = 'Unknown';

                if (firstPayment.giftcardPaymentDetails) {
                    method = 'Gift Card';
                }
                else if (firstPayment.regularPaymentDetails?.paymentMethod) {
                    method = firstPayment.regularPaymentDetails.paymentMethod;
                }
                setPaymentMethod(method);
            } else {
                setPaymentMethod('No payment found');
            }
        } catch (error) {
            console.error('Error fetching payment method:', error);
            setPaymentMethod('Error loading payment method');
        } finally {
            setLoadingPayment(false);
        }
    };

    // Fetch payment method when order changes
    useEffect(() => {
        if (order._id) {
            fetchPaymentMethod(order._id);
        }
    }, [order._id]);

    // Helper function to get discount display name (add this above your component return)
    const getDiscountDisplayText = (order: Order): string => {
        const appliedDiscounts = order.rawOrder?.appliedDiscounts || [];

        if (appliedDiscounts.length === 0) {
            return 'Discount:';
        }

        // Try to get coupon names first (this is the correct property according to Wix docs)
        const couponNames = appliedDiscounts
            .filter((discount: any) => discount.coupon?.name)
            .map((discount: any) => discount.coupon.name);

        if (couponNames.length > 0) {
            // 🔥 FIX: Remove duplicates using Set
            const uniqueCouponNames = [...new Set(couponNames)];
            return `Coupon: ${uniqueCouponNames.join(', ')}`;
        }

        // Fall back to other discount properties
        const discountNames = appliedDiscounts
            .map((discount: any) =>
                discount.coupon?.name ||
                discount.discountName ||
                discount.name ||
                null
            )
            .filter((name: string | null) => name && name !== 'Discount'); // Remove null and generic fallbacks

        if (discountNames.length > 0) {
            // 🔥 FIX: Remove duplicates here too
            const uniqueDiscountNames = [...new Set(discountNames)];
            return `Discount: ${uniqueDiscountNames.join(', ')}`;
        }

        // Final fallback
        return 'Discount:';
    };

    // Helper function to format payment method for display
    const formatPaymentMethod = (method: string) => {
        switch (method) {
            case 'CreditCard':
                return 'Credit Card';
            case 'PayPal':
                return 'PayPal';
            case 'Cash':
                return 'Cash';
            case 'Offline':
                return 'Offline Payment';
            case 'InPerson':
                return 'In Person';
            case 'PointOfSale':
                return 'Point of Sale';
            default:
                return method || 'Unknown';
        }
    };



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
                                <Box direction="vertical" gap="6px" style={{ flex: 1, minWidth: 0 }}>
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
                                        <Text size="tiny" weight="normal" style={{
                                            flex: 1,
                                            textAlign: 'left',
                                            paddingRight: '16px'
                                        }}>
                                            {item.productName?.original || 'Unknown Product'}
                                        </Text>
                                        <Text size="tiny" weight="normal" style={{
                                            flexShrink: 1,
                                            textAlign: 'right'
                                        }}>
                                            {item.price?.formattedAmount || '$0.00'}
                                        </Text>
                                    </Box>

                                    {/* Product Options - CHECK BOTH productOptions AND descriptionLines */}
                                    {item.productOptions && (
                                        <Box direction="vertical" gap="2px" align="left">
                                            {/* Product Variant Options */}
                                            {item.productOptions.options && Object.keys(item.productOptions.options).length > 0 && (
                                                <>
                                                    {Object.entries(item.productOptions.options).map(([key, value]: [string, any]) => (
                                                        <Text key={key} size="tiny" secondary>
                                                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </Text>
                                                    ))}
                                                </>
                                            )}

                                            {/* Custom Text Fields */}
                                            {item.productOptions.customTextFields && Object.keys(item.productOptions.customTextFields).length > 0 && (
                                                <>
                                                    {Object.entries(item.productOptions.customTextFields).map(([key, value]: [string, any]) => (
                                                        <Text key={key} size="tiny" secondary style={{ fontStyle: 'italic' }}>
                                                            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                                        </Text>
                                                    ))}
                                                </>
                                            )}
                                        </Box>
                                    )}

                                    {/* Custom SPI Product Options from descriptionLines */}
                                    {!item.productOptions && item.descriptionLines && item.descriptionLines.length > 0 && (
                                        <Box direction="vertical" gap="2px" align="left">
                                            {item.descriptionLines.map((line: any, idx: number) => (
                                                <Text key={idx} size="tiny" secondary>
                                                    {line.name?.original}: {line.plainText?.original}
                                                </Text>
                                            ))}
                                        </Box>
                                    )}

                                    {/* Final Fallback: Legacy catalogReference.options */}
                                    {!item.productOptions && !item.descriptionLines && item.catalogReference?.options?.options && Object.keys(item.catalogReference.options.options).length > 0 && (
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
                    Total weight: {(order.rawOrder?.lineItems?.reduce((total: number, item: any) => {
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

                {/* Discount Information - CLEANER VERSION */}
                {order.rawOrder?.priceSummary?.discount?.amount &&
                    order.rawOrder.priceSummary.discount.amount > 0 && (
                        <Box direction="horizontal" align="space-between">
                            <Text size="tiny">
                                {getDiscountDisplayText(order)}
                            </Text>
                            <Text size="tiny">
                                -{order.rawOrder.priceSummary.discount.formattedAmount ||
                                    `${order.rawOrder.priceSummary.discount.amount} ${order.rawOrder.priceSummary.discount.currency || ''}`}
                            </Text>
                        </Box>
                    )}


                {/* Total */}
                <Box direction="horizontal" align="space-between" style={{ paddingTop: '8px' }}>
                    <Text size="tiny" align="left" weight="bold">Total:</Text>
                    <Text size="tiny" weight="bold">{order.rawOrder?.priceSummary.total.formattedAmount}</Text>
                </Box>

                {/* Payment Method */}
                <Box direction="horizontal" align="space-between" style={{ paddingTop: '4px' }}>
                    <Text size="tiny" align="left">Payment Method:</Text>
                    <Text size="tiny">
                        {loadingPayment ? 'Loading...' : formatPaymentMethod(paymentMethod)}
                    </Text>
                </Box>
            </Box>
        </Box>
    );
};