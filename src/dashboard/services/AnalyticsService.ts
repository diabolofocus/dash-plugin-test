// services/AnalyticsService.ts
export class AnalyticsService {

    async getAnalyticsData(siteId: string, measurementType: string, startDate: string, endDate?: string) {
        try {
            const url = `https://www.wixapis.com/analytics/v1/sites/${siteId}/data`;

            const requestBody = {
                measurementType: measurementType,
                startDate: startDate,
                endDate: endDate || new Date().toISOString().split('T')[0], // Default to today
                groupBy: "DAY" // Optional: group by day for time series
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await this.getAuthToken()}` // You'll need to implement this
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }

            const data = await response.json();
            return {
                success: true,
                data: data,
                measurementType: measurementType
            };

        } catch (error: any) {
            console.error(`❌ Analytics API error for ${measurementType}:`, error);
            return {
                success: false,
                error: error.message,
                measurementType: measurementType
            };
        }
    }

    async getAuthToken(): Promise<string> {
        // This will depend on your authentication setup
        // You might get this from your backend or use Wix's authentication
        throw new Error('Authentication not implemented - you need to add your auth logic here');
    }

    // Helper method to get multiple analytics metrics at once
    async getMultipleAnalytics(siteId: string, dateRange: { startDate: string; endDate?: string }) {
        const measurementTypes = ['TOTAL_SALES', 'TOTAL_ORDERS', 'TOTAL_SESSIONS'];

        const promises = measurementTypes.map(type =>
            this.getAnalyticsData(siteId, type, dateRange.startDate, dateRange.endDate)
        );

        const results = await Promise.allSettled(promises);

        const analytics: { [key: string]: any } = {};

        results.forEach((result, index) => {
            const measurementType = measurementTypes[index];

            if (result.status === 'fulfilled' && result.value.success) {
                analytics[measurementType] = result.value.data;
            } else {
                console.warn(`Failed to get ${measurementType}:`,
                    result.status === 'rejected' ? result.reason : result.value.error);
                analytics[measurementType] = null;
            }
        });

        return analytics;
    }

    // Calculate date ranges for different periods
    getDateRange(period: 'today' | 'yesterday' | '7days' | '30days' | '365days'): { startDate: string; endDate: string } {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (period) {
            case 'today':
                return {
                    startDate: today.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                return {
                    startDate: yesterday.toISOString().split('T')[0],
                    endDate: yesterday.toISOString().split('T')[0]
                };
            case '7days':
                const sevenDaysAgo = new Date(today);
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                return {
                    startDate: sevenDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
            case '30days':
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return {
                    startDate: thirtyDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
            case '365days':
                const oneYearAgo = new Date(today);
                oneYearAgo.setDate(oneYearAgo.getDate() - 365);
                return {
                    startDate: oneYearAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
            default:
                const defaultThirtyDaysAgo = new Date(today);
                defaultThirtyDaysAgo.setDate(defaultThirtyDaysAgo.getDate() - 30);
                return {
                    startDate: defaultThirtyDaysAgo.toISOString().split('T')[0],
                    endDate: today.toISOString().split('T')[0]
                };
        }
    }
}