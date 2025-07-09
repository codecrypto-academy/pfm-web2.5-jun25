'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface BalanceContextType {
  balance: string | null;
  balanceWei: string | null;
  loading: boolean;
  error: string | null;
  fetchBalance: (address: string, networkId: string) => Promise<void>;
}

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState<string | null>(null);
  const [balanceWei, setBalanceWei] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (address: string, networkId: string) => {
    if (!address || !networkId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/balance?address=${encodeURIComponent(address)}&networkId=${networkId}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch balance');
      }
      setBalance(data.balance);
      setBalanceWei(data.balanceWei);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBalance(null);
      setBalanceWei(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <BalanceContext.Provider value={{ balance, balanceWei, loading, error, fetchBalance }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalance() {
  const context = useContext(BalanceContext);
  if (context === undefined) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  return context;
} 