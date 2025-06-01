// components/shared/ActionsBar.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Loader, Box } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { dashboard } from '@wix/dashboard';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';

const AddNewOrderButton: React.FC = () => {
    const handleAddNewOrder = async () => {
        try {
            // Method 1: Try to navigate using dashboard.navigate() with overlay mode
            try {
                // Navigate to the orders page in overlay mode for better UX
                await dashboard.navigate(
                    { pageId: "ecom-platform" }, // eCommerce platform page
                    {
                        displayMode: "overlay", // Open in overlay modal
                        history: "push" // Add to browser history
                    }
                );

                dashboard.showToast({
                    message: 'Opening orders page in overlay...',
                    type: 'success'
                });

                return;
            } catch (navigateError) {
                console.warn('Could not navigate to ecom-platform with overlay:', navigateError);

                // Try alternative pageIds with overlay
                const alternativePageIds = ["orders", "ecom-orders", "ecom.orders"];

                for (const pageId of alternativePageIds) {
                    try {
                        await dashboard.navigate(
                            { pageId },
                            {
                                displayMode: "overlay",
                                history: "push"
                            }
                        );

                        dashboard.showToast({
                            message: `Opening ${pageId} page in overlay...`,
                            type: 'success'
                        });

                        return;
                    } catch (altError) {
                        console.warn(`Could not navigate to ${pageId}:`, altError);
                    }
                }
            }

            // Method 2: If overlay navigation fails, try opening in new tab as fallback
            let siteId = null;

            try {
                // Get the current URL
                let url = window.location.href;

                // If we're in an iframe, try to get parent URL
                try {
                    if (window.parent && window.parent !== window) {
                        url = window.parent.location.href;
                    }
                } catch (e) {
                    // Cross-origin restriction, use current window URL
                    console.log('Using current window URL due to cross-origin restrictions');
                }

                console.log('Checking URL for siteId:', url);

                // Extract siteId from URL pattern: /dashboard/{siteId}/
                const siteIdMatch = url.match(/\/dashboard\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\//i);
                if (siteIdMatch) {
                    siteId = siteIdMatch[1];
                    console.log('Extracted siteId from URL:', siteId);
                }
            } catch (urlError) {
                console.warn('Could not extract siteId from URL:', urlError);
            }

            // Method 3: Try using getAppInstance (if @wix/app-management is available)
            if (!siteId) {
                try {
                    const { appInstances } = await import('@wix/app-management');
                    const response = await appInstances.getAppInstance();
                    siteId = response.site?.siteId;
                    console.log('Retrieved siteId from getAppInstance:', siteId);
                } catch (appError) {
                    console.warn('Could not get siteId from getAppInstance (package may not be installed):', appError);
                }
            }

            if (siteId) {
                // Construct the URL for creating a new draft order
                const newOrderUrl = `https://manage.wix.com/dashboard/${siteId}/ecom-platform/draft-order`;

                console.log('Opening new order URL in new tab:', newOrderUrl);

                // Open in new tab as final fallback
                window.open(newOrderUrl, '_blank', 'noopener,noreferrer');

                dashboard.showToast({
                    message: 'Opening new order page in new tab...',
                    type: 'success'
                });

            } else {
                // Final fallback: Show helpful message
                console.warn('Could not determine siteId using any method');
                dashboard.showToast({
                    message: 'To add a new order, go to Store > Orders in your dashboard and click "Add Order"',
                    type: 'warning'
                });
            }
        } catch (error) {
            console.error('Error navigating to new order page:', error);
            dashboard.showToast({
                message: 'To add a new order, go to Store > Orders in your dashboard and click "Add Order"',
                type: 'warning'
            });
        }
    };

    return (
        <Button
            size="medium"
            border="outlined"
            onClick={handleAddNewOrder}
            prefixIcon={<Icons.Add />}
        >
            Add New Order
        </Button>
    );
};

const RefreshButton: React.FC = observer(() => {
    const { uiStore } = useStores();
    const orderController = useOrderController();

    return (
        <Button
            size="medium"
            priority="secondary"
            onClick={() => orderController.refreshOrders()}
            disabled={uiStore.refreshing}
            prefixIcon={uiStore.refreshing ? <Loader size="tiny" /> : <Icons.Refresh />}
        >
            {uiStore.refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
    );
});

export const ActionsBar: React.FC = observer(() => {
    return (
        <Box gap="12px" direction="horizontal">
            <RefreshButton />
            <AddNewOrderButton />
        </Box>
    );
});