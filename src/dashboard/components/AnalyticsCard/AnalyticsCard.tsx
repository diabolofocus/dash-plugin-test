// components/AnalyticsCard/AnalyticsCard.tsx
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Box, Text, Loader } from '@wix/design-system';
import { analyticsData } from '@wix/analytics-data';

// Define MeasureNameEnum locally if not exported by @wix/analytics-data
enum MeasureNameEnum {
    TOTAL_SALES = 'TOTAL_SALES',
    TOTAL_ORDERS = 'TOTAL_ORDERS'
}
import { auth } from '@wix/essentials';

interface AnalyticsData {
    sales: number;
    orders: number;
    avgOrderValue: number;
}

export const AnalyticsCard: React.FC = observer(() => {
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAnalyticsData();
    }, []);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get date range for last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const dateRange = {
                startDate: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
                endDate: endDate.toISOString().split('T')[0]
            };

            // Use elevated permissions to access analytics data
            const elevatedGetAnalyticsData = auth.elevate(analyticsData.getAnalyticsData);

            const response = await elevatedGetAnalyticsData(
                [MeasureNameEnum.TOTAL_SALES, MeasureNameEnum.TOTAL_ORDERS], // Request both sales and orders data
                {
                    dateRange,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
                }
            );

            // Extract data from response
            let totalSales = 0;
            let totalOrders = 0;

            response.data?.forEach(measure => {
                if (measure.type === MeasureNameEnum.TOTAL_SALES) {
                    totalSales = measure.total || 0;
                } else if (measure.type === MeasureNameEnum.TOTAL_ORDERS) {
                    totalOrders = measure.total || 0;
                }
            });

            // Calculate average order value
            const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

            setAnalytics({
                sales: totalSales,
                orders: totalOrders,
                avgOrderValue
            });

        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number): string => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR', // Change to your store's currency
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatNumber = (num: number): string => {
        return new Intl.NumberFormat('en-US').format(num);
    };

    if (loading) {
        return (
            <Card>
                <Card.Content>
                    <Box direction="horizontal" align="center" style={{ justifyContent: 'space-between', width: '100%' }} padding="24px">
                        <Loader size="medium" />
                        <Text size="medium" secondary>Loading analytics...</Text>
                    </Box>
                </Card.Content>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <Card.Content>
                    <Box direction="vertical" gap="8px" padding="16px">
                        <Text size="medium" weight="bold" color="D10">Analytics Error</Text>
                        <Text size="small" secondary>{error}</Text>
                    </Box>
                </Card.Content>
            </Card>
        );
    }

    return (
        <Card>
            <Card.Content>
                <Box direction="vertical" gap="16px" padding="8px">
                    {/* Header */}
                    <Box direction="horizontal" align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <Text size="medium" weight="bold">Store Analytics</Text>
                        <Text size="tiny" secondary>Last 30 days</Text>
                    </Box>

                    {/* Analytics Stats */}
                    <Box direction="horizontal" gap="24px" style={{ justifyContent: 'space-between', width: '100%' }}>
                        {/* Sales */}
                        <Box direction="vertical" gap="4px" align="left">
                            <Text size="tiny" secondary weight="normal">Sales</Text>
                            <Text size="medium" weight="bold">
                                {analytics ? formatCurrency(analytics.sales) : '€0'}
                            </Text>
                            <Text size="tiny" secondary>0%</Text>
                        </Box>

                        {/* Orders */}
                        <Box direction="vertical" gap="4px" align="left">
                            <Text size="tiny" secondary weight="normal">Orders</Text>
                            <Text size="medium" weight="bold">
                                {analytics ? formatNumber(analytics.orders) : '0'}
                            </Text>
                            <Text size="tiny" secondary>0%</Text>
                        </Box>

                        {/* Average Order Value */}
                        <Box direction="vertical" gap="4px" align="left">
                            <Text size="tiny" secondary weight="normal">Avg. order value</Text>
                            <Text size="medium" weight="bold">
                                {analytics ? formatCurrency(analytics.avgOrderValue) : '€0.00'}
                            </Text>
                            <Text size="tiny" secondary>0%</Text>
                        </Box>
                    </Box>

                    {/* Footer Action */}
                    <Box direction="horizontal" style={{ justifyContent: 'end', width: '100%' }}>
                        <Text
                            size="small"
                            skin="premium"
                            weight="normal"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                                // Navigate to analytics page or refresh data
                                fetchAnalyticsData();
                            }}
                        >
                            Go to Analytics
                        </Text>
                    </Box>
                </Box>
            </Card.Content>
        </Card>
    );
});