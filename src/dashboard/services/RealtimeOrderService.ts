// services/RealtimeOrderService.ts - SINGLE INSTANCE VERSION
import { orders } from '@wix/ecom';
import type { Order } from '../types/Order';
import { DEFAULT_NOTIFICATION_SOUND } from '../assets/defaultNotificationSound';

// ✅ SINGLETON: Ensure only one instance exists
let instance: RealtimeOrderService | null = null;

export class RealtimeOrderService {
    private isPolling: boolean = false;
    private pollingInterval: any = null;
    private lastOrderCheck: Date = new Date();

    // ✅ PERMANENT tracking - never gets reset
    private static globalProcessedOrderIds: Set<string> = new Set();

    // Audio properties
    private audioContext: AudioContext | null = null;
    private soundBuffer: AudioBuffer | null = null;

    // Only care about new orders
    private onNewOrderCallbacks: Array<(order: Order) => void> = [];

    constructor() {
        // ✅ SINGLETON: Return existing instance if it exists
        if (instance) {
            return instance;
        }

        instance = this;

        this.initializeAudio();
        this.lastOrderCheck = new Date(Date.now() - 60 * 1000);

        // AUTO-START: Begin polling immediately
        this.startPolling();
    }

    private async initializeAudio() {
        try {
            if (!window.AudioContext && !(window as any).webkitAudioContext) return;

            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            await this.loadCustomSound();
        } catch (error) {
            // Audio init failed
        }
    }

    /**
 * Try multiple sound sources in order of preference
 */
    private async loadCustomSound() {
        if (!this.audioContext) return;

        try {
            // ✅ If your defaultNotificationSound.ts exports base64 data
            const base64Data = DEFAULT_NOTIFICATION_SOUND;

            // Remove data URL prefix if present (data:audio/mp3;base64,)
            const cleanBase64 = base64Data.replace(/^data:audio\/[^;]+;base64,/, '');

            // Convert base64 to ArrayBuffer
            const binaryString = window.atob(cleanBase64);
            const arrayBuffer = new ArrayBuffer(binaryString.length);
            const uint8Array = new Uint8Array(arrayBuffer);

            for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
            }

            this.soundBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

        } catch (error) {
            throw error;
        }
    }

    private async createBeepSound() {
        if (!this.audioContext) return;

        const sampleRate = this.audioContext.sampleRate;
        const duration = 0.3;
        const frequency = 800;
        const numSamples = Math.floor(sampleRate * duration);

        this.soundBuffer = this.audioContext.createBuffer(1, numSamples, sampleRate);
        const channelData = this.soundBuffer.getChannelData(0);

        for (let i = 0; i < numSamples; i++) {
            channelData[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        }
    }

    /**
     * Register callback for new orders only
     */
    onNewOrder(callback: (order: Order) => void) {
        this.onNewOrderCallbacks.push(callback);
    }

    /**
     * Start polling for new orders - AUTO-START
     */
    async startPolling(): Promise<boolean> {
        if (this.isPolling) {
            return true;
        }

        this.isPolling = true;

        this.pollingInterval = setInterval(async () => {
            await this.checkForNewOrders();
        }, 15000); // ✅ INCREASED: 15 seconds to reduce API calls

        return true;
    }

    /**
     * ✅ FIXED: Check for new orders with GLOBAL duplicate prevention
     */
    private async checkForNewOrders() {
        try {
            const response = await orders.searchOrders({
                sort: [{ fieldName: '_createdDate', order: 'DESC' }],
                cursorPaging: { limit: 3 } // Small limit
            });

            if (!response.orders || response.orders.length === 0) return;

            // ✅ FIXED: Use GLOBAL static tracking
            const newOrders = response.orders.filter(order => {
                const orderDate = new Date(order._createdDate!);
                const orderId = order._id!;

                const isNewer = orderDate > this.lastOrderCheck;
                const notProcessed = !RealtimeOrderService.globalProcessedOrderIds.has(orderId);

                return isNewer && notProcessed;
            });

            if (newOrders.length > 0) {
                for (const rawOrder of newOrders) {
                    const orderId = rawOrder._id!;

                    // ✅ CRITICAL: Double-check before processing
                    if (RealtimeOrderService.globalProcessedOrderIds.has(orderId)) {
                        continue;
                    }

                    // Mark as processed IMMEDIATELY in global set
                    RealtimeOrderService.globalProcessedOrderIds.add(orderId);

                    const transformedOrder = this.transformOrder(rawOrder);

                    // Play sound ONCE
                    this.playSound();

                    // Notify callbacks with delay to prevent race conditions
                    setTimeout(() => {
                        this.onNewOrderCallbacks.forEach(callback => {
                            try {
                                callback(transformedOrder);
                            } catch (error) {
                                // Callback error
                            }
                        });
                    }, 200);
                }
            }

            this.lastOrderCheck = new Date();

        } catch (error) {
            // New order check failed
        }
    }

    /**
     * Simple order transformation
     */
    private transformOrder(rawOrder: any): Order {
        return {
            _id: rawOrder._id!,
            number: rawOrder.number!,
            _createdDate: rawOrder._createdDate!,
            status: rawOrder.fulfillmentStatus || 'NOT_FULFILLED',
            paymentStatus: rawOrder.paymentStatus || 'NOT_PAID',
            total: rawOrder.priceSummary?.total?.formattedConvertedAmount ||
                rawOrder.priceSummary?.total?.formattedAmount || '€0.00',
            customer: {
                firstName: rawOrder.billingInfo?.contactDetails?.firstName ||
                    rawOrder.recipientInfo?.contactDetails?.firstName || 'Unknown',
                lastName: rawOrder.billingInfo?.contactDetails?.lastName ||
                    rawOrder.recipientInfo?.contactDetails?.lastName || 'Customer',
                email: rawOrder.billingInfo?.contactDetails?.email ||
                    rawOrder.recipientInfo?.contactDetails?.email || '',
                company: rawOrder.billingInfo?.contactDetails?.company ||
                    rawOrder.recipientInfo?.contactDetails?.company || '',
                phone: rawOrder.billingInfo?.contactDetails?.phone ||
                    rawOrder.recipientInfo?.contactDetails?.phone || ''
            },
            items: rawOrder.lineItems || [],
            totalWeight: rawOrder.totalWeight || 0,
            shippingInfo: rawOrder.shippingInfo || {},
            weightUnit: rawOrder.weightUnit || 'kg',
            rawOrder: rawOrder
        };
    }

    /**
     * Play notification sound with guard
     */
    private playSound() {
        if (!this.audioContext || !this.soundBuffer) {
            return;
        }

        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => this.doPlaySound());
            } else {
                this.doPlaySound();
            }
        } catch (error) {
            // Sound play failed
        }
    }

    private doPlaySound() {
        if (!this.audioContext || !this.soundBuffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = this.soundBuffer;
        source.connect(this.audioContext.destination);
        source.start();
    }

    /**
     * Simple status
     */
    getStatus() {
        return {
            isListening: this.isPolling,
            audioReady: !!(this.audioContext && this.soundBuffer),
            processedOrdersCount: RealtimeOrderService.globalProcessedOrderIds.size
        };
    }

    /**
     * Test sound
     */
    testSound() {
        this.playSound();
    }

    /**
     * Stop polling (for cleanup)
     */
    stop() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        this.isPolling = false;
    }

    /**
     * Reset for testing
     */
    static resetForTesting() {
        RealtimeOrderService.globalProcessedOrderIds.clear();
        instance = null;
    }
}