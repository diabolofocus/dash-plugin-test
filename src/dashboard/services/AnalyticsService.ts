// services/AnalyticsService.ts
export class AnalyticsService {
    /**
     * Fetch store analytics data for the last 30 days
     */
    async fetchStoreAnalytics() {
        try {
            console.log('📊 AnalyticsService: Calling backend getStoreAnalytics via HTTP...');

            // Call the backend web method via HTTP API
            const response = await fetch('/_api/analytics-api/getStoreAnalytics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('📡 AnalyticsService: Backend response status:', response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📈 AnalyticsService: Backend response:', result);

            return result;
        } catch (error) {
            console.error('❌ AnalyticsService: Error calling backend:', error);

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                data: {
                    sales: 0,
                    orders: 0,
                    avgOrderValue: 0
                },
                message: `Failed to fetch analytics: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
}

