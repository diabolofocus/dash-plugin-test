import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Page, Box, WixDesignSystemProvider } from '@wix/design-system';

import '@wix/design-system/styles.global.css';

import { useStores } from '../hooks/useStores';
import { useOrderController } from '../hooks/useOrderController';
import { LoadingScreen } from './shared/LoadingScreen';
import { ActionsBar } from './shared/ActionsBar';
import { ConnectionStatus } from './shared/ConnectionStatus';
import { OrdersTable } from './OrdersTable/OrdersTable';
import { OrderDetails } from './OrderDetails/OrderDetails';

export const OrderFulfillmentPage: React.FC = observer(() => {
  const { orderStore, uiStore } = useStores();
  const orderController = useOrderController();

  useEffect(() => {
    console.log('OrderFulfillmentPage: Loading orders...');
    orderController.loadOrders();
  }, [orderController]);

  if (uiStore.loading) {
    console.log('OrderFulfillmentPage: Showing loading screen');
    return <LoadingScreen />;
  }


  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      {/* Add inline styles to ensure proper rendering */}
      <style>
        {`
          /* Ensure Wix Design System styles are applied */
          .wix-design-system {
            font-family: HelveticaNeueW01-45Ligh, HelveticaNeueW02-45Ligh, HelveticaNeueW10-45Ligh, Helvetica Neue, Helvetica, Arial, sans-serif;
          }
          
          /* Your existing custom styles */
          [data-hook="selected-order"] {
            background-color:rgb(234, 243, 250) !important;
            border-color:rgb(48, 128, 207) !important;
          }
          .clickable-name {
            color: #3b82f6 !important;
            font-size: 18px;
            cursor: pointer;
          }
          .clickable-info {
            cursor: pointer;
            position: relative;
          }
          .clickable-info:hover {
            color: #3b82f6;
          }
          .clickable-info:hover::after {
            content: "❐";
            margin-left: 8px;
            font-size: 14px;
          }
          .section-title {
            text-decoration: underline;
            font-weight: normal;
            font-size: 16px;
          }
          .order-number-canceled {
            color: #999999 !important;
          }
          .order-number-normal {
            color: #000000 !important;
          }
          .order-text-canceled {
            color: #999999 !important;
          }
          .order-text-normal {
            color: inherit !important;
          }
          .button-canceled {
            background-color: #ECEEEF !important;
            color: #666666 !important;
            border-color: #CCCCCC !important;
          }

          /* Debug styles to see if components are loading */
          .wix-page-header {
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 24px;
          }
          
          .wix-page-content {
            padding: 24px;
            min-height: 100vh;
            background-color: #f8f9fa;
          }
        `}
      </style>

      <Page>
        <Page.Header
          title="Order Fulfillment Center"
          subtitle={`Manage your store orders (${orderStore.orders.length} total)`}
          actionsBar={<ActionsBar />}
        />
        <Page.Content>
          <Box gap="24px" direction="vertical">
            {/* Connection Status */}
            <ConnectionStatus />

            {/* Two Column Layout */}
            <Box direction="horizontal" gap="20px" top="start">
              {/* Left Column: Orders Table */}
              <OrdersTable />

              {/* Right Column: Order Details */}
              <Box width="30%" gap="16px" direction="vertical">
                <OrderDetails />
              </Box>
            </Box>
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
});