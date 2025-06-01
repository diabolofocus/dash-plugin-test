// src/dashboard/pages/page.tsx
import React from 'react';
import '@wix/design-system/styles.global.css';
import { StoreProvider, rootStore } from '../hooks/useStores';
import { OrderFulfillmentPage } from '../components/OrderFulfillmentPage';

const Page: React.FC = () => {
  return (
    <StoreProvider value={rootStore}>
      <OrderFulfillmentPage />
    </StoreProvider>
  );
};

export default Page;