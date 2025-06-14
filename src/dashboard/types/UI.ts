// types/UI.ts
export interface UIState {
    loading: boolean;
    refreshing: boolean;
    loadingMore: boolean;
    submitting: boolean;
    trackingNumber: string;
    selectedCarrier: string;
    trackingUrl: string;
}

export interface ShippingCarrier {
    id: string;
    value: string;
}