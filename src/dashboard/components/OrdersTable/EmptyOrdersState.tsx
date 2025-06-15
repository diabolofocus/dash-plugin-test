
// ==================================================
// File: components/OrdersTable/components/EmptyOrdersState.tsx
// ==================================================

import React from 'react';
import { Box, Text, Button } from '@wix/design-system';
import * as Icons from '@wix/wix-ui-icons-common';

interface EmptyOrdersStateProps {
    hasActiveSearch: boolean;
    searchQuery: string;
    onClearSearch: () => void;
}

export const EmptyOrdersState: React.FC<EmptyOrdersStateProps> = ({
    hasActiveSearch,
    searchQuery,
    onClearSearch
}) => (
    <Box align="center" paddingTop="40px" paddingBottom="40px" direction="vertical" gap="12px">
        <Icons.Search size="36px" style={{ color: '#ccc' }} />
        <Text secondary>
            {hasActiveSearch
                ? `No orders found matching "${searchQuery}"`
                : 'No orders found'
            }
        </Text>
        {hasActiveSearch && (
            <Button
                priority="secondary"
                size="small"
                onClick={onClearSearch}
            >
                Clear search to see all orders
            </Button>
        )}
    </Box>
);