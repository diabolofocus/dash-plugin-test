
// ==================================================
// File: components/OrdersTable/hooks/useOrderTableData.ts
// ==================================================

import { useMemo } from 'react';
import { useStores } from './useStores';

export const useOrderTableData = (selectedStatusFilter: string | null) => {
    const { orderStore } = useStores();

    const statusFilteredOrders = useMemo(() => {
        return orderStore.filteredOrders;
    }, [orderStore.filteredOrders]);

    const tableData = useMemo(() => {
        return statusFilteredOrders.map(order => ({
            id: order._id,
            ...order
        }));
    }, [statusFilteredOrders]);

    const hasActiveSearch = useMemo(() => {
        return orderStore.hasActiveSearch;
    }, [orderStore.hasActiveSearch]);

    const isDisplayingSearchResults = useMemo(() => {
        return orderStore.isDisplayingSearchResults;
    }, [orderStore.isDisplayingSearchResults]);

    return {
        statusFilteredOrders,
        tableData,
        hasActiveSearch,
        isDisplayingSearchResults
    };
};
