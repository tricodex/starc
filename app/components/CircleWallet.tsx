'use client';

import { useState, useEffect } from 'react';
import { useCircleWallet } from '../context/CircleWalletContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface CircleWalletProps {
  onPay?: () => void;
  amount?: string;
  symbol?: string;
}

export function CircleWallet({ onPay, amount, symbol }: CircleWalletProps) {
  const { walletId, isConnected, isLoading, createWallet } = useCircleWallet();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    if (walletId) {
        fetch(`/api/circle/wallet/balance?id=${walletId}`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.tokenBalances) {
                    const usdc = data.data.tokenBalances.find((t: any) => t.token.symbol === 'USDC');
                    setBalance(usdc ? usdc.amount : '0.00');
                }
            })
            .catch(err => console.error("Failed to fetch circle balance", err));
    }
  }, [walletId]);

  if (isConnected && walletId) {
    return (
      <Card className="bg-zinc-900 text-white border-zinc-800">
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
        
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-zinc-800/50 p-3 rounded-lg">
            <div className="text-xs text-zinc-400 mb-1">USDC Balance</div>
            <div className="font-mono text-lg">{balance !== null ? balance : 'Loading...'}</div>
            <div className="text-[10px] text-zinc-500">Programmable Wallet</div>
          </div>
          <div className="bg-zinc-800/50 p-3 rounded-lg">
            <div className="text-xs text-zinc-400 mb-1">Status</div>
            <div className="text-sm">Programmable</div>
          </div>
        </div>

        {/* Smart Rules Badge */}
        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-3">
          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-0.5">AI Agent Active</div>
            <div className="text-xs text-zinc-400">Auto-approving payments under $100 based on your spending history.</div>
          </div>
        </div>
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
