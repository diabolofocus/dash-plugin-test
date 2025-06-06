// Fixed CompactAnalytics.tsx
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

// Helper function to safely parse price from formatted string
const parsePrice = (priceString: string): number => {
    if (!priceString || typeof priceString !== 'string') {
        return 0;
    }

    // Remove all non-numeric characters except dots and commas
    let cleanPrice = priceString.replace(/[^\d,.-]/g, '');

    // Handle European format (1.234,56) vs US format (1,234.56)
    if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
        // Determine which is decimal separator
        const lastComma = cleanPrice.lastIndexOf(',');
        const lastDot = cleanPrice.lastIndexOf('.');

        if (lastComma > lastDot) {
            // European format: 1.234,56
            cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
        } else {
            // US format: 1,234.56
            cleanPrice = cleanPrice.replace(/,/g, '');
        }
    } else if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
        // Could be thousand separator (1,234) or decimal (1,56)
        const parts = cleanPrice.split(',');
        if (parts.length === 2 && parts[1].length <= 2) {
            // Decimal separator
            cleanPrice = cleanPrice.replace(',', '.');
        } else {
            // Thousand separator
            cleanPrice = cleanPrice.replace(/,/g, '');
        }
    }

    const parsed = parseFloat(cleanPrice);
    return isNaN(parsed) ? 0 : parsed;
};

// Helper function to extract currency symbol
const extractCurrency = (priceString: string): string => {
    if (!priceString) return '€';

    const currencyMatch = priceString.match(/[€$£¥₹₽¢]/);
    if (currencyMatch) {
        return currencyMatch[0];
    }

    // Check for currency codes
    const codeMatch = priceString.match(/[A-Z]{3}/);
    if (codeMatch) {
        return codeMatch[0];
    }

    return '€'; // Default
};

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
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (period) {
            case 'today':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    current: today,
                    previous: yesterday,
                    previousEnd: today
                };
            case 'yesterday':
                const yesterdayStart = new Date(today);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                const dayBefore = new Date(today);
                dayBefore.setDate(dayBefore.getDate() - 2);
                return {
                    current: yesterdayStart,
                    previous: dayBefore,
                    previousEnd: yesterdayStart
                };
            case '7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const fourteenDaysAgo = new Date(today);
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                return {
                    current: sevenDaysAgo,
                    previous: fourteenDaysAgo,
                    previousEnd: sevenDaysAgo
                };
            case '30days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const sixtyDaysAgo = new Date(today);
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                return {
                    current: thirtyDaysAgo,
                    previous: sixtyDaysAgo,
                    previousEnd: thirtyDaysAgo
                };
            case '365days':
                const oneYearAgo = new Date(today);
                oneYearAgo.setDate(oneYearAgo.getDate() - 365);
                const twoYearsAgo = new Date(today);
                twoYearsAgo.setDate(twoYearsAgo.getDate() - 730);
                return {
                    current: oneYearAgo,
                    previous: twoYearsAgo,
                    previousEnd: oneYearAgo
                };
            case 'thisweek':
                const startOfWeek = new Date(today);
                const dayOfWeek = startOfWeek.getDay();
                startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek); // Sunday
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
                const defaultThirtyDaysAgo = new Date(today);
                defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
                const defaultSixtyDaysAgo = new Date(today);
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

        // Debug logging
        console.log('📊 Analytics Debug:', {
            period,
            currentStart: current.toISOString(),
            previousStart: previous.toISOString(),
            previousEnd: previousEnd.toISOString(),
            totalOrders: orderStore.orders.length
        });

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

        console.log('📊 Filtered Orders:', {
            currentOrdersCount: currentOrders.length,
            previousOrdersCount: previousOrders.length,
            currentOrderIds: currentOrders.map(o => o.number),
            previousOrderIds: previousOrders.map(o => o.number)
        });

        // Calculate current period metrics
        let currentTotalSales = 0;
        let currency = '€';

        currentOrders.forEach(order => {
            const parsedPrice = parsePrice(order.total);
            currentTotalSales += parsedPrice;

            const orderCurrency = extractCurrency(order.total);
            if (orderCurrency !== '€') {
                currency = orderCurrency;
            }

            console.log('💰 Current Order:', {
                orderNumber: order.number,
                originalTotal: order.total,
                parsedPrice,
                runningTotal: currentTotalSales
            });
        });

        // Calculate previous period metrics
        let previousTotalSales = 0;
        previousOrders.forEach(order => {
            const parsedPrice = parsePrice(order.total);
            previousTotalSales += parsedPrice;

            console.log('💰 Previous Order:', {
                orderNumber: order.number,
                originalTotal: order.total,
                parsedPrice,
                runningTotal: previousTotalSales
            });
        });

        const currentAverageOrderValue = currentOrders.length > 0 ? currentTotalSales / currentOrders.length : 0;
        const previousAverageOrderValue = previousOrders.length > 0 ? previousTotalSales / previousOrders.length : 0;

        // Calculate percentage changes (handle division by zero)
        const salesChange = previousTotalSales > 0 ? ((currentTotalSales - previousTotalSales) / previousTotalSales) * 100 :
            currentTotalSales > 0 ? 100 : 0;
        const ordersChange = previousOrders.length > 0 ? ((currentOrders.length - previousOrders.length) / previousOrders.length) * 100 :
            currentOrders.length > 0 ? 100 : 0;
        const aovChange = previousAverageOrderValue > 0 ? ((currentAverageOrderValue - previousAverageOrderValue) / previousAverageOrderValue) * 100 :
            currentAverageOrderValue > 0 ? 100 : 0;

        const result = {
            sales: `${currency}${currentTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            orders: currentOrders.length,
            avgOrderValue: `${currency}${currentAverageOrderValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            salesChange: Math.round(salesChange),
            ordersChange: Math.round(ordersChange),
            aovChange: Math.round(aovChange)
        };

        console.log('📊 Final Metrics:', {
            period,
            currentTotalSales,
            previousTotalSales,
            currentOrders: currentOrders.length,
            previousOrders: previousOrders.length,
            salesChange,
            ordersChange,
            aovChange,
            result
        });

        return result;
    };

    const metrics = calculateMetricsForPeriod(selectedPeriod);

    const formatPercentageChange = (change: number) => {
        if (change === 0) return '0%';
        const sign = change > 0 ? '+' : '';
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

                    {/* Right side - Time Period Selector */}
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

