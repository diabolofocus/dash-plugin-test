// hooks/useStores.ts
import { createContext, useContext } from 'react';
import { OrderStore } from '../stores/OrderStore';
import { UIStore } from '../stores/UIStore';

export class RootStore {
    orderStore: OrderStore;
    uiStore: UIStore;

    constructor() {
        this.orderStore = new OrderStore();
        this.uiStore = new UIStore();
    }
}

// Create singleton instance
export const rootStore = new RootStore(); // ADD EXPORT HERE

const StoreContext = createContext<RootStore>(rootStore);

export const useStores = () => {
    return useContext(StoreContext);
};

export const StoreProvider = StoreContext.Provider;