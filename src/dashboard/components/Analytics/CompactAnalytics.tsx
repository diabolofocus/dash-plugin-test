// components/Analytics/CompactAnalytics.tsx
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Card, Text, DropdownBase, TextButton } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { useStores } from '../../hooks/useStores';

type TimePeriod = 'today' | 'yesterday' | '7days' | '30days' | 'thisweek' | 'thismonth' | '365days' | 'thisyear';


interface TimePeriodOption {
    id: TimePeriod;
    value: string;
}

export const CompactAnalytics: React.FC = observer(() => {
    const { orderStore } = useStores();
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30days');

    const timePeriodOptions: TimePeriodOption[] = [
        { id: 'today', value: 'Today' },
        { id: 'yesterday', value: 'Yesterday' },
        { id: '7days', value: 'Last 7 days' },
        { id: '30days', value: 'Last 30 days' },
        { id: '365days', value: 'Last 365 days' },
        { id: 'thisweek', value: 'This week' },
        { id: 'thismonth', value: 'This month' },
        { id: 'thisyear', value: 'This year' }
    ];


    const getDateRanges = (period: TimePeriod) => {
        const now = new Date();

        switch (period) {
            case 'today':
                const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const startOfYesterday = new Date(startOfToday);
                startOfYesterday.setDate(startOfYesterday.getDate() - 1);
                return {
                    current: startOfToday,
                    previous: startOfYesterday,
                    previousEnd: startOfToday
                };
            case 'yesterday':
                const startOfYesterday2 = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const dayBeforeYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2);
                return {
                    current: startOfYesterday2,
                    previous: dayBeforeYesterday,
                    previousEnd: startOfYesterday2
                };
            case '7days':
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const fourteenDaysAgo = new Date();
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                return {
                    current: sevenDaysAgo,
                    previous: fourteenDaysAgo,
                    previousEnd: sevenDaysAgo
                };
            case '30days':
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const sixtyDaysAgo = new Date();
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                return {
                    current: thirtyDaysAgo,
                    previous: sixtyDaysAgo,
                    previousEnd: thirtyDaysAgo
                };
            case '365days':
                const threeSixtyFiveAgo = new Date();
                threeSixtyFiveAgo.setDate(threeSixtyFiveAgo.getDate() - 365);
                const prevYearStart = new Date();
                prevYearStart.setDate(prevYearStart.getDate() - 730);
                return {
                    current: threeSixtyFiveAgo,
                    previous: prevYearStart,
                    previousEnd: threeSixtyFiveAgo
                };
            case 'thisweek':
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
                const startOfLastWeek = new Date(startOfWeek);
                startOfLastWeek.setDate(startOfWeek.getDate() - 7);
                return {
                    current: startOfWeek,
                    previous: startOfLastWeek,
                    previousEnd: startOfWeek
                };
            case 'thismonth':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                return {
                    current: startOfMonth,
                    previous: startOfLastMonth,
                    previousEnd: startOfMonth
                };
            case 'thisyear':
                const startOfThisYear = new Date(now.getFullYear(), 0, 1);
                const startOfLastYear = new Date(now.getFullYear() - 1, 0, 1);
                return {
                    current: startOfThisYear,
                    previous: startOfLastYear,
                    previousEnd: startOfThisYear
                };
            default:
                const defaultThirtyDaysAgo = new Date();
                defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
                const defaultSixtyDaysAgo = new Date();
                defaultSixtyDaysAgo.setDate(defaultSixtyDaysAgo.getDate() - 60);
                return {
                    current: defaultThirtyDaysAgo,
                    previous: defaultSixtyDaysAgo,
                    previousEnd: defaultThirtyDaysAgo
                };
        }
    };

    const calculateMetricsForPeriod = (period: TimePeriod) => {
        const { current, previous, previousEnd } = getDateRanges(period);

        // Filter orders for current period
        const currentOrders = orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= current;
        });

        // Filter orders for previous period
        const previousOrders = orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= previous && orderDate < previousEnd;
        });

        // Calculate current period metrics
        let currentTotalSales = 0;
        let currency = '€';

        currentOrders.forEach(order => {
            const priceMatch = order.total.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
                const numericValue = parseFloat(priceMatch[0].replace(',', ''));
                if (!isNaN(numericValue)) {
                    currentTotalSales += numericValue;
                }
            }

            const currencyMatch = order.total.match(/[€$£¥]/);
            if (currencyMatch) {
                currency = currencyMatch[0];
            }
        });

        // Calculate previous period metrics
        let previousTotalSales = 0;

        previousOrders.forEach(order => {
            const priceMatch = order.total.match(/[\d,]+\.?\d*/);
            if (priceMatch) {
                const numericValue = parseFloat(priceMatch[0].replace(',', ''));
                if (!isNaN(numericValue)) {
                    previousTotalSales += numericValue;
                }
            }
        });

        const currentAverageOrderValue = currentOrders.length > 0 ? currentTotalSales / currentOrders.length : 0;
        const previousAverageOrderValue = previousOrders.length > 0 ? previousTotalSales / previousOrders.length : 0;

        // Calculate percentage changes
        const salesChange = previousTotalSales > 0 ? ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 : 0;
        const ordersChange = previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 : 0;
        const aovChange = previousAverageOrderValue > 0 ? ((currentAverageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100 : 0;

        return {
            sales: `${currency}${currentTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            orders: currentOrders.length,
            avgOrderValue: `${currency}${currentAverageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            salesChange: Math.round(salesChange),
            ordersChange: Math.round(ordersChange),
            aovChange: Math.round(aovChange)
        };
    };

    const metrics = calculateMetricsForPeriod(selectedPeriod);

    const formatPercentageChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change}%`;
    };

    const handlePeriodChange = (selectedOption: TimePeriodOption) => {
        setSelectedPeriod(selectedOption.id);
    };

    // Component to render individual metric
    const MetricItem: React.FC<{ title: string; value: string | number; percentage?: string }> = ({ title, value, percentage }) => {
        return (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <Text size="medium" secondary>{title}</Text>
                <Text size="medium" weight="bold">{value}</Text>
                {percentage && <Text size="tiny" secondary>{percentage}</Text>}
            </div>
        );
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
                    {/* Left side - Analytics metrics only */}
                    <div style={{ display: 'flex', gap: '48px', alignItems: 'center' }}>
                        {orderStore.connectionStatus === 'connected' ? (
                            <>
                                <MetricItem
                                    title="Sales"
                                    value={metrics.sales}
                                    percentage={formatPercentageChange(metrics.salesChange)}
                                />

                                <MetricItem
                                    title="Orders"
                                    value={metrics.orders}
                                    percentage={formatPercentageChange(metrics.ordersChange)}
                                />

                                <MetricItem
                                    title="Avg. order value"
                                    value={metrics.avgOrderValue}
                                    percentage={formatPercentageChange(metrics.aovChange)}
                                />
                            </>
                        ) : (
                            <Text size="small" secondary>
                                {orderStore.connectionStatus === 'connecting' ? 'Loading orders...' : 'Failed to load orders. Showing demo data.'}
                            </Text>
                        )}
                    </div>

                    {/* Right side - Time Period Selector (all the way to the right) */}
                    {orderStore.connectionStatus === 'connected' && (
                        <DropdownBase
                            selectedId={selectedPeriod}
                            options={timePeriodOptions}
                            onSelect={handlePeriodChange}
                            placement="bottom-end"
                        >
                            {({ toggle, selectedOption = {} }) => (
                                <TextButton
                                    skin="standard"
                                    suffixIcon={<Icons.ChevronDown />}
                                    onClick={toggle}
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