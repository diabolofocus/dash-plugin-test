import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Page, Cell, Box, WixDesignSystemProvider } from '@wix/design-system';

import '@wix/design-system/styles.global.css';

import { useStores } from '../hooks/useStores';
import { useOrderController } from '../hooks/useOrderController';
import { LoadingScreen } from './shared/LoadingScreen';
import { ActionsBar } from './shared/ActionsBar';
import { ConnectionStatus } from './shared/ConnectionStatus';
import { OrdersTableWithTabs } from './OrdersTable/OrdersTableWithTabs'; // Updated import
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

          /* Debug styles to see if components are loading */
          .wix-page-header {
            background-color: #ffffff;
            border-bottom: 1px solid #e5e7eb;
            padding: 16px 16px;
          }
          
          .wix-page-content {
            padding: 24px;
            min-height: 100vh;
            background-color: #f8f9fa;
          }

          /* FIXED: Force sticky column height and scrolling */
          .sticky-order-details {
            position: sticky !important;
            top: 85px !important;
            width: 30% !important;
            height: calc(100vh - 230px) !important;
            max-height: calc(100vh - 230px) !important;
            min-height: calc(100vh - 230px) !important;
            overflow-y: auto !important;
            overflow-x: hidden !important;
            align-self: flex-start !important;
            border-radius: 8px;
            
            scrollbar-width: none !important; /* Firefox */
            -ms-overflow-style: none !important; /* Internet Explorer 10+ */
          }

          /* Ensure the main content container has proper height */
          .main-content-container {
            min-height: calc(100vh - 226px) !important;
          }

          /* Make sure the horizontal container doesn't interfere */
          .horizontal-container {
            align-items: flex-start !important;
            min-height: calc(100vh - 226px) !important;
          }

          /* Ensure OrdersTable maintains horizontal scroll */
          .orders-table-container {
            width: 100%;
            overflow-x: auto;
            min-width: 0;
          }

          /* Force table to maintain its scroll behavior */
          .orders-table-container table {
            min-width: max-content;
          }

          /* Responsive grid adjustments */
          @media (max-width: 1200px) {
            .main-grid-container {
              grid-template-columns: 1fr 350px !important;
            }
          }

          @media (max-width: 900px) {
            .main-grid-container {
              grid-template-columns: 1fr !important;
              grid-template-rows: auto auto !important;
            }
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            height: '100%'
          }}>
            {/* Connection Status Row */}
            <ConnectionStatus />

            {/* Two-thirds layout with sidebar - both sticky */}
            <div className="main-grid-container" style={{
              display: 'grid',
              gridTemplateColumns: '1fr 400px', // Fixed width for details panel
              gap: '24px',
              flex: 1,
              minHeight: 0, // Important for proper scrolling
              alignItems: 'start'
            }}>
              <div style={{
                minWidth: 0, // Important for table overflow
                overflow: 'hidden' // Ensures table handles its own overflow
              }}>
                <Page.Sticky>
                  <OrdersTableWithTabs />
                </Page.Sticky>
              </div>

              <div style={{
                minWidth: '400px', // Ensure details panel doesn't shrink too much
                maxWidth: '400px'
              }}>
                <Page.Sticky>
                  <OrderDetails />
                </Page.Sticky>
              </div>
            </div>
          </div>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
});