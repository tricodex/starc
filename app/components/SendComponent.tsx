'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useCircleWallet } from '../context/CircleWalletContext';
import { SUPPORTED_ASSETS } from '../config/assets';

import { TruncatedHash } from './ui/TruncatedHash';

export function SendComponent() {
  const { walletAddress, walletId, sdk } = useCircleWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [isLoading, setIsLoading] = useState(false);
  const [txId, setTxId] = useState<string | null>(null);
  const [tokenIds, setTokenIds] = useState<Record<string, string>>({});

  // Fetch balances to get Token IDs
  useEffect(() => {
    if (walletId) {
        fetch(`/api/circle/wallet/balance?id=${walletId}`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.tokenBalances) {
                    const ids: Record<string, string> = {};
                    data.data.tokenBalances.forEach((t: any) => {
                        ids[t.token.symbol] = t.token.id;
                    });
                    setTokenIds(ids);
                }
            })
            .catch(err => console.error("Failed to fetch circle balance", err));
    }
  }, [walletId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletId || !sdk) return;

    const selectedTokenId = tokenIds[token] || tokenIds['USDC']; // Fallback or handle error
    if (!selectedTokenId) {
        alert("Token ID not found. Please wait for balances to load.");
        return;
    }

    setIsLoading(true);
    try {
      const userId = localStorage.getItem('circle_user_id');
      if (!userId) throw new Error("User ID not found");

      const response = await fetch('/api/circle/wallet/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          destinationAddress: recipient,
          amount,
          tokenId: selectedTokenId,
          userId
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
            if (result) {
                // The SDK result doesn't always contain the txId immediately for transfers
                // But if we get here, the challenge was signed successfully.
                setTxId('pending'); 
                setAmount('');
                setRecipient('');
            }
            setIsLoading(false);
        });
      } else {
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
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex flex-col gap-2">
                <div className="text-sm text-emerald-700 font-medium">
                    Transfer Initiated
                </div>
                {txId !== 'pending' ? (
                    <TruncatedHash 
                        hash={txId} 
                        externalLink={`https://testnet.arcscan.app/tx/${txId}`}
                        className="text-emerald-600 bg-white/50 px-2 py-1 rounded w-fit"
                    />
                ) : (
                    <div className="text-xs text-emerald-600">
                        Processing via Circle...
                    </div>
                )}
            </div>
        )}
      </form>
    </Card>
  );
}

