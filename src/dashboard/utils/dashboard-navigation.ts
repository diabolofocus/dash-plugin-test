// navigate-back-overlay-solutions.ts
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';

// Use your existing Order type
interface Order {
    _id: string;
    number: string;
    // Add other properties from your existing Order type as needed
}

// 🚀 SOLUTION 1: NavigateBack onClick (Simple & Clean)
export const handleViewOrderWithNavigateBack = async (order: Order) => {
    try {
        // ✅ USE PROPER WIX NAVIGATION
        await dashboard.navigate(
            pages.orderDetails({
                id: order._id
            })
        );

        // ✅ SHOW TOAST with navigateBack onClick
        dashboard.showToast({
            message: `📋 Order #${order.number} opened. Click below to return to your app.`,
            type: 'success',
            timeout: 'none',
            priority: 'high',
            action: {
                uiType: 'button',
                text: 'Return to App',
                removeToastOnClick: true,
                onClick: () => {
                    // ✅ SIMPLE NAVIGATE BACK - Should work!
                    console.log('🔄 Using dashboard.navigateBack()');
                    dashboard.navigateBack();
                }
            }
        });

    } catch (error) {
        console.error('Failed to navigate to order details:', error);
        dashboard.showToast({
            message: `❌ Failed to open order #${order.number}. Please try again.`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 2: Overlay Mode (BEST APPROACH!)
export const handleViewOrderOverlay = async (order: Order) => {
    try {
        // ✅ OVERLAY MODE - Keeps your app in background!
        await dashboard.navigate(
            pages.orderDetails({
                id: order._id
            }),
            {
                displayMode: "overlay" // 🎯 This is the magic!
            }
        );

        // ✅ SHOW SUCCESS TOAST (user can just close overlay to return)
        dashboard.showToast({
            message: `📋 Order #${order.number} opened in overlay. Close the modal to return to your app.`,
            type: 'success',
            timeout: 'normal' // Auto-dismiss since overlay handles return
        });

        // Optional: Show helpful tip after a delay
        setTimeout(() => {
            dashboard.showToast({
                message: `💡 Tip: Your app remains active in the background. Close the order overlay when done.`,
                type: 'standard',
                timeout: 'normal'
            });
        }, 3000);

    } catch (error) {
        console.error('Failed to navigate to order details in overlay:', error);
        dashboard.showToast({
            message: `❌ Failed to open order #${order.number} in overlay. Please try again.`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 3: Overlay Mode with Return Button (Belt & Suspenders)
export const handleViewOrderOverlayWithReturn = async (order: Order) => {
    try {
        // ✅ OVERLAY MODE NAVIGATION
        await dashboard.navigate(
            pages.orderDetails({
                id: order._id
            }),
            {
                displayMode: "overlay"
            }
        );

        // ✅ SUCCESS TOAST with optional return button
        dashboard.showToast({
            message: `📋 Order #${order.number} opened in overlay.`,
            type: 'success',
            timeout: 'none',
            priority: 'high',
            action: {
                uiType: 'button',
                text: 'Close Overlay',
                removeToastOnClick: true,
                onClick: () => {
                    // ✅ NAVIGATE BACK from overlay
                    console.log('🔄 Closing overlay with navigateBack()');
                    dashboard.navigateBack();
                }
            }
        });

    } catch (error) {
        console.error('Failed to navigate to order details in overlay:', error);
        dashboard.showToast({
            message: `❌ Failed to open order #${order.number} in overlay. Please try again.`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 4: Main Mode with NavigateBack (Fallback)
export const handleViewOrderMainWithBack = async (order: Order) => {
    try {
        // ✅ MAIN MODE NAVIGATION (traditional)
        await dashboard.navigate(
            pages.orderDetails({
                id: order._id
            }),
            {
                displayMode: "main"
            }
        );

        // ✅ TOAST with navigateBack
        dashboard.showToast({
            message: `📋 Order #${order.number} opened. Click to return or use browser back.`,
            type: 'success',
            timeout: 'none',
            priority: 'high',
            action: {
                uiType: 'button',
                text: 'Return to App',
                removeToastOnClick: true,
                onClick: () => {
                    // ✅ NAVIGATE BACK - Browser back button equivalent
                    console.log('🔄 Using dashboard.navigateBack() from main mode');
                    dashboard.navigateBack();
                }
            }
        });

    } catch (error) {
        console.error('Failed to navigate to order details in main mode:', error);
        dashboard.showToast({
            message: `❌ Failed to open order #${order.number}. Please try again.`,
            type: 'error'
        });
    }
};

// 🚀 SOLUTION 5: Smart Mode Detection
export const handleViewOrderSmart = async (order: Order) => {
    try {
        // Check current context using observeState
        let useOverlay = true; // Default to overlay

        dashboard.observeState((componentParams: { displayMode?: string }, environmentState) => {
            // If we're already in an overlay, use main mode to replace it
            if (componentParams.displayMode === 'overlay') {
                useOverlay = false;
                console.log('📱 Already in overlay, using main mode');
            } else {
                console.log('🖥️ In main mode, using overlay');
            }
        });

        // Navigate based on current context
        if (useOverlay) {
            // Use overlay mode
            await dashboard.navigate(
                pages.orderDetails({
                    id: order._id
                }),
                { displayMode: "overlay" }
            );

            dashboard.showToast({
                message: `📋 Order #${order.number} opened in overlay. Close modal to return.`,
                type: 'success',
                timeout: 'normal'
            });
        } else {
            // Use main mode with navigateBack
            await dashboard.navigate(
                pages.orderDetails({
                    id: order._id
                }),
                { displayMode: "main" }
            );

            dashboard.showToast({
                message: `📋 Order #${order.number} opened.`,
                type: 'success',
                timeout: 'none',
                action: {
                    uiType: 'button',
                    text: 'Return to App',
                    removeToastOnClick: true,
                    onClick: () => {
                        dashboard.navigateBack();
                    }
                }
            });
        }

    } catch (error) {
        console.error('Failed smart navigation to order details:', error);
        dashboard.showToast({
            message: `❌ Failed to open order #${order.number}. Please try again.`,
            type: 'error'
        });
    }
};

// 🎯 RECOMMENDED: Try overlay mode first (it's the best UX)
export const handleViewOrder = handleViewOrderOverlay;

// 🔗 USAGE INSTRUCTIONS:
//
// 1. **Try NavigateBack first (if you want main mode):**
//    import { handleViewOrderWithNavigateBack } from '../utils/navigate-back-overlay-solutions';
//    
// 2. **Try Overlay Mode (RECOMMENDED - best UX):**
//    import { handleViewOrderOverlay } from '../utils/navigate-back-overlay-solutions';
//    
// 3. **Test different approaches:**
//    handleViewOrderWithNavigateBack(order);    // navigateBack onClick
//    handleViewOrderOverlay(order);             // Overlay mode (BEST!)
//    handleViewOrderOverlayWithReturn(order);   // Overlay + return button
//    handleViewOrderMainWithBack(order);        // Main mode + navigateBack
//    handleViewOrderSmart(order);               // Context-aware
//
// 4. **Why Overlay Mode is Best:**
//    ✅ Your app stays active in the background
//    ✅ User just closes modal to return (native UX)
//    ✅ No complex return navigation needed
//    ✅ No authentication issues
//    ✅ Clean, professional user experience
//
// 5. **Why NavigateBack Should Work:**
//    ✅ Equivalent to browser back button
//    ✅ Built-in Wix dashboard method
//    ✅ No HTTP authentication required
//    ✅ Simple one-line implementation
//
// 🎉 These solutions use proper Wix APIs and should eliminate all authentication issues!