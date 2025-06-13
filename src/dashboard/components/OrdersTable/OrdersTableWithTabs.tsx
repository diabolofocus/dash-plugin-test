// components/OrdersTable/OrdersTableWithTabs.tsx
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Tabs, Text, Table, TableToolbar, Heading, Tag } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { OrdersTable } from './OrdersTable';
import { processWixImageUrl } from '../../utils/image-processor';

// Define the structure for a preparation item
interface PreparationItem {
    id: string;
    productId?: string;
    productName: string;
    productOptions: string; // Serialized options for grouping
    imageUrl: string;
    rawImageUrl: string; // Store original image URL for fallback
    totalQuantity: number;
    orders: Array<{
        orderNumber: string;
        orderId: string;
        quantity: number;
        customerName: string;
        orderTimestamp: number; // For sorting
    }>;
    optionsDisplay: any; // For display purposes
    mostRecentOrderDate: number; // For sorting by most recent order
}

export const OrdersTableWithTabs: React.FC = observer(() => {
    const { orderStore } = useStores();
    const [activeTabId, setActiveTabId] = useState<string | number>(1);

    const tabItems = [
        { id: 1, title: 'Order List' },
        { id: 2, title: 'Packing List' }
    ];

    // Function to get product options as a string for grouping
    const getProductOptionsKey = (item: any): string => {
        let options: any = {};

        // Extract options from multiple possible locations (same as ProductImages component)
        if (item.productOptions?.options) {
            options = { ...options, ...item.productOptions.options };
        }
        if (item.productOptions?.customTextFields) {
            options = { ...options, ...item.productOptions.customTextFields };
        }
        if (item.descriptionLines?.length > 0) {
            item.descriptionLines.forEach((line: any) => {
                if (line.name?.original && line.plainText?.original) {
                    options[line.name.original] = line.plainText.original;
                }
            });
        }
        if (item.catalogReference?.options?.options) {
            options = { ...options, ...item.catalogReference.options.options };
        }

        return JSON.stringify(options);
    };

    // Function to extract preparation items from unfulfilled orders
    const getPreparationItems = (): PreparationItem[] => {
        const unfulfilledOrders = orderStore.orders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        );

        const productMap = new Map<string, PreparationItem>();

        unfulfilledOrders.forEach(order => {
            const items = order.rawOrder?.lineItems || [];
            const orderTimestamp = new Date(order._createdDate).getTime();

            items.forEach((item: any) => {
                const productName = item.productName?.original || 'Unknown Product';
                const optionsKey = getProductOptionsKey(item);
                const mapKey = `${item.catalogReference?.catalogItemId || 'unknown'}-${optionsKey}`;

                // Get customer name
                const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
                const billingContact = order.rawOrder?.billingInfo?.contactDetails;
                const customerName = `${recipientContact?.firstName || billingContact?.firstName || ''} ${recipientContact?.lastName || billingContact?.lastName || ''}`.trim() || 'Unknown Customer';

                // Add extensive logging for image debugging
                console.log('🖼️ Preparation Tab - Processing item for product:', productName);
                console.log('🖼️ Raw item.image:', item.image);
                console.log('🖼️ Item object keys:', Object.keys(item));

                if (productMap.has(mapKey)) {
                    // Add to existing product
                    const existing = productMap.get(mapKey)!;
                    existing.totalQuantity += item.quantity || 1;
                    existing.orders.push({
                        orderNumber: order.number,
                        orderId: order._id,
                        quantity: item.quantity || 1,
                        customerName,
                        orderTimestamp
                    });
                    // Update most recent order date if this order is newer
                    if (orderTimestamp > existing.mostRecentOrderDate) {
                        existing.mostRecentOrderDate = orderTimestamp;
                    }
                } else {
                    // Create new product entry
                    const optionsForDisplay = JSON.parse(optionsKey);

                    // Use the same image processing as ProductImages component
                    const imageUrl = processWixImageUrl(item.image);
                    console.log('🖼️ Processed imageUrl:', imageUrl);
                    console.log('🖼️ processWixImageUrl function result for', item.image, '->', imageUrl);

                    productMap.set(mapKey, {
                        id: mapKey,
                        productId: item.catalogReference?.catalogItemId,
                        productName,
                        productOptions: optionsKey,
                        imageUrl,
                        rawImageUrl: item.image, // Store the original raw image URL
                        totalQuantity: item.quantity || 1,
                        optionsDisplay: optionsForDisplay,
                        mostRecentOrderDate: orderTimestamp,
                        orders: [{
                            orderNumber: order.number,
                            orderId: order._id,
                            quantity: item.quantity || 1,
                            customerName,
                            orderTimestamp
                        }]
                    });
                }
            });
        });

        // Sort by most recent order date (newest first), then by product name
        return Array.from(productMap.values()).sort((a, b) => {
            if (b.mostRecentOrderDate !== a.mostRecentOrderDate) {
                return b.mostRecentOrderDate - a.mostRecentOrderDate;
            }
            return a.productName.localeCompare(b.productName);
        });
    };

    const preparationItems = getPreparationItems();

    const preparationColumns = [
        {
            title: 'Product',
            render: (item: PreparationItem) => (
                <Box direction="horizontal" gap="12px" align="left">
                    {/* Product Image - using EXACT same approach as ProductImages component */}
                    {item.imageUrl ? (
                        <img
                            src={item.imageUrl}
                            alt={item.productName}
                            style={{
                                width: '80px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#F0F0F0',
                                flexShrink: 0,
                                alignSelf: 'flex-start'
                            }}
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                console.log('🖼️ Image load error for:', target.src);
                                console.log('🖼️ Raw image URL was:', item.rawImageUrl);
                                // Use EXACT same fallback logic as ProductImages component
                                const altUrl = `https://static.wixstatic.com/media/${item.rawImageUrl?.replace('wix:image://v1/', '').split('#')[0]}`;
                                console.log('🖼️ Trying fallback URL:', altUrl);
                                if (target.src !== altUrl) {
                                    target.src = altUrl;
                                } else {
                                    console.log('🖼️ Fallback also failed, showing placeholder');
                                }
                            }}
                            onLoad={() => {
                                console.log('🖼️ Image loaded successfully:', item.imageUrl);
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
                            flexShrink: 0,
                            alignSelf: 'flex-start'
                        }}>
                            <Text size="tiny" secondary>No Image</Text>
                        </Box>
                    )}

                    {/* Product Details */}
                    <Box direction="vertical" gap="4px" style={{ flex: 1 }}>
                        <Text size="small" weight="normal">{item.productName}</Text>
                        {Object.keys(item.optionsDisplay).length > 0 && (
                            <Box direction="vertical" gap="2px">
                                {Object.entries(item.optionsDisplay).map(([key, value]: [string, any]) => (
                                    <Text key={key} size="tiny" secondary>
                                        {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                    </Text>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Box>
            ),
            width: '40%',
            minWidth: '200px'
        },
        {
            title: 'Quantity',
            render: (item: PreparationItem) => (
                <Box align="center" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <Text size="small" weight="normal">{item.totalQuantity}</Text>
                </Box>
            ),
            width: '10%',
            minWidth: '80px'
        },
        {
            title: 'Orders',
            render: (item: PreparationItem) => (
                <Box direction="vertical" gap="4px" align="left" style={{ width: '100%' }}>
                    {/* Sort orders by most recent first */}
                    {item.orders
                        .sort((a, b) => b.orderTimestamp - a.orderTimestamp)
                        .map((order, index) => (
                            <Box key={index} direction="horizontal" gap="6px" align="center" style={{ justifyContent: 'flex-start' }}>
                                <Tag id={`order-tag-${order.orderId}-${order.orderNumber}`} size="tiny" theme="standard">
                                    #{order.orderNumber}
                                </Tag>
                                <Box style={{ display: 'flex', alignItems: 'center' }}>
                                    <Text size="tiny" secondary>
                                        Qty: {order.quantity}
                                    </Text>
                                </Box>
                            </Box>
                        ))}
                </Box>
            ),
            width: '30%',
            minWidth: '200px'
        },
        {
            title: 'Customers',
            render: (item: PreparationItem) => (
                <Box direction="vertical" gap="2px">
                    {/* Sort customers by most recent order first */}
                    {item.orders
                        .sort((a, b) => b.orderTimestamp - a.orderTimestamp)
                        .map((order, index) => (
                            <Text key={index} size="small">
                                {order.customerName}
                            </Text>
                        ))}
                </Box>
            ),
            width: '20%',
            minWidth: '120px'
        }
    ];

    const renderOrdersTab = () => (
        <OrdersTable />
    );

    const renderPreparationTab = () => (
        <Box direction="vertical" gap="0" paddingBottom="10px" style={{ backgroundColor: '#ffffff', borderRadius: '8px' }}>
            {/* TableToolbar */}
            <TableToolbar>
                <TableToolbar.ItemGroup position="start">
                    <TableToolbar.Item>
                        <TableToolbar.Title>
                            Products to Pack ({preparationItems.reduce((total, item) => total + item.totalQuantity, 0)})
                        </TableToolbar.Title>
                    </TableToolbar.Item>
                </TableToolbar.ItemGroup>
            </TableToolbar>

            {/* Table Content */}
            <div style={{ width: '100%', overflowX: 'auto' }}>
                {preparationItems.length === 0 ? (
                    <Box
                        align="center"
                        paddingTop="40px"
                        paddingBottom="40px"
                        gap="16px"
                        direction="vertical"
                        style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e5e7eb',
                            borderBottom: 'none'
                        }}
                    >
                        <Icons.Check size="48px" style={{ color: '#4caf50' }} />
                        <Text size="medium" weight="bold">All orders fulfilled!</Text>
                        <Text secondary size="small" align="center">
                            No products need preparation at this time
                        </Text>
                    </Box>
                ) : (
                    <Table
                        data={preparationItems}
                        columns={preparationColumns}
                        rowVerticalPadding="medium"
                        horizontalScroll
                    >
                        <Table.Titlebar />
                        <div
                            className="preparation-table-container"
                            style={{
                                maxHeight: 'calc(100vh - 194px)',
                                overflowY: 'auto',
                                overflowX: 'hidden'
                            }}
                        >
                            <Table.Content titleBarVisible={false} />
                        </div>
                    </Table>
                )}
            </div>
        </Box>
    );

    return (
        <Box gap="16px" direction="vertical">
            {/* Tabs */}
            <Tabs
                items={tabItems}
                type="compactSide"
                activeId={activeTabId}
                onClick={(tab) => setActiveTabId(tab.id as number)}
            />

            {/* Tab Content */}
            {activeTabId === 1 && renderOrdersTab()}
            {activeTabId === 2 && renderPreparationTab()}
        </Box>
    );
});