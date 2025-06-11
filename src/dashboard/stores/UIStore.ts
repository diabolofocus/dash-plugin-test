import { makeObservable, observable, action } from 'mobx';

export class UIStore {
    loading: boolean = false;
    refreshing: boolean = false;
    loadingMore: boolean = false;
    submitting: boolean = false;
    trackingNumber: string = '';
    selectedCarrier: string = '';
    trackingUrl: string = ''; // ADD THIS LINE

    constructor() {
        makeObservable(this, {
            // Observable properties
            loading: observable,
            refreshing: observable,
            loadingMore: observable,
            submitting: observable,
            trackingNumber: observable,
            selectedCarrier: observable,
            trackingUrl: observable, // ADD THIS LINE

            // Actions
            setLoading: action,
            setRefreshing: action,
            setLoadingMore: action,
            setSubmitting: action,
            setTrackingNumber: action,
            setSelectedCarrier: action,
            setTrackingUrl: action, // ADD THIS LINE
            resetForm: action
        });
    }

    // Actions
    setLoading(loading: boolean) {
        this.loading = loading;
    }

    setRefreshing(refreshing: boolean) {
        this.refreshing = refreshing;
    }

    setLoadingMore(loadingMore: boolean) {
        this.loadingMore = loadingMore;
    }

    setSubmitting(submitting: boolean) {
        this.submitting = submitting;
    }

    setTrackingNumber(trackingNumber: string) {
        this.trackingNumber = trackingNumber;
    }

    setSelectedCarrier(carrier: string) {
        this.selectedCarrier = carrier;
    }

    // ADD THIS METHOD
    setTrackingUrl(url: string) {
        this.trackingUrl = url;
    }

    resetForm() {
        this.trackingNumber = '';
        this.selectedCarrier = '';
        this.trackingUrl = ''; // ADD THIS LINE
        this.submitting = false;
    }
}