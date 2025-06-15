// components/OrdersTable/OrdersTable.tsx - Main Component (Simplified)
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
    TableToolbar,
    Box
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { useOrderActions } from '../../hooks/useOrderActions';
import { useOrderTableData } from '../../hooks/useOrderTableData';
import { OrderTableColumns } from '../../components/OrdersTable/OrdersTableColumns';
import { EmptyOrdersState } from '../../components/OrdersTable/EmptyOrdersState';
import { statusFilterOptions } from '../../utils/constants';
import './OrdersTable.css';

export const OrdersTable: React.FC = observer(() => {
    const { orderStore, uiStore } = useStores();
    const orderController = useOrderController();
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [isStatusFilterLoading, setIsStatusFilterLoading] = useState(false);
    const containerRef = useRef(null);
    const [container, setContainer] = useState(null);

    // Custom hooks
    const {
        handleViewOrder,
        handleTrackOrder,
        handlePrintOrder,
        handleArchiveOrder,
        orderTrackingCache,
        getTrackingInfo
    } = useOrderActions();

    const {
        statusFilteredOrders,
        tableData,
        hasActiveSearch,
        isDisplayingSearchResults
    } = useOrderTableData(selectedStatusFilter);

    const loadMoreOrders = useCallback(async () => {
        if (orderStore.isDisplayingSearchResults && orderStore.searchHasMore) {
            await orderController.loadMoreSearchResults();
        } else if (!orderStore.isLoadingMore && orderStore.hasMoreOrders && !orderStore.isDisplayingSearchResults) {
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

    // Handle row selection highlighting
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

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setSearchValue(newValue);
        orderController.updateSearchQuery(newValue, selectedStatusFilter ? [selectedStatusFilter] : undefined);
    };

    const handleSearchClear = () => {
        setSearchValue('');
        orderController.clearSearch();
    };

    const handleStatusFilterChange = async (option: any) => {
        setIsStatusFilterLoading(true);
        setSelectedStatusFilter(option?.id || null);

        try {
            if (option?.id) {
                await orderController.performStatusFilter(option.id);
            } else {
                orderController.clearStatusFilter();
            }
        } finally {
            setIsStatusFilterLoading(false);
        }
    };

    const handleRowClick = (order: any, event?: any) => {
        document.querySelectorAll('[data-selected-order]').forEach(row => {
            row.removeAttribute('data-selected-order');
        });

        const clickedRow = event?.currentTarget?.closest('tr');
        if (clickedRow) {
            clickedRow.setAttribute('data-selected-order', order._id);
        }

        orderController.selectOrder(order);
    };

    return (
        <Card>
            <TableToolbar>
                <TableToolbar.ItemGroup position="start">
                    <TableToolbar.Item>
                        <TableToolbar.Title>Recent Orders</TableToolbar.Title>
                    </TableToolbar.Item>
                    {orderStore.loadingStatus && (
                        <TableToolbar.Item>
                            <TableToolbar.Label>
                                {orderStore.loadingStatus}
                            </TableToolbar.Label>
                        </TableToolbar.Item>
                    )}
                </TableToolbar.ItemGroup>
                <TableToolbar.ItemGroup position="end">
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
                    columns={OrderTableColumns({
                        onViewOrder: handleViewOrder,
                        onTrackOrder: handleTrackOrder,
                        onPrintOrder: handlePrintOrder,
                        onArchiveOrder: handleArchiveOrder,
                        orderTrackingCache,
                        getTrackingInfo,
                    })}
                    onRowClick={handleRowClick}
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
                            <EmptyOrdersState
                                hasActiveSearch={hasActiveSearch}
                                searchQuery={orderStore.searchQuery}
                                onClearSearch={handleSearchClear}
                            />
                        ) : (
                            <Table.Content titleBarVisible={false} />
                        )}

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
        </Card>
    );
});