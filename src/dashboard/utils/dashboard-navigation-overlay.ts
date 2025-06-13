// fixed-order-details-navigation.ts
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';

// Use your existing Order type
interface Order {
    _id: string;
    number: string;
    // Add other properties from your existing Order type as needed
}

// 🔧 Helper: Comprehensive order ID validation and formatting
const validateAndFormatOrderId = (order: Order): string => {
    if (!order) {
        throw new Error('Order object is null or undefined');
    }

    if (!order._id) {
        throw new Error('Order ID (_id) is missing');
    }

    // Convert to string and clean
    let orderId = String(order._id).trim();

    // Remove any potential prefixes (sometimes order IDs have prefixes)
    orderId = orderId.replace(/^(order_|ord_|wix_)?/i, '');

    // Validate GUID format (Wix typically uses GUIDs for order IDs)
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!guidRegex.test(orderId)) {
        console.warn('Order ID does not match GUID format:', orderId);
        // Don't throw error, let Wix handle it
    }

    console.log('✅ Order ID validated:', {
        originalId: order._id,
        cleanedId: orderId,
        orderNumber: order.number,
        isGuid: guidRegex.test(orderId)
    });

    return orderId;
};

// 🚀 SOLUTION 1: Enhanced Overlay with Multiple ID Formats
export const handleViewOrderOverlayEnhanced = (order: Order) => {
    try {
        const orderId = validateAndFormatOrderId(order);

        console.log(`🚀 ENHANCED: Navigating to order ${order.number} (ID: ${orderId})`);

        // ✅ Try original format first
        dashboard.navigate(
            pages.orderDetails({
                id: orderId
            }),
            { displayMode: "overlay" }
        );

        dashboard.showToast({
            message: `📋 Opening Order #${order.number} in overlay...`,
            type: 'success',
            timeout: 'normal'
        });

    } catch (error) {
        console.error('❌ Enhanced overlay navigation failed:', error);

        // ✅ FALLBACK: Try with original ID format
        try {
            console.log('🔄 Trying fallback with original ID format...');
            dashboard.navigate(
                pages.orderDetails({
                    id: order._id // Use original ID without cleaning
                }),
                { displayMode: "overlay" }
            );

            dashboard.showToast({
                message: `📋 Order #${order.number} opened (fallback mode)`,
                type: 'success'
            });

        } catch (fallbackError) {
            console.error('❌ Fallback also failed:', fallbackError);
            dashboard.showToast({
                message: `❌ Cannot open order #${order.number}: ${error.message}`,
                type: 'error'
            });
        }
    }
};

