'use client';

import { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useCircleWallet } from '../context/CircleWalletContext';
import { SUPPORTED_ASSETS } from '../config/assets';

export function SendComponent() {
  const { walletAddress, walletId, sdk } = useCircleWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !sdk) return;

    setIsLoading(true);
    try {
      // In a real implementation, we would trigger a transfer challenge here.
      // Since we don't have the full transfer backend endpoint set up in this context yet,
      // we will simulate the flow or call an endpoint if we create one.
      
      // For now, we'll fetch the challenge from a hypothentical endpoint
      const response = await fetch('/api/circle/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          recipientAddress: recipient,
          amount,
          tokenId: SUPPORTED_ASSETS[token as keyof typeof SUPPORTED_ASSETS]?.address || '', // Use address as ID for now or map to Circle Token ID
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate transfer');
      }

      if (data.challengeId) {
        sdk.execute(data.challengeId, (error, result) => {
            if (error) {
                console.error(error);
                alert('Transfer failed: ' + error.message);
                setIsLoading(false);
                return;
            }
            console.log('Transfer Result:', result);
            setTxId('pending_tx_id'); // In real flow, we'd get this from polling
            setIsLoading(false);
            setAmount('');
            setRecipient('');
        });
      } else {
          // If it's a developer wallet or pre-approved, it might just work (unlikely for SCA)
           setIsLoading(false);
      }

    } catch (error: any) {
      console.error('Transfer error:', error);
      alert('Error: ' + error.message);
      setIsLoading(false);
    }
  };

  return (
    <Card title="Send Assets">
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Recipient Address</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="0x..."
            required
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Amount</label>
            <input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              {Object.keys(SUPPORTED_ASSETS).filter(key => key !== 'USDC').map((assetKey) => (
                <option key={assetKey} value={assetKey}>
                  {SUPPORTED_ASSETS[assetKey as keyof typeof SUPPORTED_ASSETS].name} ({SUPPORTED_ASSETS[assetKey as keyof typeof SUPPORTED_ASSETS].symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        <Button type="submit" className="w-full" isLoading={isLoading} disabled={!walletId}>
          Send Funds
        </Button>

        {txId && (
            <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg">
                Transfer initiated! Transaction is processing.
            </div>
        )}
      </form>
    </Card>
  );
}

