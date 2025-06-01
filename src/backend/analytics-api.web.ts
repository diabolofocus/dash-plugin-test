// src/backend/analytics-api.web.ts
import { webMethod, Permissions } from '@wix/web-methods';

// Web method to fetch analytics data for the last 30 days
export const getStoreAnalytics = webMethod(
    Permissions.Anyone,
    async () => {
        try {
            console.log('🔍 Backend: Starting analytics data fetch...');

            // Get date range for last 30 days
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 30);

            const dateRange = {
                startDate: startDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
                endDate: endDate.toISOString().split('T')[0]
            };

            console.log('📅 Backend: Date range:', dateRange);

            try {
                // Import analytics module
                const { analyticsData } = await import('@wix/analytics-data');
                console.log('📦 Backend: Analytics module imported successfully');

                // First, try without elevation (recommended approach)
                console.log('🎯 Backend: Attempting direct analytics call (no elevation)...');

                // Use the proper enum values from the imported module
                const measurementTypes = [
                    analyticsData.MeasureNameEnum.TOTAL_SALES,
                    analyticsData.MeasureNameEnum.TOTAL_ORDERS
                ];
                console.log('📊 Backend: Measurement types:', measurementTypes);

                const response = await analyticsData.getAnalyticsData(
                    measurementTypes,
                    {
                        dateRange,
                        timeZone: 'UTC'
                    }
                );

                console.log('✅ Backend: Direct analytics call succeeded:', response);

                // Extract data from response
                let totalSales = 0;
                let totalOrders = 0;

                if (response.data && Array.isArray(response.data)) {
                    response.data.forEach(measure => {
                        console.log('📋 Backend: Processing measure:', measure);

                        if (measure.type === 'TOTAL_SALES') {
                            totalSales = measure.total || 0;
                        } else if (measure.type === 'TOTAL_ORDERS') {
                            totalOrders = measure.total || 0;
                        }
                    });
                }

                // Calculate average order value
                const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

                const analyticsResult = {
                    success: true,
                    data: {
                        sales: totalSales,
                        orders: totalOrders,
                        avgOrderValue: avgOrderValue
                    },
                    dateRange,
                    method: 'direct',
                    message: `Analytics data retrieved for ${dateRange.startDate} to ${dateRange.endDate}`
                };

                console.log('✅ Backend: Analytics result:', analyticsResult);
                return analyticsResult;

            } catch (directError) {
                console.warn('⚠️ Backend: Direct call failed, trying with elevation...', directError);

                // If direct call fails, try with elevation
                try {
                    const { analyticsData } = await import('@wix/analytics-data');
                    const { auth } = await import('@wix/essentials');

                    console.log('🔐 Backend: Attempting elevated analytics call...');

                    const elevatedGetAnalyticsData = auth.elevate(analyticsData.getAnalyticsData);

                    const response = await elevatedGetAnalyticsData(
                        [
                            analyticsData.MeasureNameEnum.TOTAL_SALES,
                            analyticsData.MeasureNameEnum.TOTAL_ORDERS
                        ],
                        {
                            dateRange,
                            timeZone: 'UTC'
                        }
                    );

                    console.log('✅ Backend: Elevated analytics call succeeded:', response);

                    // Extract data from response
                    let totalSales = 0;
                    let totalOrders = 0;

                    if (response.data && Array.isArray(response.data)) {
                        response.data.forEach(measure => {
                            if (measure.type === 'TOTAL_SALES') {
                                totalSales = measure.total || 0;
                            } else if (measure.type === 'TOTAL_ORDERS') {
                                totalOrders = measure.total || 0;
                            }
                        });
                    }

                    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

                    return {
                        success: true,
                        data: {
                            sales: totalSales,
                            orders: totalOrders,
                            avgOrderValue: avgOrderValue
                        },
                        dateRange,
                        method: 'elevated',
                        message: `Analytics data retrieved via elevation for ${dateRange.startDate} to ${dateRange.endDate}`
                    };

                } catch (elevatedError) {
                    console.error('❌ Backend: Both direct and elevated calls failed');
                    console.error('❌ Direct error:', directError);
                    console.error('❌ Elevated error:', elevatedError);

                    throw new Error(`Analytics API unavailable. Direct: ${directError.message}. Elevated: ${elevatedError.message}`);
                }
            }

        } catch (error) {
            console.error('❌ Backend: General error:', error);

            const errorMessage = error instanceof Error ? error.message : String(error);

            return {
                success: false,
                error: errorMessage,
                data: {
                    sales: 0,
                    orders: 0,
                    avgOrderValue: 0
                },
                message: `Failed to fetch analytics: ${errorMessage}`,
                troubleshooting: {
                    suggestion: 'Check app permissions for "Site Analytics - read permissions"',
                    docs: 'https://dev.wix.com/docs/sdk/backend-modules/analytics-data/analytics-data/get-analytics-data'
                }
            };
        }
    }
);

// Simplified version for testing permissions
export const testAnalyticsPermissions = webMethod(
    Permissions.Anyone,
    async () => {
        try {
            console.log('🧪 Backend: Testing analytics permissions...');

            const { analyticsData } = await import('@wix/analytics-data');

            // Test with minimal request
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7); // Just 7 days for testing

            const response = await analyticsData.getAnalyticsData(
                [analyticsData.MeasureNameEnum.TOTAL_SALES],
                {
                    dateRange: {
                        startDate: startDate.toISOString().split('T')[0],
                        endDate: endDate.toISOString().split('T')[0]
                    },
                    timeZone: 'UTC'
                }
            );

            return {
                success: true,
                message: 'Analytics permissions are working!',
                testResponse: response
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                message: 'Analytics permissions test failed'
            };
        }
    }
);