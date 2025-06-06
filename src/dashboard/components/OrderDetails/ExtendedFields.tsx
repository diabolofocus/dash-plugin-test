// components/OrderDetails/ExtendedFields.tsx
import React from 'react';
import { Box, Text, Heading, Card } from '@wix/design-system';
import type { Order } from '../../types/Order';

interface ExtendedFieldsProps {
    order: Order;
}

const getExtendedFieldsData = (order: Order) => {
    // Try to get extended fields from different possible locations
    const customFields = order.customFields || order.rawOrder?.customFields || [];
    const extendedFields = order.extendedFields || order.rawOrder?.extendedFields || {};

    return {
        customFields,
        extendedFields
    };
};

export const ExtendedFields: React.FC<ExtendedFieldsProps> = ({ order }) => {
    const { customFields, extendedFields } = getExtendedFieldsData(order);

    // Don't render if no extended fields data exists
    if (!customFields?.length && !extendedFields?.namespaces) {
        return null;
    }

    return (
        <Card>
            <Card.Content>
                <Box direction="vertical" gap="16px" paddingTop="20px" paddingBottom="20px" paddingLeft="20px" paddingRight="20px">
                    <Heading size="small">Extended Fields</Heading>

                    {/* Custom Fields */}
                    {customFields && customFields.length > 0 && (
                        <Box direction="vertical" gap="12px">
                            <Text size="small" weight="bold" secondary>Custom Fields</Text>
                            {customFields.map((field, index) => (
                                <Box key={index} direction="horizontal" align="center" style={{ justifyContent: 'space-between', width: '100%' }}>
                                    <Text size="small" secondary>
                                        {field.translatedTitle || field.title}:
                                    </Text>
                                    <Text size="small" weight="normal">
                                        {typeof field.value === 'object'
                                            ? JSON.stringify(field.value)
                                            : String(field.value)
                                        }
                                    </Text>
                                </Box>
                            ))}
                        </Box>
                    )}

                    {/* Extended Fields Namespaces */}
                    {extendedFields?.namespaces && Object.keys(extendedFields.namespaces).length > 0 && (
                        <Box direction="vertical" gap="12px">
                            <Text size="small" weight="bold" secondary>Extended Fields</Text>
                            {Object.entries(extendedFields.namespaces).map(([namespace, fields]) => (
                                <Box key={namespace} direction="vertical" gap="8px">
                                    <Text size="tiny" secondary style={{ textTransform: 'uppercase' }}>
                                        {namespace}
                                    </Text>
                                    {Object.entries(fields).map(([fieldKey, fieldValue]) => (
                                        <Box
                                            key={fieldKey}
                                            direction="horizontal"
                                            align="center"
                                            paddingLeft="12px"
                                            style={{ justifyContent: 'space-between', width: '100%' }}
                                        >
                                            <Text size="small" secondary>
                                                {fieldKey}:
                                            </Text>
                                            <Text size="small" weight="normal">
                                                {typeof fieldValue === 'object'
                                                    ? JSON.stringify(fieldValue)
                                                    : String(fieldValue)
                                                }
                                            </Text>
                                        </Box>
                                    ))}
                                </Box>
                            ))}
                        </Box>
                    )}
                </Box>
            </Card.Content>
        </Card>
    );
};