// components/OrdersTable/OrdersTable.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Text, Search, Button, Loader, Table, TableActionCell, TableToolbar } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate } from '../../utils/formatters';
import type { Order } from '../../types/Order';

export const OrdersTable: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        orderController.updateSearchQuery(e.target.value);
    };

    const handleSearchClear = () => {
        orderController.updateSearchQuery('');
    };

    // Test handlers for TableActionCell
    const handleViewDetails = (order: Order) => {
        console.log(`📋 View details clicked for order #${order.number}`);
    };

    const handleDuplicateOrder = (order: Order) => {
        console.log(`📄 Duplicate order clicked for order #${order.number}`);
    };

    const handleDeleteOrder = (order: Order) => {
        console.log(`🗑️ Delete order clicked for order #${order.number}`);
    };

    const handleArchiveOrder = (order: Order) => {
        console.log(`📦 Archive order clicked for order #${order.number}`);
    };

    const handleRowClick = (order: Order) => {
        orderController.selectOrder(order);
    };

    const handleFulfillClick = (order: Order) => {
        orderController.selectOrder(order);
    };

    // Define table columns
    const columns = [
        {
            title: 'Order',
            render: (order: Order) => (
                <Text size="small" weight="normal">
                    #{order.number}
                </Text>
            ),
            width: '70px',
            align: 'start' as const
        },
        {
            title: 'Date Created',
            render: (order: Order) => (
                <Text size="small">
                    {formatDate(order._createdDate)}
                </Text>
            ),
            width: '90px',
            align: 'start' as const
        },
        {
            title: 'Customer',
            render: (order: Order) => {
                // Safely extract contact details with fallbacks
                const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
                const billingContact = order.rawOrder?.billingInfo?.contactDetails;

                const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
                const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
                const customerName = `${firstName} ${lastName}`;
                const company = recipientContact?.company || billingContact?.company || order.customer.company;

                return (
                    <Box direction="vertical" gap="2px">
                        <Text size="small">{customerName}</Text>
                        {company && (
                            <Text size="tiny" secondary>{company}</Text>
                        )}
                    </Box>
                );
            },
            width: '140px',
            align: 'start' as const
        },
        {
            title: 'Payment',
            render: (order: Order) => (
                <StatusBadge status={order.paymentStatus} type="payment" />
            ),
            width: '80px',
            align: 'start' as const
        },
        {
            title: 'Fulfillment',
            render: (order: Order) => (
                <StatusBadge status={order.status} type="order" />
            ),
            width: '90px',
            align: 'start' as const
        },
        {
            title: 'Total',
            render: (order: Order) => (
                <Text size="small" weight="normal">{order.total}</Text>
            ),
            width: '70px',
            align: 'end' as const
        },
        {
            title: 'Actions',
            render: (order: Order) => (
                <TableActionCell
                    size="small"
                    secondaryActions={[
                        {
                            text: order.status === 'FULFILLED' ? 'Edit Tracking' : 'Fulfill Order',
                            icon: order.status === 'FULFILLED' ? <Icons.Edit /> : <Icons.Package />,
                            onClick: () => handleFulfillClick(order)
                        },
                        {
                            divider: true
                        },
                        {
                            text: "View Details",
                            icon: <Icons.Preview />,
                            onClick: () => handleViewDetails(order)
                        },
                        {
                            text: "Duplicate Order",
                            icon: <Icons.Duplicate />,
                            onClick: () => handleDuplicateOrder(order)
                        },
                        {
                            text: "Archive Order",
                            icon: <Icons.Archive />,
                            onClick: () => handleArchiveOrder(order)
                        },
                        {
                            text: "Delete Order",
                            icon: <Icons.Delete />,
                            onClick: () => handleDeleteOrder(order),
                            skin: "destructive"
                        }
                    ]}
                    numOfVisibleSecondaryActions={0}
                    alwaysShowSecondaryActions={false}
                    moreActionsTooltipText="More actions"
                />
            ),
            width: '80px',
            align: 'center' as const,
            stickyActionCell: true
        }
    ];

    // Prepare data for the table
    const tableData = orderStore.filteredOrders.map(order => ({
        id: order._id,
        ...order
    }));

    return (
        <Box width="70%" gap="20px" direction="vertical">
            <Box
                direction="vertical"
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden' // Changed from 'hidden' to 'visible'
                }}
            >
                {/* Header */}
                <Box
                    paddingTop="20px"
                    paddingBottom="0px"
                    paddingLeft="20px"
                    paddingRight="20px"

                    style={{ backgroundColor: 'white', borderRadius: '8px 8px 0 0' }}
                >
                    <Text size="medium" weight="bold">
                        Recent Orders ({orderStore.filteredOrders.length})
                    </Text>
                </Box>

                {/* Search */}
                <Box
                    paddingTop="20px"
                    paddingBottom="20px"
                    paddingLeft="20px"
                    paddingRight="20px"
                    style={{ backgroundColor: 'white' }}
                >
                    <Search
                        value={orderStore.searchQuery}
                        onChange={handleSearchChange}
                        placeholder="Search by order number, customer name, email, or company.."
                        expandable={false}
                    />
                </Box>

                {/* Table */}
                {orderStore.filteredOrders.length === 0 ? (
                    <Box align="center" paddingTop="40px" paddingBottom="40px">
                        <Text secondary>No orders found</Text>
                    </Box>
                ) : (
                    <Table
                        data={tableData}
                        columns={columns}
                        onRowClick={(rowData) => handleRowClick(rowData as Order)}
                        showSelection={false}
                        horizontalScroll={false}
                        rowVerticalPadding="small"
                        skin="standard"
                        isRowActive={(rowData) => orderStore.selectedOrder?._id === (rowData as Order)._id}
                        dynamicRowClass={(rowData) => {
                            const order = rowData as Order;
                            const isSelected = orderStore.selectedOrder?._id === order._id;
                            const isCanceled = order.status === 'CANCELED';

                            let className = '';
                            if (isSelected) className += 'selected-row ';
                            if (isCanceled) className += 'canceled-row ';

                            return className.trim();
                        }}
                    >
                        <Table.Content />
                    </Table>
                )}

                {/* Load More Button */}
                {orderStore.hasMorePages() && (
                    <TableToolbar removeVerticalPadding>
                        <Box align="center" padding="20px">
                            <Button
                                size="small"
                                border="outlined"
                                onClick={() => orderController.loadMoreOrders()}
                                disabled={uiStore.loadingMore}
                                prefixIcon={uiStore.loadingMore ? <Loader size="tiny" /> : undefined}
                            >
                                {uiStore.loadingMore ? 'Loading more orders...' : 'Load More Orders'}
                            </Button>
                        </Box>
                    </TableToolbar>
                )}
            </Box>

            {/* Add some CSS styles for better visual feedback */}
            <style>{`
                .selected-row {
                    background-color: #f0f8ff !important;
                }
                .canceled-row {
                    opacity: 0.6;
                }
                .canceled-row * {
                    color: #9ca3af !important;
                }
            `}</style>
        </Box>
    );
});