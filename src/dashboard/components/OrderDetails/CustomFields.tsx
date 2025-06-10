// components/OrderDetails/CustomFields.tsx
import React from 'react';
import { Box, Text } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import type { Order } from '../../types/Order';

interface WixCustomField {
    title: string;
    translatedTitle?: string;
    value: {
        stringValue?: string;
        numberValue?: number;
        booleanValue?: boolean;
        dateValue?: string;
        [key: string]: any;
    };
}

interface CustomFieldsProps {
    order: Order;
}

export const CustomFields: React.FC<CustomFieldsProps> = ({ order }) => {
    const orderController = useOrderController();

    const getCustomFields = (): WixCustomField[] => {
        const fields: WixCustomField[] = [];

        // Helper function to validate Wix custom field structure
        const validateWixCustomField = (item: any): item is WixCustomField => {
            return item &&
                typeof item === 'object' &&
                (typeof item.title === 'string' || typeof item.translatedTitle === 'string') &&
                item.value !== undefined &&
                typeof item.value === 'object';
        };

        // Helper function to safely add fields from an array
        const addFieldsFromArray = (arr: any[]): boolean => {
            const validFields = arr.filter(validateWixCustomField);
            if (validFields.length > 0) {
                fields.push(...validFields);
                return true;
            }
            return false;
        };

        try {
            // PRIORITY 1: Check order.customFields (top level) - Most likely location
            if (order.customFields) {
                try {
                    // Method 1: JSON serialization to handle MobX proxies
                    const jsonString = JSON.stringify(order.customFields);
                    const parsed = JSON.parse(jsonString) as any[];

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (addFieldsFromArray(parsed)) {
                            return fields;
                        }
                    }
                } catch (e) {
                    // Fallback: Try Array.from for proxy arrays
                    try {
                        const regularArray = Array.from(order.customFields) as any[];
                        if (regularArray.length > 0) {
                            if (addFieldsFromArray(regularArray)) {
                                return fields;
                            }
                        }
                    } catch (e2) {
                        // Fallback: Direct iteration
                        try {
                            if (order.customFields.length > 0) {
                                const directFields: any[] = [];
                                for (let i = 0; i < order.customFields.length; i++) {
                                    if (order.customFields[i]) {
                                        directFields.push(order.customFields[i]);
                                    }
                                }
                                if (addFieldsFromArray(directFields)) {
                                    return fields;
                                }
                            }
                        } catch (e3) {
                            // Continue to next priority
                        }
                    }
                }
            }

            // PRIORITY 2: Check rawOrder.customFields as fallback
            const rawCustomFields = order.rawOrder?.customFields;
            if (rawCustomFields) {
                try {
                    const jsonString = JSON.stringify(rawCustomFields);
                    const parsed = JSON.parse(jsonString) as any[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        if (addFieldsFromArray(parsed)) {
                            return fields;
                        }
                    }
                } catch (e) {
                    // Try other methods for rawOrder.customFields
                    try {
                        const regularArray = Array.from(rawCustomFields) as any[];
                        if (regularArray.length > 0) {
                            if (addFieldsFromArray(regularArray)) {
                                return fields;
                            }
                        }
                    } catch (e2) {
                        // Continue
                    }
                }
            }

        } catch (error) {
            console.error('Error processing custom fields:', error);
        }

        return fields;
    };

    const customFields = getCustomFields();

    // Don't render anything if no custom fields
    if (!customFields || customFields.length === 0) {
        return null;
    }

    const handleFieldClick = (field: WixCustomField) => {
        // Extract the actual value based on Wix custom field structure
        let fieldValue = '';

        if (field.value.stringValue !== undefined) {
            fieldValue = field.value.stringValue;
        } else if (field.value.numberValue !== undefined) {
            fieldValue = String(field.value.numberValue);
        } else if (field.value.booleanValue !== undefined) {
            fieldValue = String(field.value.booleanValue);
        } else if (field.value.dateValue !== undefined) {
            fieldValue = field.value.dateValue;
        } else {
            // Fallback: stringify the entire value object
            fieldValue = JSON.stringify(field.value, null, 2);
        }

        const fieldTitle = field.translatedTitle || field.title || 'Custom Field';
        orderController.copyToClipboard(fieldValue, fieldTitle);
    };

    return (
        <Box gap="12px" direction="vertical">
            <Text size="small" className="section-title">Custom Fields:</Text>

            <Box gap="8px" direction="vertical">
                {customFields.map((field, index) => {
                    const fieldTitle = field.translatedTitle || field.title || `Field ${index + 1}`;

                    // Extract display value based on Wix custom field structure
                    let displayValue = '';
                    if (field.value.stringValue !== undefined) {
                        displayValue = field.value.stringValue;
                    } else if (field.value.numberValue !== undefined) {
                        displayValue = String(field.value.numberValue);
                    } else if (field.value.booleanValue !== undefined) {
                        displayValue = String(field.value.booleanValue);
                    } else if (field.value.dateValue !== undefined) {
                        displayValue = field.value.dateValue;
                    } else {
                        // Fallback: stringify the entire value object
                        displayValue = JSON.stringify(field.value, null, 2);
                    }

                    return (
                        <Box key={`custom-field-${index}`} gap="4px" direction="vertical">
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
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    cursor: 'pointer'
                                }}
                            >
                                {displayValue}
                            </Text>
                        </Box>
                    );
                })}
            </Box>
        </Box>
    );
};