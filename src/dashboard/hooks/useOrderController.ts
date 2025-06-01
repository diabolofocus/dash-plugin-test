// hooks/useOrderController.ts
import { useMemo } from 'react';
import { useStores } from './useStores';
import { OrderController } from '../controllers/OrderController';
import { OrderService } from '../services/OrderService';

export const useOrderController = () => {
    const { orderStore, uiStore } = useStores();
    const orderService = useMemo(() => new OrderService(), []);

    return useMemo(
        () => new OrderController(orderStore, uiStore, orderService),
        [orderStore, uiStore, orderService]
    );
};