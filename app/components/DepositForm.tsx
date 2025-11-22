'use client';

import { useState } from 'react';
import { SUPPORTED_ASSETS } from '../config/assets';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export function DepositForm() {
  const [selectedAsset, setSelectedAsset] = useState<keyof typeof SUPPORTED_ASSETS>('USDC');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleDeposit = async () => {
    setIsLoading(true);
    // Simulate deposit
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    alert(`Deposited ${amount} ${SUPPORTED_ASSETS[selectedAsset].symbol}`);
  };

  return (
    <Card title="Unified Vault Deposit" description="Deposit any supported stablecoin to mint uTokens.">
      <div className="space-y-6">
        {/* Asset Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-2">Select Asset</label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SUPPORTED_ASSETS) as Array<keyof typeof SUPPORTED_ASSETS>).map((assetKey) => (
              <button
                key={assetKey}
                onClick={() => setSelectedAsset(assetKey)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${selectedAsset === assetKey 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}
                `}
              >
                {SUPPORTED_ASSETS[assetKey].symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Input */}
        <Input
          label="Amount"
          type="number"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          rightElement={
            <span className="text-zinc-500 text-sm font-medium pr-2">
              {SUPPORTED_ASSETS[selectedAsset].symbol}
            </span>
          }
        />

        {/* Info Panel */}
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-indigo-700">Exchange Rate</span>
            <span className="font-medium text-indigo-900">1 {SUPPORTED_ASSETS[selectedAsset].symbol} ≈ 1.00 uARS</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-indigo-700">Est. Shares</span>
            <span className="font-medium text-indigo-900">{amount || '0.00'} uARS</span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleDeposit}
          isLoading={isLoading}
          disabled={!amount || parseFloat(amount) <= 0}
        >
          Approve & Deposit
        </Button>
      </div>
    </Card>
  );
}
