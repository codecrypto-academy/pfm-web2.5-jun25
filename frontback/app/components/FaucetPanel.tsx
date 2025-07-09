'use client';

import { useState } from 'react';
import { useBalance } from '../context/BalanceContext';
import { useNetwork } from '../context/NetworkContext';

export default function FaucetPanel() {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { fetchBalance } = useBalance();
  const { selectedNetwork } = useNetwork();

  const handleFaucet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNetwork) {
      setError('No network selected');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toAddress,
          amount: parseFloat(amount),
          networkId: selectedNetwork.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send tokens');
      }

      setResult(data);
      await fetchBalance(toAddress, selectedNetwork.id); // Refresh balance after faucet transaction
      setToAddress('');
      setAmount('1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Test Faucet</h2>
      <p className="text-gray-600 mb-4">
        Send test ETH to any address using the validator account
      </p>

      <form onSubmit={handleFaucet} className="space-y-4">
        <div>
          <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            id="toAddress"
            type="text"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            placeholder="0x..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
            Amount (ETH)
          </label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.01"
            max="10"
            step="0.01"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading || !selectedNetwork}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Sending...' : 'Send Tokens'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          <div className="font-semibold mb-2">Transaction Sent!</div>
          <div className="text-sm space-y-1">
            <div><strong>Hash:</strong> {result.transaction.hash}</div>
            <div><strong>To:</strong> {result.transaction.to}</div>
            <div><strong>Value:</strong> {result.transaction.value} ETH</div>
            <div><strong>Block:</strong> {result.transaction.blockNumber}</div>
          </div>
        </div>
      )}
    </div>
  );
}