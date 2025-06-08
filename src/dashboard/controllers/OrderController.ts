// controllers/OrderController.ts - FIXED with getSiteId implementation
import { AnalyticsService } from '../services/AnalyticsService';
import { dashboard } from '@wix/dashboard';
import type { OrderStore } from '../stores/OrderStore';
import { getCurrentSiteId } from '../utils/get-siteId';
import type { UIStore } from '../stores/UIStore';
import type { OrderService } from '../services/OrderService';
import type { Order, FulfillOrderParams } from '../types/Order';
import { DEMO_ORDERS } from '../utils/constants';
import { getSiteIdFromContext, debugSiteIdSources } from '../utils/get-siteId';



export class OrderController {
    constructor(
        private orderStore: OrderStore,
        private uiStore: UIStore,
        private orderService: OrderService
    ) { }

    // Replace your loadOrders method in OrderController.ts
    async loadOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');

        console.log(`🚀 [${isDev ? 'DEV' : 'PROD'}] Starting chunked order loading (100 initial)...`);

        try {
            this.uiStore.setLoading(true);
            this.orderStore.setConnectionStatus('connecting');
            this.orderStore.setLoadingStatus('Loading orders...');

            // Load initial 100 orders with progress updates
            const result = await this.orderService.fetchOrdersChunked(100, (orders, totalLoaded, hasMore) => {
                // Update orders immediately with each batch
                this.orderStore.setOrders(orders);
                this.orderStore.setLoadingStatus(`Loading orders... (${totalLoaded})`);

                // Set connected after first batch so UI is responsive
                if (totalLoaded >= 100) {
                    this.orderStore.setConnectionStatus('connected');
                    this.uiStore.setLoading(false);
                }
            });

            console.log(`📊 [${isDev ? 'DEV' : 'PROD'}] Initial chunk complete: ${result.totalCount} orders, hasMore: ${result.hasMore}`);

            if (result.success) {
                this.orderStore.setOrders(result.orders);
                this.orderStore.setHasMoreOrders(result.hasMore);
                this.orderStore.setNextCursor(result.nextCursor || '');
                this.orderStore.setConnectionStatus('connected');
                this.orderStore.setLoadingStatus('');
                this.autoSelectOldestUnfulfilled();

                console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] Loaded initial ${result.totalCount} orders, can load more: ${result.hasMore}`);
            } else {
                this.handleLoadError(new Error(result.error || 'Failed to load orders'));
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Error in chunked loading:`, error);
            this.orderStore.setLoadingStatus('');
            this.handleLoadError(error);
        } finally {
            this.uiStore.setLoading(false);
        }
    }

    // Add this method to OrderController.ts
    async loadMoreOrders() {
        if (!this.orderStore.hasMoreOrders || this.orderStore.isLoadingMore) {
            return;
        }

        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        console.log(`📦 [${isDev ? 'DEV' : 'PROD'}] Loading more orders...`);

        try {
            this.orderStore.setIsLoadingMore(true);
            this.orderStore.setLoadingStatus('Loading more orders...');

            const result = await this.orderService.fetchMoreOrders(this.orderStore.nextCursor, 100);

            if (result.success) {
                this.orderStore.appendOrders(result.orders);
                this.orderStore.setHasMoreOrders(result.hasMore);
                this.orderStore.setNextCursor(result.nextCursor || '');

                console.log(`✅ [${isDev ? 'DEV' : 'PROD'}] Loaded ${result.orders.length} more orders, total: ${this.orderStore.orders.length}`);
            } else {
                console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Failed to load more orders:`, result.error);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] Error loading more orders:`, error);
        } finally {
            this.orderStore.setIsLoadingMore(false);
            this.orderStore.setLoadingStatus('');
        }
    }

    async refreshOrders() {
        const isDev = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
        console.log(`🔄 [${isDev ? 'DEV' : 'PROD'}] OrderController: Starting refresh`);

        this.uiStore.setRefreshing(true);
        this.clearSelection();

        try {
            const result = await this.orderService.fetchOrders({
                limit: 50,
                cursor: undefined
            });

            console.log(`🔄 [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh response:`, {
                success: result.success,
                orderCount: result.orders?.length || 0,
                hasNext: result.pagination?.hasNext
            });

            if (result.success && result.orders && result.orders.length > 0) {
                this.orderStore.setOrders(result.orders);

                // Use actual pagination data instead of hardcoding
                this.orderStore.setPagination({
                    hasNext: result.pagination?.hasNext || false,
                    nextCursor: result.pagination?.nextCursor || '',
                    prevCursor: result.pagination?.prevCursor || ''
                });

                this.orderStore.setConnectionStatus('connected');

                this.showToast(`Orders refreshed successfully.`, 'success');
                this.autoSelectOldestUnfulfilled();


            } else {
                this.handleNoOrdersFound(result.message);
            }

        } catch (error) {
            console.error(`❌ [${isDev ? 'DEV' : 'PROD'}] OrderController: Refresh error:`, error);
            this.handleRefreshError(error);
        } finally {
            this.uiStore.setRefreshing(false);
        }
    }

    selectOrder(order: Order) {
        this.orderStore.selectOrder(order);
        this.uiStore.resetForm();

        // Pre-populate if order has existing tracking info
        if ((order as any).trackingNumber) {
            this.uiStore.setTrackingNumber((order as any).trackingNumber);
        }
        if ((order as any).shippingCarrier) {
            this.uiStore.setSelectedCarrier((order as any).shippingCarrier);
        }
    }

    clearSelection() {
        this.orderStore.selectOrder(null);
        this.uiStore.resetForm();
    }

    async fulfillOrder() {
        const { selectedOrder } = this.orderStore;
        const { trackingNumber, selectedCarrier } = this.uiStore;

        if (!trackingNumber || !selectedCarrier || !selectedOrder) {
            this.showToast('Please enter tracking number and select carrier', 'error');
            return;
        }

        this.uiStore.setSubmitting(true);

        try {
            const fulfillmentParams: FulfillOrderParams = {
                orderId: selectedOrder._id,
                trackingNumber,
                shippingProvider: selectedCarrier,
                orderNumber: selectedOrder.number
            };

            const result = await this.orderService.fulfillOrder(fulfillmentParams);

            if (!result.success) {
                throw new Error(result.message || 'Failed to fulfill order in Wix');
            }

            this.orderStore.updateOrderStatus(selectedOrder._id, 'FULFILLED');

            // 🔥 UPDATED: Include email info in success message
            let message = selectedOrder.status === 'FULFILLED'
                ? `Order #${selectedOrder.number} tracking updated: ${trackingNumber}`
                : `Order #${selectedOrder.number} fulfilled with tracking: ${trackingNumber}`;

            // Add email status to message if available
            if (result.emailInfo) {
                if (result.emailInfo.emailSentAutomatically) {
                    message += ' • Confirmation email sent to customer';
                } else {
                    message += ' • No email sent';
                }
            }

            this.showToast(message, 'success');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.showToast(`Failed to fulfill order: ${errorMessage}`, 'error');
        } finally {
            this.uiStore.resetForm();
            this.uiStore.setSubmitting(false);
        }
    }

    async loadAnalyticsForPeriod(period: 'today' | 'yesterday' | '7days' | '30days' | 'thisweek' | 'thismonth' | '365days' | 'thisyear' = '30days') {
        try {
            this.orderStore.setAnalyticsLoading(true);
            this.orderStore.setAnalyticsError(null);

            const analyticsService = new AnalyticsService();
            const siteId = getSiteIdFromContext();

            if (!siteId) {
                throw new Error('Site ID not found - using fallback');
            }

            // Get analytics with comparison data
            const result = await analyticsService.getAnalyticsWithComparison(period);

            if (result.success) {
                // Store the analytics data with comparison
                this.orderStore.setAnalyticsData({
                    TOTAL_SALES: { total: result.data.totalSales },
                    TOTAL_ORDERS: { total: result.data.totalOrders },
                    TOTAL_SESSIONS: { total: result.data.totalSessions }
                });

                // Store the formatted analytics with comparison data
                this.orderStore.setFormattedAnalytics({
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

            } else {
                throw new Error(result.error || 'Analytics API failed');
            }

        } catch (error: any) {
            this.orderStore.setAnalyticsError(error.message);

            // Fallback to order-based analytics with comparison
            this.calculateAnalyticsFromOrdersWithComparison(period);

        } finally {
            this.orderStore.setAnalyticsLoading(false);
        }
    }

    // Enhanced fallback method with comparison
    private calculateAnalyticsFromOrdersWithComparison(period: string) {
        const { current, previous } = this.getOrderDateRanges(period);

        // Get orders for current period
        const currentOrders = this.orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= current.start && orderDate <= current.end;
        });

        // Get orders for previous period
        const previousOrders = this.orderStore.orders.filter(order => {
            const orderDate = new Date(order._createdDate);
            return orderDate >= previous.start && orderDate <= previous.end;
        });

        // Calculate metrics
        const currentMetrics = this.calculateOrderMetrics(currentOrders);
        const previousMetrics = this.calculateOrderMetrics(previousOrders);

        // Calculate percentage changes
        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        // Store fallback analytics with comparison
        this.orderStore.setFormattedAnalytics({
            totalSales: currentMetrics.totalSales,
            totalOrders: currentMetrics.totalOrders,
            totalSessions: 0, // Not available from orders
            averageOrderValue: currentMetrics.averageOrderValue,
            currency: currentMetrics.currency,
            salesChange: calculateChange(currentMetrics.totalSales, previousMetrics.totalSales),
            ordersChange: calculateChange(currentMetrics.totalOrders, previousMetrics.totalOrders),
            sessionsChange: 0,
            aovChange: calculateChange(currentMetrics.averageOrderValue, previousMetrics.averageOrderValue),
            period: period
        });
    }

    // Helper method to calculate metrics from orders
    private calculateOrderMetrics(orders: any[]) {
        let totalSales = 0;
        let currency = '€';

        orders.forEach(order => {
            const parsedPrice = this.parsePrice(order.total);
            totalSales += parsedPrice;
            const orderCurrency = this.extractCurrency(order.total);
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
    }

    // Helper method to get date ranges for order comparison
    private getOrderDateRanges(period: string) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (period) {
            case 'today':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    current: { start: today, end: today },
                    previous: { start: yesterday, end: yesterday }
                };

            case 'yesterday':
                const yesterdayStart = new Date(today);
                yesterdayStart.setDate(yesterdayStart.getDate() - 1);
                const dayBefore = new Date(today);
                dayBefore.setDate(dayBefore.getDate() - 2);
                return {
                    current: { start: yesterdayStart, end: yesterdayStart },
                    previous: { start: dayBefore, end: dayBefore }
                };

            case '7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const fourteenDaysAgo = new Date(today);
                fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
                return {
                    current: { start: sevenDaysAgo, end: today },
                    previous: { start: fourteenDaysAgo, end: sevenDaysAgo }
                };

            case '30days':
            default:
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const sixtyDaysAgo = new Date(today);
                sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
                return {
                    current: { start: thirtyDaysAgo, end: today },
                    previous: { start: sixtyDaysAgo, end: thirtyDaysAgo }
                };
        }
    }

    // Helper methods for price parsing
    private parsePrice(priceString: string): number {
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
    }

    private extractCurrency(priceString: string): string {
        if (!priceString) return '€';

        const currencyMatch = priceString.match(/[€$£¥₹₽¢]/);
        if (currencyMatch) return currencyMatch[0];

        const codeMatch = priceString.match(/[A-Z]{3}/);
        if (codeMatch) return codeMatch[0];

        return '€';
    }

    updateSearchQuery(query: string) {
        this.orderStore.setSearchQuery(query);
    }

    async copyToClipboard(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text);
            // this.showToast(`${label} copied to clipboard`, 'success');
        } catch (error) {
            this.showToast('Failed to copy to clipboard', 'error');
        }
    }

    private autoSelectOldestUnfulfilled() {
        const oldestUnfulfilled = this.orderStore.oldestUnfulfilledOrder;
        if (oldestUnfulfilled && !this.orderStore.selectedOrder) {
            console.log(`🎯 Auto-selecting oldest unfulfilled order: #${oldestUnfulfilled.number}`);
            this.selectOrder(oldestUnfulfilled);
        }
    }
    private handleNoOrdersFound(message?: string) {
        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('disconnected');
    }

    private handleLoadError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');
    }

    private handleRefreshError(error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.orderStore.setOrders(DEMO_ORDERS as any);
        this.orderStore.setConnectionStatus('error');

        // 🔥 FIXED: Set proper pagination for demo data
        this.orderStore.setPagination({
            hasNext: false,
            nextCursor: '',
            prevCursor: ''
        });

        this.showToast(`Failed to refresh orders: ${errorMessage}`, 'error');
    }

    private showToast(message: string, type: 'success' | 'error' | 'warning') {
        dashboard.showToast({ message, type });
    }
}