// Fixed OrderAnalytics.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Box, Text, Card } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';
import type { Order } from '../../types/Order';

interface AnalyticsData {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    currency: string;
    fulfilledOrders: number;
    pendingOrders: number;
}

export const OrderAnalytics: React.FC = observer(() => {
    const { orderStore } = useStores();

    // Helper to parse price string (e.g., "€123.45" or "$123.45") to number
    const parsePrice = (price: string): number => {
        // Remove all non-digit, non-dot, non-comma, and non-minus characters
        const cleaned = price.replace(/[^0-9.,-]/g, '');
        // Replace comma with dot if comma is used as decimal separator
        const normalized = cleaned.replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Helper to extract currency symbol from price string
    const extractCurrency = (price: string): string => {
        const match = price.match(/[^0-9.,-]+/);
        return match ? match[0] : '€';
    };

    const calculateLast30DaysAnalytics = (): AnalyticsData => {
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        // Reset time to start of day for accurate comparison
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        console.log('📊 OrderAnalytics Debug:', {
            now: now.toISOString(),
            thirtyDaysAgo: thirtyDaysAgo.toISOString(),
            totalOrders: orderStore.orders.length
        });

        // Filter orders from last 30 days
        const last30DaysOrders = orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            const isInRange = orderDate >= thirtyDaysAgo;

            console.log('📅 Order Date Check:', {
                orderNumber: order.number,
                orderDate: orderDate.toISOString(),
                thirtyDaysAgo: thirtyDaysAgo.toISOString(),
                isInRange
            });

            return isInRange;
        });

        console.log('📊 Filtered Orders:', {
            total: orderStore.orders.length,
            last30Days: last30DaysOrders.length,
            orderNumbers: last30DaysOrders.map(o => o.number)
        });

        // Calculate metrics
        let totalSales = 0;
        let currency = '€'; // Default currency

        last30DaysOrders.forEach(order => {
            const parsedPrice = parsePrice(order.total);
            totalSales += parsedPrice;

            const orderCurrency = extractCurrency(order.total);
            if (orderCurrency !== '€') {
                currency = orderCurrency;
            }

            console.log('💰 Processing Order:', {
                orderNumber: order.number,
                originalTotal: order.total,
                parsedPrice,
                runningTotal: totalSales
            });
        });

        const totalOrders = last30DaysOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        const fulfilledOrders = last30DaysOrders.filter(order =>
            order.status === 'FULFILLED'
        ).length;

        const pendingOrders = last30DaysOrders.filter(order =>
            order.status === 'NOT_FULFILLED' || order.status === 'PARTIALLY_FULFILLED'
        ).length;

        const result = {
            totalSales,
            totalOrders,
            averageOrderValue,
            currency,
            fulfilledOrders,
            pendingOrders
        };

        console.log('📊 Final Analytics:', result);

        return result;
    };

    const analytics = calculateLast30DaysAnalytics();

    const formatCurrency = (amount: number, currency: string): string => {
        return `${currency}${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })}`;
    };

    return (
        <Box gap="16px" direction="horizontal" align="center">
            {/* Sales Metric */}
            <Card>
                <Card.Content>
                    <Box
                        direction="horizontal"
                        align="center"
                        gap="12px"
                        paddingTop="12px"
                        paddingBottom="12px"
                        paddingLeft="16px"
                        paddingRight="16px"
                    >
                        <Box
                            width="40px"
                            height="40px"
                            borderRadius="50%"
                            backgroundColor="#e8f5e8"
                            align="center"
                            verticalAlign="middle"
                        >
                            <Icons.CurrencySmall size="20px" style={{ color: '#22c55e' }} />
                        </Box>
                        <Box direction="vertical" gap="2px">
                            <Text size="tiny" secondary>Sales (30 days)</Text>
                            <Text size="medium" weight="bold">
                                {formatCurrency(analytics.totalSales, analytics.currency)}
                            </Text>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>

            {/* Orders Metric */}
            <Card>
                <Card.Content>
                    <Box
                        direction="horizontal"
                        align="center"
                        gap="12px"
                        paddingTop="12px"
                        paddingBottom="12px"
                        paddingLeft="16px"
                        paddingRight="16px"
                    >
                        <Box
                            width="40px"
                            height="40px"
                            borderRadius="50%"
                            backgroundColor="#eff6ff"
                            align="center"
                            verticalAlign="middle"
                        >
                            <Icons.Package size="20px" style={{ color: '#3b82f6' }} />
                        </Box>
                        <Box direction="vertical" gap="2px">
                            <Text size="tiny" secondary>Orders (30 days)</Text>
                            <Text size="medium" weight="bold">
                                {analytics.totalOrders}
                            </Text>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>

            {/* Average Order Value */}
            <Card>
                <Card.Content>
                    <Box
                        direction="horizontal"
                        align="center"
                        gap="12px"
                        paddingTop="12px"
                        paddingBottom="12px"
                        paddingLeft="16px"
                        paddingRight="16px"
                    >
                        <Box
                            width="40px"
                            height="40px"
                            borderRadius="50%"
                            backgroundColor="#fef3c7"
                            align="center"
                            verticalAlign="middle"
                        >
                            <Icons.ArrowUp size="20px" style={{ color: '#f59e0b' }} />
                        </Box>
                        <Box direction="vertical" gap="2px">
                            <Text size="tiny" secondary>Avg. Order Value</Text>
                            <Text size="medium" weight="bold">
                                {formatCurrency(analytics.averageOrderValue, analytics.currency)}
                            </Text>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>

            {/* Order Status Summary */}
            <Card>
                <Card.Content>
                    <Box
                        direction="horizontal"
                        align="center"
                        gap="12px"
                        paddingTop="12px"
                        paddingBottom="12px"
                        paddingLeft="16px"
                        paddingRight="16px"
                    >
                        <Box
                            width="40px"
                            height="40px"
                            borderRadius="50%"
                            backgroundColor="#f3e8ff"
                            align="center"
                            verticalAlign="middle"
                        >
                            <Icons.StatusComplete size="20px" style={{ color: '#8b5cf6' }} />
                        </Box>
                        <Box direction="vertical" gap="2px">
                            <Text size="tiny" secondary>Fulfillment Rate</Text>
                            <Text size="medium" weight="bold">
                                {analytics.totalOrders > 0
                                    ? `${Math.round((analytics.fulfilledOrders / analytics.totalOrders) * 100)}%`
                                    : '0%'
                                }
                            </Text>
                            <Text size="tiny" secondary>
                                {analytics.fulfilledOrders} of {analytics.totalOrders} fulfilled
                            </Text>
                        </Box>
                    </Box>
                </Card.Content>
            </Card>
        </Box>
    );
});