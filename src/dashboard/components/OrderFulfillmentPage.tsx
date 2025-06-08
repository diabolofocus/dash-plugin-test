// components/OrderFulfillmentPage.tsx
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Page, Layout, Cell, WixDesignSystemProvider, Box } from '@wix/design-system';

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

    const initializeData = async () => {
      await orderController.loadOrders();
      await orderController.loadAnalyticsForPeriod('30days'); // Load 30-day analytics
    };

    initializeData();
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
        `}
      </style>

      <Page height="100vh">
        <Page.Header
          title="Orders"
          subtitle={`Manage and fulfill your store orders`}
          actionsBar={<ActionsBar />}
        />
        <Page.Content>
          <Layout>
            {/* Connection Status Row */}
            <Cell>
              <ConnectionStatus />
            </Cell>

            {/* Two-thirds layout with sidebar */}
            <Cell span={8}>
              <OrdersTable />
            </Cell>

            <Cell span={4}>
              <Page.Sticky>
                <OrderDetails />
              </Page.Sticky>
            </Cell>
          </Layout>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
});