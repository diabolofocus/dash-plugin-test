// components/shared/LoadingScreen.tsx
import React from 'react';
import { Page, Box, Loader, Text, WixDesignSystemProvider } from '@wix/design-system';

export const LoadingScreen: React.FC = () => (
    <WixDesignSystemProvider features={{ newColorsBranding: true }}>
        <Page>
            <Page.Header title="Orders" />
            <Page.Content>
                <Box align="center" paddingTop="300px">
                    <Box direction="vertical" align="center" gap="20px">
                        <Loader size="medium" />
                        <Text size="medium" align="center">
                            Loading orders dashboard...
                        </Text>
                    </Box>
                </Box>
            </Page.Content>
        </Page>
    </WixDesignSystemProvider>
);