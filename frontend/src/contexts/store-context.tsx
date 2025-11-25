'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface Store {
  id: string;
  code: string;
  name: string;
}

interface StoreContextType {
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
  stores: Store[];
  loading: boolean;
}

const StoreContext = createContext<StoreContextType>({
  selectedStoreId: null,
  setSelectedStoreId: () => {},
  stores: [],
  loading: false,
});

export const useStore = () => useContext(StoreContext);

export const StoreProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load from local storage if available
    const savedStoreId = localStorage.getItem('selectedStoreId');
    if (savedStoreId) {
      setSelectedStoreId(savedStoreId);
    }

    fetch('/api/v1/stores')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStores(data.data);
        }
      })
      .catch(err => console.error('Failed to fetch stores', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSetStore = (id: string | null) => {
    setSelectedStoreId(id);
    if (id) {
      localStorage.setItem('selectedStoreId', id);
    } else {
      localStorage.removeItem('selectedStoreId');
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId: handleSetStore, stores, loading }}>
      {children}
    </StoreContext.Provider>
  );
};
