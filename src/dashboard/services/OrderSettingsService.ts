// services/OrderSettingsService.ts
import { ordersSettings } from '@wix/ecom';

export interface OrdersSettings {
    createInvoice: boolean;
    inventoryUpdateTrigger: 'ON_ORDER_PAID' | 'ON_ORDER_PLACED' | 'UNKNOWN_INVENTORY_UPDATE_TRIGGER';
    _createdDate?: string;
    _updatedDate?: string;
}

export interface OrdersSettingsResponse {
    success: boolean;
    ordersSettings?: OrdersSettings;
    error?: string;
}

export class OrderSettingsService {
    /**
     * Get current order settings
     */
    async getOrdersSettings(): Promise<OrdersSettingsResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Getting order settings...`);

            const response = await ordersSettings.getOrdersSettings();

            console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Order settings retrieved:`, {
                createInvoice: response.ordersSettings?.createInvoice,
                inventoryUpdateTrigger: response.ordersSettings?.inventoryUpdateTrigger,
                hasResponse: !!response.ordersSettings
            });

            return {
                success: true,
                ordersSettings: response.ordersSettings
                    ? {
                        createInvoice: response.ordersSettings.createInvoice ?? false,
                        inventoryUpdateTrigger: response.ordersSettings.inventoryUpdateTrigger ?? 'UNKNOWN_INVENTORY_UPDATE_TRIGGER',
                        _createdDate: response.ordersSettings._createdDate
                            ? response.ordersSettings._createdDate.toISOString()
                            : undefined,
                        _updatedDate: response.ordersSettings._updatedDate
                            ? response.ordersSettings._updatedDate.toISOString()
                            : undefined,
                    }
                    : undefined
            };

        } catch (error: any) {
            console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Failed to get order settings:`, {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Update order settings
     */
    async updateOrdersSettings(settings: Partial<OrdersSettings>): Promise<OrdersSettingsResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Updating order settings:`, settings);

            // Create the settings object with only the fields we want to update
            const updatePayload: any = {};

            if (settings.createInvoice !== undefined) {
                updatePayload.createInvoice = settings.createInvoice;
            }

            if (settings.inventoryUpdateTrigger !== undefined) {
                updatePayload.inventoryUpdateTrigger = settings.inventoryUpdateTrigger;
            }

            console.log(`📤 [${isProd ? 'PROD' : 'DEV'}] Update payload:`, updatePayload);

            const response = await ordersSettings.updateOrdersSettings(updatePayload);

            console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Order settings updated:`, {
                createInvoice: response.ordersSettings?.createInvoice,
                inventoryUpdateTrigger: response.ordersSettings?.inventoryUpdateTrigger,
                updatedDate: response.ordersSettings?._updatedDate
            });

            return {
                success: true,
                ordersSettings: response.ordersSettings
                    ? {
                        createInvoice: response.ordersSettings.createInvoice ?? false,
                        inventoryUpdateTrigger: response.ordersSettings.inventoryUpdateTrigger ?? 'UNKNOWN_INVENTORY_UPDATE_TRIGGER',
                        _createdDate: response.ordersSettings._createdDate
                            ? response.ordersSettings._createdDate.toISOString()
                            : undefined,
                        _updatedDate: response.ordersSettings._updatedDate
                            ? response.ordersSettings._updatedDate.toISOString()
                            : undefined,
                    }
                    : undefined
            };

        } catch (error: any) {
            console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Failed to update order settings:`, {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name,
                settings
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Toggle invoice creation setting
     */
    async toggleInvoiceCreation(enabled: boolean): Promise<OrdersSettingsResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        console.log(`🔄 [${isProd ? 'PROD' : 'DEV'}] Toggling invoice creation to: ${enabled}`);

        return this.updateOrdersSettings({ createInvoice: enabled });
    }

    /**
     * Initialize order settings with default values if needed
     */
    async initializeOrderSettings(): Promise<OrdersSettingsResponse> {
        const isProd = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1');

        try {
            console.log(`🚀 [${isProd ? 'PROD' : 'DEV'}] Initializing order settings...`);

            // First, get current settings
            const currentSettings = await this.getOrdersSettings();

            if (!currentSettings.success) {
                throw new Error(currentSettings.error || 'Failed to get current settings');
            }

            // Check if createInvoice is already set
            if (currentSettings.ordersSettings?.createInvoice !== undefined) {
                console.log(`✅ [${isProd ? 'PROD' : 'DEV'}] Order settings already initialized`);
                return currentSettings;
            }

            // Set default value: createInvoice = true
            console.log(`🔧 [${isProd ? 'PROD' : 'DEV'}] Setting default createInvoice = true`);

            return this.updateOrdersSettings({
                createInvoice: true, // Default to true as requested
                inventoryUpdateTrigger: currentSettings.ordersSettings?.inventoryUpdateTrigger || 'ON_ORDER_PLACED'
            });

        } catch (error: any) {
            console.error(`❌ [${isProd ? 'PROD' : 'DEV'}] Failed to initialize order settings:`, {
                errorMessage: error instanceof Error ? error.message : String(error),
                errorType: error?.constructor?.name
            });

            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}