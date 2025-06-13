// components/shared/ActionsBar.tsx
import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Loader, Box } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { dashboard } from '@wix/dashboard';
import { pages } from '@wix/ecom/dashboard';
import { useStores } from '../../hooks/useStores';
import { useOrderController } from '../../hooks/useOrderController';
import { getSiteIdFromContext } from '../../utils/get-siteId';


const AddNewOrderButton: React.FC = () => {

    const handleAddNewOrder = async () => {
        try {

            dashboard.navigate(
                pages.newOrder(),
                {
                    displayMode: "overlay"
                }
            );

            // dashboard.showToast({
            //     message: 'New Order page',
            //     type: 'standard',
            //     timeout: 'none', // Keep the toast persistent
            //     action: {
            //         uiType: 'button',
            //         text: 'Go back to App',
            //         removeToastOnClick: true,
            //         onClick: () => {
            //             console.log('🔗 Attempting to navigate back to app...');

            //             // Get site ID
            //             const siteId = getSiteIdFromContext();
            //             if (siteId) {
            //                 const appUrl = `https://manage.wix.com/dashboard/${siteId}/fab32ea8-b5a8-48c6-a2c5-0afcc6053ff2`;
            //                 console.log('App URL:', appUrl);

            //                 // Try navigation
            //                 dashboard.navigateBack(
            //                 );
            //             } else {
            //                 console.warn('Site ID not found, using fallback navigation');
            //                 window.history.back();
            //             }
            //         }
            //     }
            // });

        } catch (error) {
            console.error('Error navigating to new order page:', error);
            dashboard.showToast({
                message: 'Failed to open new order page. Please try again.',
                type: 'error'
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

// const AddNewOrderButton: React.FC = () => {
//     const handleAddNewOrder = async () => {
//         try {
//             // Import pages from ecom/dashboard
//             const { pages } = await import('@wix/ecom/dashboard');

//             // Navigate directly to the New Order page using the official method
//             await dashboard.navigate(pages.newOrder());

//             dashboard.showToast({
//                 message: 'Opening new order page...',
//                 type: 'success'
//             });

//         } catch (error) {
//             console.error('Error navigating to new order page:', error);
//             dashboard.showToast({
//                 message: 'Failed to open new order page. Please try again.',
//                 type: 'error'
//             });
//         }
//     };

//     return (
//         <Button
//             size="medium"
//             border="outlined"
//             onClick={handleAddNewOrder}
//             suffixIcon={<Icons.Add />}
//         >
//             Add New Order
//         </Button>
//     );
// };

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