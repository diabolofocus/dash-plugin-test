// components/OrdersTable/OrdersTable.tsx - UPDATED with Advanced Search
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
    Card,
    Text,
    Dropdown,
    Search,
    Button,
    Loader,
    Table,
    TableActionCell,
    TableToolbar,
    Box,
    Tooltip
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { StatusBadge } from '../shared/StatusBadge';
import { formatDate } from '../../utils/formatters';
import type { Order } from '../../types/Order';
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { orders } from '@wix/ecom';
import { orderTransactions } from '@wix/ecom';
import { orderFulfillments } from '@wix/ecom';

export const OrdersTable: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
    const containerRef = useRef(null);
    const [container, setContainer] = useState(null);

    // Add tracking info cache
    const [orderTrackingCache, setOrderTrackingCache] = useState<Record<string, { trackingNumber?: string; trackingLink?: string } | null>>({});

    // Search state
    const [searchValue, setSearchValue] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isStatusFilterLoading, setIsStatusFilterLoading] = useState(false);


    const loadMoreOrders = useCallback(async () => {
        // If we're displaying search results and there are more search results available
        if (orderStore.isDisplayingSearchResults && orderStore.searchHasMore) {
            await orderController.loadMoreSearchResults();
        } else if (!orderStore.isLoadingMore && orderStore.hasMoreOrders && !orderStore.isDisplayingSearchResults) {
            // Regular load more orders if not in search mode
            await orderController.loadMoreOrders();
        }
    }, [orderStore, orderController]);

    // Initialize container ref
    useEffect(() => {
        setContainer(containerRef);
    }, []);

    // Sync search value with store
    useEffect(() => {
        setSearchValue(orderStore.searchQuery);
    }, [orderStore.searchQuery]);

    // Update search indicator
    useEffect(() => {
        setIsSearching(uiStore.searching);
    }, [uiStore.searching]);

    // Helper function to get or fetch tracking info
    const getTrackingInfo = async (orderId: string) => {
        // Return cached result if available
        if (orderTrackingCache[orderId] !== undefined) {
            return orderTrackingCache[orderId];
        }

        try {
            const response = await orderFulfillments.listFulfillmentsForSingleOrder(orderId);
            const fulfillments = response.orderWithFulfillments?.fulfillments || [];

            // Get the most recent fulfillment with tracking info
            const withTracking = fulfillments
                .filter(f => f.trackingInfo?.trackingNumber)
                .sort((a, b) => new Date(b._createdDate).getTime() - new Date(a._createdDate).getTime())[0];

            const trackingInfo = withTracking?.trackingInfo || null;

            // Cache the result
            setOrderTrackingCache(prev => ({
                ...prev,
                [orderId]: trackingInfo
            }));

            return trackingInfo;
        } catch (error) {
            console.error('Error fetching tracking info for order:', orderId, error);
            // Cache null result to avoid repeated failed requests
            setOrderTrackingCache(prev => ({
                ...prev,
                [orderId]: null
            }));
            return null;
        }
    };

    // Handler for track order action
    const handleTrackOrder = async (order: Order) => {
        const trackingInfo = await getTrackingInfo(order._id);
        if (trackingInfo?.trackingLink) {
            window.open(trackingInfo.trackingLink, '_blank', 'noopener,noreferrer');
        }
    };

    const statusFilterOptions = [
        { id: 'unfulfilled', value: 'Unfulfilled' },
        { id: 'fulfilled', value: 'Fulfilled' },
        { id: 'unpaid', value: 'Unpaid' },
        { id: 'refunded', value: 'Refunded' },
        { id: 'canceled', value: 'Canceled' },
        { id: 'archived', value: 'Archived' }
    ];

    // UPDATED: Enhanced search handler with advanced search
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchValue(newValue);

        // Use the advanced search from OrderController
        orderController.updateSearchQuery(newValue, selectedStatusFilter ? [selectedStatusFilter] : undefined);
    };

    const handleSearchClear = () => {
        setSearchValue('');
        orderController.clearSearch();
    };

    // REPLACE the handleStatusFilterChange function with this:
    const handleStatusFilterChange = async (option: any) => {
        setIsStatusFilterLoading(true); // Start loading
        setSelectedStatusFilter(option?.id || null);

        try {
            // Perform full dataset filtering via API
            if (option?.id) {
                await orderController.performStatusFilter(option.id);
            } else {
                // Clear filter - reload original orders
                orderController.clearStatusFilter();
            }
        } finally {
            setIsStatusFilterLoading(false); // Stop loading
        }
    };

    const handleViewOrder = (order: Order) => {
        try {
            if (!order?._id) {
                console.error('Order ID is missing');
                return;
            }

            const orderId = String(order._id).trim();
            console.log(`Opening order details for Order #${order.number}, ID: ${orderId}`);

            dashboard.navigate(
                pages.orderDetails({
                    id: orderId
                }),
                {
                    displayMode: "overlay"
                }
            );

        } catch (error) {
            console.error('Navigation failed:', error);
        }
    };

    // ... (keep all existing print, archive, and other handler methods) ...


    const handleRowClick = (order: Order, event?: any) => {
        // Remove all previous selections
        document.querySelectorAll('[data-selected-order]').forEach(row => {
            row.removeAttribute('data-selected-order');
        });

        // Get the clicked row element and mark it as selected
        const clickedRow = event?.currentTarget?.closest('tr');
        if (clickedRow) {
            clickedRow.setAttribute('data-selected-order', order._id);
        }

        // Update store for other functionality (OrderDetails panel)
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
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Date Created',
            render: (order: Order) => (
                <Text size="small">
                    {formatDate(order._createdDate)}
                </Text>
            ),
            width: '90px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Customer',
            render: (order: Order) => {
                const recipientContact = order.rawOrder?.recipientInfo?.contactDetails;
                const billingContact = order.rawOrder?.billingInfo?.contactDetails;

                const firstName = recipientContact?.firstName || billingContact?.firstName || order.customer.firstName || 'Unknown';
                const lastName = recipientContact?.lastName || billingContact?.lastName || order.customer.lastName || 'Customer';
                const customerName = `${firstName} ${lastName}`;
                const company = recipientContact?.company || billingContact?.company || order.customer.company;

                return (
                    <Box direction="vertical" gap="2px">
                        <Text size="small" ellipsis>{customerName}</Text>
                        {company && (
                            <Text size="tiny" secondary ellipsis>{company}</Text>
                        )}
                    </Box>
                );
            },
            width: '140px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Payment',
            render: (order: Order) => (
                <StatusBadge status={order.paymentStatus} type="payment" />
            ),
            width: '80px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Fulfillment',
            render: (order: Order) => (
                <StatusBadge status={order.status} type="order" />
            ),
            width: '100px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Total',
            render: (order: Order) => (
                <Text size="small">{order.total}</Text>
            ),
            width: '70px',
            align: 'start' as const,
            overflow: 'hidden'
        },
        {
            title: 'Actions',
            render: (order: Order) => {
                const cachedTracking = orderTrackingCache[order._id];
                const hasTracking = cachedTracking?.trackingNumber;

                const secondaryActions = [
                    {
                        text: "View Order",
                        icon: <Icons.Order />,
                        onClick: () => handleViewOrder(order)
                    }
                ];

                if (hasTracking) {
                    secondaryActions.push({
                        text: "Track Order",
                        icon: <Icons.ExternalLink />,
                        onClick: () => handleTrackOrder(order)
                    });
                }

                // Add remaining actions (implement these methods from your existing code)
                // secondaryActions.push({
                //     text: "Print Order",
                //     icon: <Icons.Print />,
                //     onClick: () => handlePrintOrder(order)
                // });

                // secondaryActions.push({ divider: true } as any);

                // secondaryActions.push({
                //     text: "Archive Order",
                //     icon: <Icons.Archive />,
                //     onClick: () => handleArchiveOrder(order)
                // });

                return (
                    <TableActionCell
                        size="small"
                        popoverMenuProps={{
                            zIndex: 1000,
                            appendTo: "window",
                            onShow: () => {
                                if (orderTrackingCache[order._id] === undefined) {
                                    getTrackingInfo(order._id);
                                }
                            }
                        }}
                        secondaryActions={secondaryActions}
                        numOfVisibleSecondaryActions={0}
                        alwaysShowSecondaryActions={false}
                    />
                );
            },
            width: '80px',
            align: 'end' as const,
            stickyActionCell: true,
            overflow: 'hidden'
        }
    ];

    // UPDATED: Use filtered orders (now includes search results)
    const statusFilteredOrders = orderStore.filteredOrders; const tableData = statusFilteredOrders.map(order => ({
        id: order._id,
        ...order
    }));

    // Move this useEffect to after the statusFilteredOrders and tableData declarations
    useEffect(() => {
        if (orderStore.selectedOrder) {
            setTimeout(() => {
                document.querySelectorAll('[data-selected-order]').forEach(row => {
                    row.removeAttribute('data-selected-order');
                });

                const rows = document.querySelectorAll('tbody tr');
                rows.forEach((row, index) => {
                    const orderData = statusFilteredOrders[index];
                    if (orderData && orderData._id === orderStore.selectedOrder._id) {
                        row.setAttribute('data-selected-order', orderData._id);
                    }
                });
            }, 100);
        }
    }, [orderStore.selectedOrder, statusFilteredOrders]);

    // Calculate display statistics
    const searchStats = orderStore.searchStats;
    const hasActiveSearch = orderStore.hasActiveSearch;
    const isDisplayingSearchResults = orderStore.isDisplayingSearchResults;

    return (
        <Card>
            <TableToolbar>
                <TableToolbar.ItemGroup position="start">
                    <TableToolbar.Item>
                        <TableToolbar.Title>
                            Recent Orders
                        </TableToolbar.Title>
                    </TableToolbar.Item>
                    {orderStore.loadingStatus && (
                        <TableToolbar.Item>
                            <TableToolbar.Label>
                                {orderStore.loadingStatus}
                            </TableToolbar.Label>
                        </TableToolbar.Item>
                    )}
                    {/* {isSearching && (
                        <TableToolbar.Item>
                            <Box direction="horizontal" align="center" gap="4px">
                                <Loader size="tiny" />
                                <Text size="tiny" secondary>Searching...</Text>
                            </Box>
                        </TableToolbar.Item>
                    )} */}
                </TableToolbar.ItemGroup>
                <TableToolbar.ItemGroup position="end">
                    {/* {hasActiveSearch && (
                        <TableToolbar.Item>
                            <Button
                                priority="secondary"
                                size="small"
                                onClick={handleSearchClear}
                                prefixIcon={<Icons.X />}
                            >
                                Clear Search
                            </Button>
                        </TableToolbar.Item>
                    )} */}
                    <TableToolbar.Item>
                        <Dropdown
                            placeholder="Filter by status"
                            clearButton
                            onClear={() => handleStatusFilterChange(null)}
                            onSelect={handleStatusFilterChange}
                            selectedId={selectedStatusFilter}
                            options={statusFilterOptions}
                            border="round"
                            size="small"
                            status={isStatusFilterLoading ? "loading" : undefined}
                        />
                    </TableToolbar.Item>
                    <TableToolbar.Item>
                        <div style={{ width: '320px' }}>
                            <Search
                                value={searchValue}
                                onChange={handleSearchChange}
                                onClear={handleSearchClear}
                                placeholder="Search Orders by number, name or email.."
                                expandable={false}
                                size="small"
                            />
                        </div>
                    </TableToolbar.Item>
                </TableToolbar.ItemGroup>
            </TableToolbar>

            <div style={{ overflowX: 'auto', width: '100%' }}>
                <Table
                    data={tableData}
                    columns={columns}
                    onRowClick={(rowData, event) => handleRowClick(rowData as Order, event)}
                    horizontalScroll
                    infiniteScroll
                    loadMore={loadMoreOrders}
                    hasMore={isDisplayingSearchResults ? orderStore.searchHasMore : orderStore.hasMoreOrders}
                    itemsPerPage={100}
                    scrollElement={container && container.current}
                    loader={
                        <Box align="center" padding="24px 0px">
                            <Loader size="small" />
                        </Box>
                    }
                >
                    <Table.Titlebar />
                    <div
                        ref={containerRef}
                        className="orders-table-container"
                        style={{
                            maxHeight: 'calc(100vh - 194px)',
                            overflowY: 'auto',
                            overflowX: 'hidden'
                        }}
                    >
                        {statusFilteredOrders.length === 0 ? (
                            <Box align="center" paddingTop="40px" paddingBottom="40px" direction="vertical" gap="12px">
                                <Icons.Search size="36px" style={{ color: '#ccc' }} />
                                <Text secondary>
                                    {hasActiveSearch
                                        ? `No orders found matching "${orderStore.searchQuery}"`
                                        : 'No orders found'
                                    }
                                </Text>
                                {hasActiveSearch && (
                                    <Button
                                        priority="secondary"
                                        size="small"
                                        onClick={handleSearchClear}
                                    >
                                        Clear search to see all orders
                                    </Button>
                                )}
                            </Box>
                        ) : (
                            <Table.Content titleBarVisible={false} />
                        )}
                        {/* Add loading indicator for "load more" */}
                        {(orderStore.isLoadingMore || uiStore.loadingMore) && (
                            <Box align="center" padding="24px 0px">
                                <Loader size="tiny" />
                                <Text size="tiny" secondary style={{ marginTop: '8px' }}>
                                    Loading more {isDisplayingSearchResults ? 'search results' : 'orders'}...
                                </Text>
                            </Box>
                        )}
                    </div>
                </Table>
            </div>

            {/* Add some CSS styles for better visual feedback */}
            <style>{`
                .canceled-row {
                    opacity: 0.6;
                }
                .canceled-row * {
                    color: #9ca3af !important;
                }
                tr[data-selected-order] {
                    background-color: #e9f0fe !important;
                }
                .orders-table-container::-webkit-scrollbar {
                    display: none; /* Chrome, Safari, Opera */
                }
            `}</style>
        </Card>
    );
});