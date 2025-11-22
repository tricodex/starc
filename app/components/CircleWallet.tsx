'use client';

import { useState, useEffect } from 'react';
import { useCircleWallet } from '../context/CircleWalletContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SUPPORTED_ASSETS } from '../config/assets';

interface CircleWalletProps {
  onPay?: () => void;
  amount?: string;
  symbol?: string;
}

export function CircleWallet({ onPay, amount, symbol, recipientAddress }: CircleWalletProps & { recipientAddress?: string }) {
  const { walletId, isConnected, isLoading, createWallet, sdk } = useCircleWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (walletId) {
        fetch(`/api/circle/wallet/balance?id=${walletId}`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.tokenBalances) {
                    // Find balance matching the requested symbol
                    const token = data.data.tokenBalances.find((t: any) => 
                        t.token.symbol === symbol || (symbol === 'USDC' && t.token.symbol === 'USDC')
                    );
                    
                    if (token) {
                        setBalance(token.amount);
                        setTokenId(token.token.id);
                    } else {
                        setBalance('0.00');
                    }
                }
            })
            .catch(err => console.error("Failed to fetch circle balance", err));
    }
  }, [walletId, symbol]);

  const handleTransfer = async () => {
    if (!sdk || !walletId || !tokenId || !amount || !recipientAddress) {
        console.error("Missing transfer requirements", { sdk: !!sdk, walletId, tokenId, amount, recipientAddress });
        alert("Recipient address is missing.");
        return;
    }

    setIsTransferring(true);
    try {
        // 1. Get User ID from localStorage (needed for backend)
        const userId = localStorage.getItem('circle_user_id');
        if (!userId) throw new Error("User ID not found");

        // 2. Initiate Transfer on Backend
        const response = await fetch('/api/circle/wallet/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletId,
                destinationAddress: recipientAddress,
                amount,
                tokenId,
                userId
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Transfer failed");

        const challengeId = data.challengeId;
        if (!challengeId) throw new Error("No challenge ID returned");

        // 3. Execute Challenge (PIN)
        sdk.execute(challengeId, (error, result) => {
            setIsTransferring(false);
            if (error) {
                console.error("Transfer Challenge Error:", error);
                alert(`Transfer failed: ${error.message}`);
                return;
            }

            if (result) {
                console.log("Transfer Initiated:", result);
                // 4. Notify Parent
                if (onPay) onPay();
            }
        });

    } catch (error) {
        console.error("Transfer Error:", error);
        alert("Failed to initiate transfer. See console for details.");
        setIsTransferring(false);
    }
  };

  if (isConnected && walletId) {
    return (
      <Card className="bg-zinc-900 text-white border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm">Circle Wallet</h3>
              <p className="text-xs text-zinc-400 font-mono">{walletId}</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
            Active
          </span>
        </div>
        
        <div className="bg-zinc-800/50 p-3 rounded-lg mb-4">
          <div className="text-xs text-zinc-400 mb-1">{symbol || 'USDC'} Balance</div>
          <div className="font-mono text-lg">{balance !== null ? balance : 'Loading...'}</div>
        </div>

        {onPay && (
            <Button 
                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={handleTransfer}
                isLoading={isTransferring}
                disabled={!tokenId || !balance || parseFloat(balance) < parseFloat(amount || '0')}
            >
                {isTransferring ? 'Processing...' : 'Pay Now'}
            </Button>
        )}
        {(!tokenId || (balance && parseFloat(balance) < parseFloat(amount || '0'))) && (
            <p className="text-xs text-red-400 text-center mt-2">
                Insufficient funds or token not found.
            </p>
        )}
      </Card>
    );
  }

  return (
    <Card title="Connect Wallet" description="Initialize your Circle Programmable Wallet to get started.">
      <div className="space-y-6 text-center py-4">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Secure & Programmable</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Create a user-controlled wallet with PIN recovery. No seed phrases required.
          </p>
        </div>

        <Button 
          className="w-full" 
          size="lg" 
          onClick={createWallet}
          isLoading={isLoading}
        >
          {isLoading ? 'Initializing SDK...' : 'Create Circle Wallet'}
        </Button>
        
        <p className="text-xs text-zinc-400">
          Powered by Circle Web3 Services
        </p>
      </div>
    </Card>
  );
}
