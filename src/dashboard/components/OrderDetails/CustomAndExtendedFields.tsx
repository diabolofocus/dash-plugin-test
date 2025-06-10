// components/OrderDetails/CustomAndExtendedFields.tsx
import React, { useEffect, useState } from 'react';
import { Box, Text, Card } from '@wix/design-system';
import { useOrderController } from '../../hooks/useOrderController';
import type { Order } from '../../types/Order';

// Wix Custom Field structure from eCommerce Orders API
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

// Extended Fields structure (CRM-style)
interface ExtendedFields {
    namespaces?: {
        [namespace: string]: {
            [fieldKey: string]: any;
        };
    };
}

// Extended Field definition from CRM API
interface ExtendedFieldDefinition {
    namespace: string;
    key: string;
    displayName: string;
    dataType: string;
    fieldType: string;
    description?: string;
}

interface CustomAndExtendedFieldsProps {
    order: Order;
}

export const CustomAndExtendedFields: React.FC<CustomAndExtendedFieldsProps> = ({ order }) => {
    const orderController = useOrderController();
    const [fieldDefinitions, setFieldDefinitions] = useState<{ [key: string]: ExtendedFieldDefinition }>({});
    const [loadingDefinitions, setLoadingDefinitions] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Get Custom Fields (eCommerce specific)
    const getCustomFields = (): WixCustomField[] => {
        const fields: WixCustomField[] = [];

        const validateWixCustomField = (item: any): item is WixCustomField => {
            return item &&
                typeof item === 'object' &&
                (typeof item.title === 'string' || typeof item.translatedTitle === 'string') &&
                item.value !== undefined &&
                typeof item.value === 'object';
        };

        const addFieldsFromArray = (arr: any[]): boolean => {
            const validFields = arr.filter(validateWixCustomField);
            if (validFields.length > 0) {
                fields.push(...validFields);
                return true;
            }
            return false;
        };

        try {
            // Check order.customFields (primary location)
            if (order.customFields) {
                try {
                    const jsonString = JSON.stringify(order.customFields);
                    const parsed = JSON.parse(jsonString) as any[];

                    if (Array.isArray(parsed) && parsed.length > 0) {
                        addFieldsFromArray(parsed);
                    }
                } catch (e) {
                    try {
                        const regularArray = Array.from(order.customFields) as any[];
                        if (regularArray.length > 0) {
                            addFieldsFromArray(regularArray);
                        }
                    } catch (e2) {
                        // Continue
                    }
                }
            }

            // Check rawOrder.customFields as fallback
            const rawCustomFields = order.rawOrder?.customFields;
            if (rawCustomFields && fields.length === 0) {
                try {
                    const jsonString = JSON.stringify(rawCustomFields);
                    const parsed = JSON.parse(jsonString) as any[];
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        addFieldsFromArray(parsed);
                    }
                } catch (e) {
                    // Continue
                }
            }

        } catch (error) {
            console.error('Error processing custom fields:', error);
        }

        return fields;
    };

    // Get Extended Fields (CRM-style with namespaces)
    const getExtendedFields = (): ExtendedFields | null => {
        try {
            const possibleLocations = [
                order.extendedFields,
                order.rawOrder?.extendedFields,
                order.rawOrder?.info?.extendedFields,
                order.extendedFields
            ];

            for (const location of possibleLocations) {
                if (location && typeof location === 'object') {
                    if (location.namespaces &&
                        typeof location.namespaces === 'object' &&
                        Object.keys(location.namespaces).length > 0) {
                        return location as ExtendedFields;
                    }

                    const keys = Object.keys(location);
                    if (keys.length > 0 && keys.some(key => typeof location[key] === 'object')) {
                        return { namespaces: location };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error processing extended fields:', error);
            return null;
        }
    };

    // Fetch field definitions using the CLI API endpoint with improved error handling
    const fetchFieldDefinitions = async (fieldKeys: string[]) => {
        if (loadingDefinitions || fieldKeys.length === 0) return;

        setLoadingDefinitions(true);
        setError(null);

        try {
            console.log('Fetching field definitions for keys:', fieldKeys);

            // Build the API URL - handle both development and production
            const baseUrl = import.meta.env.BASE_API_URL ||
                import.meta.env.VITE_API_BASE_URL ||
                window.location.origin;

            const apiUrl = `${baseUrl}/extended-fields`;
            console.log('Making request to:', apiUrl);

            // Use regular fetch with improved error handling
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fieldKeys: fieldKeys
                }),
                // Add credentials for CORS if needed
                credentials: 'include'
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error Response:', errorText);
                throw new Error(`API request failed: ${response.status} ${response.statusText}\nResponse: ${errorText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType?.includes('application/json')) {
                const responseText = await response.text();
                console.error('Non-JSON response received:', responseText);
                throw new Error(`Expected JSON response, got: ${contentType}\nResponse: ${responseText}`);
            }

            const result = await response.json();
            const definitions: ExtendedFieldDefinition[] = result.items || [];

            console.log('API Response:', result);
            console.log('Field definitions received:', definitions);

            // Convert to map for easy lookup
            const definitionsMap: { [key: string]: ExtendedFieldDefinition } = {};
            definitions.forEach(def => {
                definitionsMap[def.key] = def;
                console.log(`Mapped definition: ${def.key} -> "${def.displayName}"`);
            });

            setFieldDefinitions(prev => ({
                ...prev,
                ...definitionsMap
            }));

            console.log('Updated field definitions state:', definitionsMap);

        } catch (error) {
            console.error('Error fetching field definitions:', error);

            // Provide more specific error messages
            let errorMessage = 'Unknown error occurred';
            if (error instanceof TypeError && error.message.includes('fetch')) {
                errorMessage = 'Network error - check your internet connection and API endpoint';
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }

            setError(errorMessage);
        } finally {
            setLoadingDefinitions(false);
        }
    };

    // Get display name for a field using CRM definitions
    const getFieldDisplayName = (namespace: string, fieldKey: string): string => {
        console.log(`Getting display name for ${namespace}.${fieldKey}`);

        // Check if we have a definition for this field
        const fullKey = `${namespace}.${fieldKey}`;
        const directKey = fieldKey;

        // Try both full key and direct key
        const definition = fieldDefinitions[fullKey] || fieldDefinitions[directKey];

        console.log(`Looking for definition with keys: "${fullKey}" or "${directKey}"`);
        console.log('Available definitions:', Object.keys(fieldDefinitions));
        console.log('Found definition:', definition);

        if (definition && definition.displayName) {
            console.log(`Using displayName: "${definition.displayName}"`);
            return definition.displayName;
        }

        // Check if any definition key contains our field key
        const matchingDefinition = Object.values(fieldDefinitions).find(def => {
            return def.key.includes(fieldKey) || fieldKey.includes(def.key.split('.').pop() || '');
        });

        if (matchingDefinition) {
            console.log(`Found matching definition: "${matchingDefinition.displayName}"`);
            return matchingDefinition.displayName;
        }

        // Smart formatting fallback
        const formattedName = fieldKey
            .replace(/^form_field_/, '') // Remove form_field_ prefix
            .replace(/^e/, 'Field ') // Convert 'e391' to 'Field 391'
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());

        console.log(`Using formatted fallback: "${formattedName}"`);
        return formattedName;
    };

    // Get display value for a field
    const getFieldDisplayValue = (namespace: string, fieldKey: string, fieldValue: any): string => {
        const fullKey = `${namespace}.${fieldKey}`;
        const directKey = fieldKey;
        const definition = fieldDefinitions[fullKey] || fieldDefinitions[directKey];

        // Handle boolean values
        if (typeof fieldValue === 'boolean' || (definition && definition.dataType === 'BOOLEAN')) {
            return fieldValue ? 'Yes' : 'No';
        }

        // Handle date values
        if (definition && definition.dataType === 'DATE') {
            if (fieldValue) {
                try {
                    const date = new Date(fieldValue);
                    return date.toLocaleDateString();
                } catch (e) {
                    return String(fieldValue);
                }
            }
            return 'Not set';
        }

        // Handle number values
        if (definition && definition.dataType === 'NUMBER') {
            return String(fieldValue || 0);
        }

        // Default text handling
        return typeof fieldValue === 'object' ? JSON.stringify(fieldValue) : String(fieldValue || '');
    };

    const customFields = getCustomFields();
    const extendedFields = getExtendedFields();

    // Fetch field definitions when extended fields are detected
    useEffect(() => {
        if (extendedFields && extendedFields.namespaces) {
            const fieldKeys: string[] = [];

            // Collect all field keys that need definitions
            Object.entries(extendedFields.namespaces).forEach(([namespace, fields]) => {
                Object.keys(fields).forEach(fieldKey => {
                    const fullKey = `${namespace}.${fieldKey}`;
                    const directKey = fieldKey;

                    // Only fetch if we don't already have the definition
                    if (!fieldDefinitions[fullKey] && !fieldDefinitions[directKey]) {
                        fieldKeys.push(fullKey);
                        fieldKeys.push(directKey);
                        // Also try without namespace prefix
                        if (fieldKey.startsWith('form_field_')) {
                            fieldKeys.push(fieldKey);
                        }
                    }
                });
            });

            if (fieldKeys.length > 0) {
                // Remove duplicates
                const uniqueKeys = [...new Set(fieldKeys)];
                console.log('Requesting field definitions for:', uniqueKeys);
                fetchFieldDefinitions(uniqueKeys);
            }
        }
    }, [extendedFields]);

    // Debug log when field definitions change
    useEffect(() => {
        console.log('Field definitions updated:', fieldDefinitions);
    }, [fieldDefinitions]);

    // Don't render if no fields exist
    if ((!customFields || customFields.length === 0) && !extendedFields) {
        return null;
    }

    const handleCustomFieldClick = (field: WixCustomField) => {
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
            fieldValue = JSON.stringify(field.value, null, 2);
        }

        const fieldTitle = field.translatedTitle || field.title || 'Custom Field';
        orderController.copyToClipboard(fieldValue, fieldTitle);
    };

    const handleExtendedFieldClick = (namespace: string, fieldKey: string, fieldValue: any) => {
        const displayValue = getFieldDisplayValue(namespace, fieldKey, fieldValue);
        const fieldTitle = getFieldDisplayName(namespace, fieldKey);
        orderController.copyToClipboard(displayValue, fieldTitle);
    };

    return (
        <>
            {/* 🔥 FIXED: Add divider at the top, only when fields exist */}
            <Card.Divider />

            <Box gap="12px" direction="vertical">
                {/* Error display */}
                {error && (
                    <Box style={{
                        backgroundColor: '#fef2f2',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #fecaca'
                    }}>
                        <Text size="tiny" style={{ color: '#dc2626' }}>
                            Error loading field definitions: {error}
                        </Text>
                        <Text size="tiny" style={{ color: '#7f1d1d', marginTop: '4px' }}>
                            Fields will be displayed with default formatting.
                        </Text>
                    </Box>
                )}

                {/* Custom Fields Section */}
                {customFields && customFields.length > 0 && (
                    <Box gap="12px" direction="vertical">
                        <Text size="small" className="section-title">Custom Fields:</Text>
                        <Box gap="8px" direction="vertical">
                            {customFields.map((field, index) => {
                                const fieldTitle = field.translatedTitle || field.title || `Field ${index + 1}`;

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
                                    displayValue = JSON.stringify(field.value, null, 2);
                                }

                                return (
                                    <Box key={`custom-field-${index}`} gap="4px" direction="vertical">
                                        <Text size="tiny" secondary weight="bold">
                                            {fieldTitle}:
                                        </Text>
                                        <Text
                                            size="small"
                                            className="clickable-info"
                                            onClick={() => handleCustomFieldClick(field)}
                                            style={{
                                                paddingLeft: '8px',
                                                borderLeft: '2px solid #3b82f6',
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
                )}

                {/* Extended Fields Section */}
                {extendedFields && extendedFields.namespaces && (
                    <Box gap="12px" direction="vertical">
                        <Text size="small" className="section-title">Extended Fields:</Text>
                        <Box gap="12px" direction="vertical">
                            {Object.entries(extendedFields.namespaces).map(([namespace, fields]) => (
                                <Box key={namespace} gap="8px" direction="vertical">
                                    <Text size="tiny" secondary weight="bold" style={{ textTransform: 'uppercase' }}>
                                        {namespace.replace('_', ' ')}:
                                    </Text>
                                    <Box gap="6px" direction="vertical" style={{ paddingLeft: '12px' }}>
                                        {Object.entries(fields).map(([fieldKey, fieldValue]) => {
                                            const displayName = getFieldDisplayName(namespace, fieldKey);
                                            const displayValue = getFieldDisplayValue(namespace, fieldKey, fieldValue);

                                            return (
                                                <Box key={`${namespace}-${fieldKey}`} gap="4px" direction="vertical">
                                                    <Text size="tiny" secondary weight="bold">
                                                        {displayName}:
                                                    </Text>
                                                    <Text
                                                        size="small"
                                                        className="clickable-info"
                                                        onClick={() => handleExtendedFieldClick(namespace, fieldKey, fieldValue)}
                                                        style={{
                                                            paddingLeft: '8px',
                                                            borderLeft: '2px solid #10b981',
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
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Loading indicator */}
                {loadingDefinitions && (
                    <Box align="center" paddingTop="8px">
                        <Text size="tiny" secondary>Loading field labels...</Text>
                    </Box>
                )}
            </Box>
        </>
    );
};