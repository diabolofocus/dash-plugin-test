// stores/UIStore.ts
import { makeAutoObservable } from 'mobx';
import type { ConnectionStatus } from '../types/Order';

export class UIStore {
    loading = false;
    refreshing = false;
    loadingMore = false;
    submitting = false;
    trackingNumber = '';
    selectedCarrier = 'dhl';
    connectionStatus: ConnectionStatus | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    setLoading = (loading: boolean) => {
        this.loading = loading;
    };

    setRefreshing = (refreshing: boolean) => {
        this.refreshing = refreshing;
    };

    setLoadingMore = (loadingMore: boolean) => {
        this.loadingMore = loadingMore;
    };

    setSubmitting = (submitting: boolean) => {
        this.submitting = submitting;
    };

    setTrackingNumber = (trackingNumber: string) => {
        this.trackingNumber = trackingNumber;
    };

    setSelectedCarrier = (carrier: string) => {
        this.selectedCarrier = carrier;
    };

    setConnectionStatus = (status: ConnectionStatus | null) => {
        this.connectionStatus = status;
    };

    resetForm = () => {
        this.trackingNumber = '';
        this.selectedCarrier = 'dhl';
    };
}