// 🚀 SOLUTION 2: Try Different Parameter Names
export const handleViewOrderAlternativeParams = (order: Order) => {
    try {
        const orderId = validateAndFormatOrderId(order);

        console.log(`🚀 ALTERNATIVE: Trying different parameter formats for order ${order.number}`);

        // ✅ Method 1: Standard approach
        try {
            dashboard.navigate(
                pages.orderDetails({
                    id: orderId
                }),
                { displayMode: "overlay" }
            );

            dashboard.showToast({
                message: `📋 Order #${order.number} opening (method 1)...`,
                type: 'success'
            });

        } catch (method1Error) {
            console.warn('Method 1 failed, trying method 2:', method1Error);

            // ✅ Method 2: Try with different property structure
            try {
                dashboard.navigate(
                    pages.orderDetails({
                        id: orderId,
                        orderId: orderId // Sometimes APIs need both
                    } as any),
                    { displayMode: "overlay" }
                );

                dashboard.showToast({
                    message: `📋 Order #${order.number} opening (method 2)...`,
                    type: 'success'
                });

            } catch (method2Error) {
                console.warn('Method 2 failed, trying method 3:', method2Error);

                // ✅ Method 3: Try with the full order object
                dashboard.navigate(
                    pages.orderDetails({
                        id: orderId,
                        order: order // Pass full order object
                    } as any),
                    { displayMode: "overlay" }
                );

                dashboard.showToast({
                    message: `📋 Order #${order.number} opening (method 3)...`,
                    type: 'success'
                });
            }
        }

    } catch (error) {
        console.error('❌ All alternative methods failed:', error);
        dashboard.showToast({
            message: `❌ Cannot open order #${order.number}: ${error.message}`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 3: Main Mode with Enhanced Error Handling
export const handleViewOrderMainModeRobust = (order: Order) => {
    try {
        const orderId = validateAndFormatOrderId(order);

        console.log(`🚀 MAIN MODE: Navigating to order ${order.number} (ID: ${orderId})`);

        // ✅ Use main mode (no overlay)
        dashboard.navigate(
            pages.orderDetails({
                id: orderId
            })
            // No displayMode = defaults to main mode
        );

        // ✅ Show toast with navigateBack
        dashboard.showToast({
            message: `📋 Order #${order.number} opened. Click below to return.`,
            type: 'success',
            timeout: 'none',
            priority: 'high',
            action: {
                uiType: 'button',
                text: 'Return to App',
                removeToastOnClick: true,
                onClick: () => {
                    console.log('🔄 Using dashboard.navigateBack()');
                    dashboard.navigateBack();
                }
            }
        });

    } catch (error) {
        console.error('❌ Main mode navigation failed:', error);
        dashboard.showToast({
            message: `❌ Cannot open order #${order.number}: ${error.message}`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 4: URL-Based Navigation (Bypasses pages.orderDetails)
export const handleViewOrderDirectURL = (order: Order) => {
    try {
        const orderId = validateAndFormatOrderId(order);

        // ✅ Get current site ID from URL
        const urlParts = window.location.pathname.split('/');
        const dashboardIndex = urlParts.indexOf('dashboard');
        let siteId = 'unknown';

        if (dashboardIndex !== -1 && urlParts[dashboardIndex + 1]) {
            siteId = urlParts[dashboardIndex + 1];
        }

        console.log(`🌐 DIRECT URL: Navigating to order via URL construction`);
        console.log(`Site ID: ${siteId}, Order ID: ${orderId}`);

        // ✅ Use dashboard.navigate with direct pageId and relativeUrl
        dashboard.navigate({
            pageId: "bcdb42a8-2423-4101-add6-cbebc1951bc2", // eCommerce orders page ID
            relativeUrl: `/orders/${orderId}` // Navigate to specific order
        }, {
            displayMode: "overlay"
        });

        dashboard.showToast({
            message: `📋 Order #${order.number} opening via direct URL...`,
            type: 'success',
            timeout: 'normal'
        });

    } catch (error) {
        console.error('❌ Direct URL navigation failed:', error);
        dashboard.showToast({
            message: `❌ Cannot open order #${order.number}: ${error.message}`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 5: Full Debug Mode
export const handleViewOrderFullDebug = (order: Order) => {
    try {
        console.log('🔍 FULL DEBUG MODE START');
        console.log('🔍 Raw order object:', order);
        console.log('🔍 Order._id type:', typeof order._id);
        console.log('🔍 Order._id value:', order._id);
        console.log('🔍 Order.number:', order.number);
        console.log('🔍 Current URL:', window.location.href);

        const orderId = validateAndFormatOrderId(order);

        // ✅ Show all the info in a toast first
        dashboard.showToast({
            message: `🔍 Debug Info: Order ID = ${orderId}, Number = ${order.number}, Type = ${typeof order._id}`,
            type: 'standard',
            timeout: 'none'
        });

        // ✅ Try to build the pages.orderDetails object
        const orderDetailsDestination = pages.orderDetails({ id: orderId });
        console.log('🔍 pages.orderDetails result:', orderDetailsDestination);

        // ✅ Show what we're about to send
        dashboard.showToast({
            message: `🔍 Navigation destination: ${JSON.stringify(orderDetailsDestination)}`,
            type: 'standard',
            timeout: 'none'
        });

        // ✅ Wait 3 seconds then navigate
        setTimeout(() => {
            console.log('🚀 DEBUG: Attempting navigation...');

            dashboard.navigate(
                orderDetailsDestination,
                { displayMode: "overlay" }
            );

            dashboard.showToast({
                message: `📋 Debug navigation attempted for Order #${order.number}`,
                type: 'success'
            });

        }, 3000);

    } catch (error) {
        console.error('❌ DEBUG MODE ERROR:', error);
        dashboard.showToast({
            message: `❌ Debug error: ${error.message}`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 6: Step-by-Step Troubleshooting
export const handleViewOrderStepByStep = (order: Order) => {
    let step = 1;

    const showStep = (message: string, isError = false) => {
        console.log(`Step ${step}: ${message}`);
        dashboard.showToast({
            message: `Step ${step}: ${message}`,
            type: isError ? 'error' : 'standard',
            timeout: 'normal'
        });
        step++;
    };

    try {
        showStep('Starting step-by-step troubleshooting...');

        showStep(`Order validation - ID: ${order._id}, Number: ${order.number}`);

        const orderId = validateAndFormatOrderId(order);
        showStep(`Order ID cleaned: ${orderId}`);

        showStep('Building navigation destination...');
        const destination = pages.orderDetails({ id: orderId });
        showStep(`Destination built: ${JSON.stringify(destination)}`);

        setTimeout(() => {
            showStep('Attempting navigation...');

            try {
                dashboard.navigate(destination, { displayMode: "overlay" });
                showStep('Navigation call completed successfully!');

                // Monitor for errors in the next few seconds
                setTimeout(() => {
                    showStep('Check browser console for any order details page errors...');
                }, 2000);

            } catch (navError) {
                showStep(`Navigation failed: ${navError.message}`, true);
            }

        }, 2000);

    } catch (error) {
        showStep(`Error in step-by-step: ${error.message}`, true);
    }
};

// 🎯 RECOMMENDED: Try these in order
export const handleViewOrder = handleViewOrderOverlayEnhanced;

// 🔗 USAGE INSTRUCTIONS:
//
// **Try these solutions in order until one works:**
//
// 1. **Enhanced Overlay (tries multiple formats):**
//    handleViewOrderOverlayEnhanced(order);
//
// 2. **Alternative Parameters (tries different API params):**
//    handleViewOrderAlternativeParams(order);
//
// 3. **Main Mode (no overlay, with navigateBack):**
//    handleViewOrderMainModeRobust(order);
//
// 4. **Direct URL (bypasses pages.orderDetails):**
//    handleViewOrderDirectURL(order);
//
// 5. **Full Debug (shows all details):**
//    handleViewOrderFullDebug(order);
//
// 6. **Step-by-Step (detailed troubleshooting):**
//    handleViewOrderStepByStep(order);
//
// **Troubleshooting the "undefined" error:**
// The issue appears to be that the order details page receives undefined for the order ID.
// This could be due to:
// - Order ID format not matching what's expected
// - A bug in the ecom dashboard pages
// - Missing parameters in the navigation call
// - Page routing issues in overlay mode
//
// **To debug:**
// 1. Use handleViewOrderFullDebug first to see all details
// 2. Check browser console for additional error messages
// 3. Try handleViewOrderMainModeRobust to see if main mode works
// 4. Compare working vs non-working order IDs if you have any
//
// 🎉 These solutions should help identify and fix the "undefined" order ID issue!