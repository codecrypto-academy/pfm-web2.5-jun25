'use client';

import { useState } from 'react';
import { useBalance } from '../context/BalanceContext';

export default function BalanceChecker() {
  const [address, setAddress] = useState('');
  const { balance, balanceWei, loading, error, fetchBalance } = useBalance();

  const handleCheckBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchBalance(address);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">Balance Checker</h2>
      <p className="text-gray-600 mb-4">
        Check the ETH balance of any address
      </p>

      <form onSubmit={handleCheckBalance} className="space-y-4">
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Checking...' : 'Check Balance'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {balance && (
        <div className="mt-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          <div className="font-semibold mb-2">Balance Information</div>
          <div className="text-sm space-y-1">
            <div><strong>Address:</strong> {address}</div>
            <div><strong>Balance:</strong> {parseFloat(balance).toFixed(6)} ETH</div>
            <div><strong>Wei:</strong> {balanceWei}</div>
          </div>
        </div>
      )}
    </div>
  );
}