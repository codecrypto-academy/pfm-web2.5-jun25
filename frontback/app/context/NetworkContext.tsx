'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { NetworkConfig } from '../types';

interface NetworkContextType {
  networks: NetworkConfig[];
  selectedNetwork: NetworkConfig | null;
  selectNetwork: (networkId: string) => void;
  loading: boolean;
  refreshNetworks: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [networks, setNetworks] = useState<NetworkConfig[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchNetworks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/networks');
      if (!response.ok) {
        throw new Error('Failed to fetch networks');
      }
      const data: NetworkConfig[] = await response.json();
      setNetworks(data);

      const defaultNetwork = data.find(n => n.id === 'besu-local-env') || data.find(n => n.id === 'besu-local') || data[0];

      // Si no hay red seleccionada o la seleccionada ya no existe, selecciona la por defecto
      const currentSelectedId = selectedNetwork?.id;
      if (data.length > 0 && (!currentSelectedId || !data.some(n => n.id === currentSelectedId))) {
        setSelectedNetwork(defaultNetwork);
      } else if (data.length === 0) {
        setSelectedNetwork(null);
      }
    } catch (error) {
      console.error(error);
      setNetworks([]);
      setSelectedNetwork(null);
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork?.id]);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  const selectNetwork = useCallback((networkId: string) => {
    const network = networks.find(n => n.id === networkId);
    if (network) {
      setSelectedNetwork(network);
    }
  }, [networks]);

  return (
    <NetworkContext.Provider value={{ networks, selectedNetwork, selectNetwork, loading, refreshNetworks: fetchNetworks }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
} 