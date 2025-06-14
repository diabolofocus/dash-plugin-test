// src/backend/field-service.js
import { extendedFields } from '@wix/crm';

// Backend function to get all custom field definitions
export async function getCustomFieldDefinitions() {
    try {
        console.log('🔍 Fetching custom field definitions...');

        const queryResults = await extendedFields.queryExtendedFields().find();

        // Filter for user-defined custom fields and map to useful format
        const fieldDefinitions = queryResults.items
            .filter((field) => field.fieldType === 'USER_DEFINED')
            .map((field) => ({
                key: field.key,
                displayName: field.displayName || field.key,
                fieldType: field.fieldType,
                namespace: field.namespace || '_user_fields',
                description: field.description
            }));

        console.log('✅ Found custom field definitions:', fieldDefinitions);

        return {
            success: true,
            fieldDefinitions,
            count: fieldDefinitions.length
        };
    } catch (error) {
        console.error('❌ Failed to fetch custom field definitions:', error);
        return {
            success: false,
            error: error.message,
            fieldDefinitions: []
        };
    }
}

// Backend function to get specific field definition by key
export async function getFieldDefinitionByKey(fieldKey) {
    try {
        const queryResults = await extendedFields
            .queryExtendedFields()
            .eq('key', fieldKey)
            .find();

        if (queryResults.items.length > 0) {
            const field = queryResults.items[0];
            return {
                success: true,
                fieldDefinition: {
                    key: field.key,
                    displayName: field.displayName || field.key,
                    fieldType: field.fieldType,
                    namespace: field.namespace || '_user_fields',
                    description: field.description
                }
            };
        }

        return {
            success: false,
            error: 'Field not found',
            fieldDefinition: null
        };
    } catch (error) {
        console.error(`❌ Failed to fetch field definition for ${fieldKey}:`, error);
        return {
            success: false,
            error: error.message,
            fieldDefinition: null
        };
    }
}