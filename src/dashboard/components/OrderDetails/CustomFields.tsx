// components/OrderDetails/CustomFields.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import type { Order, CustomField } from '../../types/Order';

interface CustomFieldsProps {
    order: Order;
}

export const CustomFields: React.FC<CustomFieldsProps> = ({ order }) => {
    const orderController = useOrderController();

    // Get custom fields from different possible locations
    const getCustomFields = (): CustomField[] => {
        // Try multiple locations where custom fields might be stored
        if (order.customFields && order.customFields.length > 0) {
            return order.customFields;
        }

        if (order.rawOrder?.customFields && order.rawOrder.customFields.length > 0) {
            return order.rawOrder.customFields;
        }

        // Check for additional custom field locations in raw order
        if (order.rawOrder?.additionalFields && order.rawOrder.additionalFields.length > 0) {
            return order.rawOrder.additionalFields;
        }

        return [];
    };

    const customFields = getCustomFields();

    // Don't render anything if no custom fields
    if (!customFields || customFields.length === 0) {
        return null;
    }

    const handleFieldClick = (field: CustomField) => {
        const fieldValue = typeof field.value === 'object' ?
            JSON.stringify(field.value) :
            String(field.value || '');

        const fieldTitle = field.translatedTitle || field.title || 'Custom Field';

        orderController.copyToClipboard(fieldValue, fieldTitle);
    };

    return (
        <Box gap="12px" direction="vertical">
            <Text size="small" className="section-title">Custom Fields:</Text>

            <Box gap="8px" direction="vertical">
                {customFields.map((field, index) => {
                    const fieldTitle = field.translatedTitle || field.title || `Field ${index + 1}`;
                    const fieldValue = typeof field.value === 'object' ?
                        JSON.stringify(field.value, null, 2) :
                        String(field.value || '');

                    return (
                        <Box key={index} gap="4px" direction="vertical">
                            {/* Field Title */}
                            <Text size="tiny" secondary weight="bold">
                                {fieldTitle}:
                            </Text>

                            {/* Field Value - Clickable */}
                            <Text
                                size="small"
                                className="clickable-info"
                                onClick={() => handleFieldClick(field)}
                                style={{
                                    paddingLeft: '8px',
                                    borderLeft: '2px solid #e5e7eb',
                                    whiteSpace: 'pre-wrap', // Preserve formatting for JSON
                                    wordBreak: 'break-word'
                                }}
                            >
                                {fieldValue}
                            </Text>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};