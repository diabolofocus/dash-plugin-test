import React, { type FC } from 'react';
import {
  Page,
  WixDesignSystemProvider,
  Box,
  Card,
  Text,
  Button,
  Heading,
  Divider
} from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';
import { dashboard } from '@wix/dashboard';
import '@wix/design-system/styles.global.css';

// Import your existing NotificationSettings component
// Adjust the path based on your project structure
import { NotificationSettings } from '../../components/NotificationSettings/NotificationSettings';
import { ComponentsVisibility } from '../../components/ComponentsVisibility/ComponentsVisibility';


const DashboardPage: FC = () => {
  const handleBackToOrders = () => {
    // Navigate back to main orders page
    dashboard.navigate({ pageId: '1702fa3a-de5c-44c4-8e64-27737b4d8c2f' });
  };

  const handleSaveSettings = () => {
    // Handle saving all settings
    dashboard.showToast({
      message: 'Settings saved successfully!',
      type: 'success'
    });
  };

  const handleResetSettings = () => {
    // Handle resetting to defaults
    dashboard.showToast({
      message: 'Settings reset to defaults',
      type: 'standard'
    });
  };

  return (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
      <Page height="100vh">
        <Page.Header
          title="Orders Dashboard Settings"
          subtitle="Configure your order preferences"
          onBackClicked={handleBackToOrders}
          showBackButton={true}
        />

        <Page.Content>
          <Box
            direction="vertical"
            gap="32px"
            width="100%"
            margin="0 auto"
            padding="24px"
          >

            {/* Notifications Section */}
            <NotificationSettings />

            {/* Components Section */}
            <ComponentsVisibility />

            {/* Footer Actions */}
            <Box direction="horizontal" align="space-between" paddingTop="24px">
              <Button
                onClick={handleBackToOrders}
                prefixIcon={<Icons.ChevronLeft />}
                size="medium"
                skin="standard"
                priority="secondary"
              >
                Back to Orders
              </Button>

              <Box direction="horizontal" gap="12px">
                <Button
                  onClick={handleResetSettings}
                  size="medium"
                  skin="standard"
                  priority="secondary"
                >
                  Reset to Defaults
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  size="medium"
                  skin="standard"
                >
                  Save All Changes
                </Button>
              </Box>
            </Box>
          </Box>
        </Page.Content>
      </Page>
    </WixDesignSystemProvider>
  );
};

export default DashboardPage;