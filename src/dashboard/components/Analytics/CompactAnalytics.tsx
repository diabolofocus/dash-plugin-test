import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Text, DropdownBase, TextButton } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';

type TimePeriod = 'today' | 'yesterday' | '7days' | '30days' | 'thisweek' | 'thismonth';

interface TimePeriodOption {
    id: TimePeriod;
    value: string;
}

export const CompactAnalytics: React.FC = observer(() => {
    const { orderStore } = useStores();

    const timePeriodOptions: TimePeriodOption[] = [
        { id: 'today', value: 'Today' },
        { id: 'yesterday', value: 'Yesterday' },
        { id: '7days', value: 'Last 7 days' },
        { id: '30days', value: 'Last 30 days' },
        { id: 'thisweek', value: 'This week' },
        { id: 'thismonth', value: 'This month' }
    ];

    // Periods that can use Wix Analytics API (within 62-day limit)
    const API_SUPPORTED_PERIODS = ['7days', '30days', 'thismonth', 'thisweek'];

    // Load analytics when component mounts
    useEffect(() => {
        if (orderStore.connectionStatus === 'connected') {
            loadAnalyticsForPeriod(orderStore.selectedAnalyticsPeriod as TimePeriod);
        }
    }, [orderStore.connectionStatus]);

    // ✅ HYBRID: Try Analytics API first, then fallback to order calculations
    const loadAnalyticsForPeriod = async (period: TimePeriod) => {
        try {
            orderStore.setAnalyticsLoading(true);
            orderStore.setAnalyticsError(null);
            orderStore.setSelectedAnalyticsPeriod(period);

            // ✅ TRY ANALYTICS API FIRST for supported periods
            if (API_SUPPORTED_PERIODS.includes(period)) {
                console.log(`🔄 Trying Analytics API for ${period}...`);

                try {
                    const analyticsResult = await loadAnalyticsFromAPI(period);
                    if (analyticsResult.success) {
                        console.log(`✅ Analytics API success for ${period}`);
                        return; // Success! Exit early
                    } else {
                        console.log(`❌ Analytics API failed for ${period}:`, analyticsResult.error);
                    }
                } catch (apiError) {
                    console.log(`❌ Analytics API error for ${period}:`, apiError);
                }
            }

            // ✅ FALLBACK: Use order calculations
            console.log(`📋 Using order calculations for ${period}`);
            await loadAnalyticsFromOrders(period);

        } catch (error) {
            console.error('Failed to load analytics:', error);
            orderStore.setAnalyticsError('Failed to load analytics');
        } finally {
            orderStore.setAnalyticsLoading(false);
        }
    };

    // ✅ ANALYTICS API METHOD
    const loadAnalyticsFromAPI = async (period: TimePeriod): Promise<{ success: boolean; error?: string }> => {
        try {
            // Import AnalyticsService dynamically to avoid dependency issues
            const { AnalyticsService } = await import('../../services/AnalyticsService');
            const analyticsService = new AnalyticsService();

            // Import getSiteIdFromContext dynamically
            const { getSiteIdFromContext } = await import('../../utils/get-siteId');
            const siteId = getSiteIdFromContext();

            if (!siteId) {
                throw new Error('Site ID not found');
            }

            // Get analytics with comparison data
            const result = await analyticsService.getAnalyticsWithComparison(period);

            if (result.success) {
                // Store the analytics data
                orderStore.setAnalyticsData({
                    TOTAL_SALES: { total: result.data.totalSales },
                    TOTAL_ORDERS: { total: result.data.totalOrders },
                    TOTAL_SESSIONS: { total: result.data.totalSessions }
                });

                // Store the formatted analytics with comparison data
                orderStore.setFormattedAnalytics({
                    totalSales: result.data.totalSales,
                    totalOrders: result.data.totalOrders,
                    totalSessions: result.data.totalSessions,
                    averageOrderValue: result.data.averageOrderValue,
                    currency: result.data.currency,
                    salesChange: result.data.salesChange,
                    ordersChange: result.data.ordersChange,
                    sessionsChange: result.data.sessionsChange,
                    aovChange: result.data.aovChange,
                    period: period
                });

                return { success: true };
            } else {
                return { success: false, error: result.error };
            }

        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    // ✅ ORDER-BASED CALCULATIONS METHOD
    const loadAnalyticsFromOrders = async (period: TimePeriod) => {
        // Get orders for the selected period
        const selectedPeriodOrders = orderStore.getOrdersForSelectedPeriod();

        // Calculate current period metrics
        const currentMetrics = calculateOrderMetrics(selectedPeriodOrders);

        // Calculate previous period metrics for comparison
        const previousPeriodOrders = getPreviousPeriodOrders(period);
        const previousMetrics = calculateOrderMetrics(previousPeriodOrders);

        // Calculate percentage changes
        const salesChange = calculatePercentageChange(currentMetrics.totalSales, previousMetrics.totalSales);
        const ordersChange = calculatePercentageChange(currentMetrics.totalOrders, previousMetrics.totalOrders);
        const aovChange = calculatePercentageChange(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue);

        // Store the analytics with comparison data
        orderStore.setFormattedAnalytics({
            totalSales: currentMetrics.totalSales,
            totalOrders: currentMetrics.totalOrders,
            totalSessions: 0, // Not available from order data
            averageOrderValue: currentMetrics.averageOrderValue,
            currency: currentMetrics.currency,
            salesChange,
            ordersChange,
            sessionsChange: 0,
            aovChange,
            period: period
        });
    };

    // Helper function to calculate metrics from orders
    const calculateOrderMetrics = (orders: any[]) => {
        let totalSales = 0;
        let currency = '€';

        orders.forEach(order => {
            const parsedPrice = parsePrice(order.total);
            totalSales += parsedPrice;
            const orderCurrency = extractCurrency(order.total);
            if (orderCurrency !== '€') {
                currency = orderCurrency;
            }
        });

        const totalOrders = orders.length;
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

        return {
            totalSales,
            totalOrders,
            averageOrderValue,
            currency
        };
    };

    // Helper function to get orders from previous period for comparison
    const getPreviousPeriodOrders = (period: TimePeriod) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let previousStartDate: Date;
        let previousEndDate: Date;

        switch (period) {
            case 'today':
                previousStartDate = new Date(today);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(previousStartDate);
                break;
            case 'yesterday':
                previousStartDate = new Date(today);
                previousStartDate.setDate(previousStartDate.getDate() - 2);
                previousEndDate = new Date(previousStartDate);
                break;
            case '7days':
                previousStartDate = new Date(today);
                previousStartDate.setDate(previousStartDate.getDate() - 14);
                previousEndDate = new Date(today);
                previousEndDate.setDate(previousEndDate.getDate() - 7);
                break;
            case '30days':
                previousStartDate = new Date(today);
                previousStartDate.setDate(previousStartDate.getDate() - 60);
                previousEndDate = new Date(today);
                previousEndDate.setDate(previousEndDate.getDate() - 30);
                break;
            case 'thisweek':
                // FIXED: Monday-based weeks (Monday = start, Sunday = end)
                const currentWeekStart = new Date(today);
                const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
                const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday=6 days back, others=dayOfWeek-1
                currentWeekStart.setDate(currentWeekStart.getDate() - daysFromMonday);

                // Previous week starts 7 days before current week start
                previousStartDate = new Date(currentWeekStart);
                previousStartDate.setDate(previousStartDate.getDate() - 7);

                // Previous week ends 1 day before current week starts (which is Sunday)
                previousEndDate = new Date(currentWeekStart);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                break;
            case 'thismonth':
                previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                previousStartDate = new Date(today);
                previousStartDate.setDate(previousStartDate.getDate() - 60);
                previousEndDate = new Date(today);
                previousEndDate.setDate(previousEndDate.getDate() - 30);
        }

        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate.setHours(23, 59, 59, 999);

        return orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= previousStartDate && orderDate <= previousEndDate;
        });
    };

    // Helper functions for price parsing
    const parsePrice = (priceString: string): number => {
        if (!priceString || typeof priceString !== 'string') return 0;

        let cleanPrice = priceString.replace(/[^\d,.-]/g, '');

        if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
            const lastComma = cleanPrice.lastIndexOf(',');
            const lastDot = cleanPrice.lastIndexOf('.');

            if (lastComma > lastDot) {
                cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
            } else {
                cleanPrice = cleanPrice.replace(/,/g, '');
            }
        } else if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
            const parts = cleanPrice.split(',');
            if (parts.length === 2 && parts[1].length <= 2) {
                cleanPrice = cleanPrice.replace(',', '.');
            } else {
                cleanPrice = cleanPrice.replace(/,/g, '');
            }
        }

        const parsed = parseFloat(cleanPrice);
        return isNaN(parsed) ? 0 : parsed;
    };

    const extractCurrency = (priceString: string): string => {
        if (!priceString) return '€';

        const currencyMatch = priceString.match(/[€$£¥₹₽¢]/);
        if (currencyMatch) return currencyMatch[0];

        const codeMatch = priceString.match(/[A-Z]{3}/);
        if (codeMatch) return codeMatch[0];

        return '€';
    };

    const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    };

    const getMetrics = () => {
        // Use formatted analytics if available
        if (orderStore.formattedAnalytics && !orderStore.analyticsError) {
            const data = orderStore.formattedAnalytics;

            return {
                sales: `€${data.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                orders: data.totalOrders,
                avgOrderValue: `€${data.averageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                salesChange: data.salesChange || 0,
                ordersChange: data.ordersChange || 0,
                aovChange: data.aovChange || 0,
                isLoading: orderStore.analyticsLoading
            };
        }

        // Fallback or loading state
        return {
            sales: '€0.00',
            orders: 0,
            avgOrderValue: '€0.00',
            salesChange: 0,
            ordersChange: 0,
            aovChange: 0,
            isLoading: orderStore.analyticsLoading
        };
    };

    const metrics = getMetrics();

    const formatPercentageChange = (change: number): { text: string; color: string } => {
        if (change === 0) return { text: '0%', color: '#6b7280' };
        const sign = change > 0 ? '+' : '';
        const color = change > 0 ? '#15803d' : change < 0 ? '#6b7280' : '#6b7280';
        return {
            text: `${sign}${change}%`,
            color: color
        };
    };

    const handlePeriodChange = async (selectedOption: TimePeriodOption) => {
        console.log('Period changed to:', selectedOption.id);

        // Load analytics for the new period
        if (orderStore.connectionStatus === 'connected') {
            await loadAnalyticsForPeriod(selectedOption.id);
        }
    };

    // Component to render individual metric
    const MetricItem: React.FC<{ title: string; value: string | number; change?: number; isSalesMetric?: boolean }> = ({
        title,
        value,
        change,
    }) => {
        const percentageData = change !== undefined ? formatPercentageChange(change) : null;

        return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Text size="medium" secondary>{title}</Text>
                <Text
                    size="medium"
                    weight="normal"
                >
                    {metrics.isLoading ? 'Loading...' : value}
                </Text>
                {percentageData && !metrics.isLoading && (
                    <span
                        style={{
                            color: percentageData.color,
                            fontWeight: '700',
                            fontSize: '10px',
                            lineHeight: '1',
                            fontFamily: 'HelveticaNeueW01-45Ligh, HelveticaNeueW02-45Ligh, HelveticaNeueW10-45Ligh, Helvetica Neue, Helvetica, Arial, sans-serif',
                            letterSpacing: '1.3px'  // Add this for character spacing
                        }}
                    >
                        {percentageData.text}
                    </span>
                )}
            </div>
        );
    };

    // Get data source indicator
    const getDataSource = () => {
        if (API_SUPPORTED_PERIODS.includes(orderStore.selectedAnalyticsPeriod as TimePeriod)) {
            return '📊'; // Analytics API
        }
        return '📋'; // Order data
    };

    return (
        <Card>
            <Card.Content>
                <div style={{
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'space-between'
                }}>
                    {/* Left side - Analytics metrics */}
                    <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                        {orderStore.connectionStatus === 'connected' ? (
                            <>
                                <MetricItem
                                    title="Sales"
                                    value={metrics.sales}
                                    change={metrics.salesChange}

                                />

                                <MetricItem
                                    title="Orders"
                                    value={metrics.orders}
                                    change={metrics.ordersChange}

                                />

                                <MetricItem
                                    title="Avg. order value"
                                    value={metrics.avgOrderValue}
                                    change={metrics.aovChange}

                                />

                                {/* Data source indicator */}
                                {/* <Text size="tiny" secondary>
                                    {getDataSource()} {orderStore.getPeriodLabel()}
                                </Text> */}
                            </>
                        ) : (
                            <Text size="small" secondary>
                                {orderStore.connectionStatus === 'connecting' ? 'Loading orders...' : 'Failed to load orders.'}
                            </Text>
                        )}
                    </div>

                    {/* Right side - Time Period Selector */}
                    {orderStore.connectionStatus === 'connected' && (
                        <DropdownBase
                            selectedId={orderStore.selectedAnalyticsPeriod as TimePeriod}
                            options={timePeriodOptions}
                            onSelect={handlePeriodChange}
                            placement="bottom-end"
                            zIndex={9999}
                        >
                            {({ toggle, selectedOption = {} }) => (
                                <TextButton
                                    skin="standard"
                                    suffixIcon={<Icons.ChevronDown />}
                                    onClick={toggle}
                                    disabled={metrics.isLoading}
                                >
                                    {selectedOption.value || 'Last 30 days'}
                                </TextButton>
                            )}
                        </DropdownBase>
                    )}
                </div>
            </Card.Content>
        </Card>
    );
});