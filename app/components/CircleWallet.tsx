'use client';

import { useState } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface CircleWalletProps {
  onPay: () => void;
  amount: string;
  symbol: string;
}

export function CircleWallet({ onPay, amount, symbol }: CircleWalletProps) {
  const [step, setStep] = useState<'login' | 'confirm' | 'processing'>('login');

  const handleLogin = () => {
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setStep('processing');
    await new Promise(resolve => setTimeout(resolve, 1500));
    onPay();
  };

  if (step === 'login') {
    return (
      <Card className="bg-zinc-900 text-white border-zinc-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <span className="text-zinc-900 font-bold text-xs">C</span>
          </div>
          <span className="font-medium">Circle Programmable Wallet</span>
        </div>
        <p className="text-zinc-400 text-sm mb-6">
          Securely pay using your embedded Circle Wallet. No gas fees, instant settlement.
        </p>
        <Button 
          className="w-full bg-white text-zinc-900 hover:bg-zinc-100" 
          onClick={handleLogin}
        >
          Connect Wallet
        </Button>
      </Card>
    );
  }

  if (step === 'confirm') {
    return (
      <Card className="bg-zinc-900 text-white border-zinc-800">
        <div className="flex items-center justify-between mb-6">
          <span className="text-zinc-400">Balance</span>
          <span className="font-mono">$1,250.00 USDC</span>
        </div>
        <div className="bg-zinc-800 rounded-xl p-4 mb-6">
          <div className="text-xs text-zinc-500 mb-1">Paying</div>
          <div className="text-xl font-bold">{amount} {symbol}</div>
          <div className="text-xs text-zinc-500 mt-1">To Merchant Store</div>
        </div>
        <Button 
          className="w-full bg-white text-zinc-900 hover:bg-zinc-100" 
          onClick={handleConfirm}
        >
          Confirm Payment
        </Button>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 text-white border-zinc-800 flex flex-col items-center justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mb-4"></div>
      <span className="text-sm text-zinc-400">Processing with Circle CCTP...</span>
    </Card>
  );
}
