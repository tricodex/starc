'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import { SUPPORTED_ASSETS } from '../config/assets';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

import { useCircleWallet } from '../context/CircleWalletContext';

export function BridgeWidget() {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const { address } = useAccount();
  const { walletId, sdk } = useCircleWallet();
  const usdcConfig = SUPPORTED_ASSETS.USDC;

  const { data: balanceData } = useReadContract({
    address: usdcConfig.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const balance = balanceData ? formatUnits(balanceData, usdcConfig.decimals) : '--';

  const handleBridge = async () => {
    if (!walletId || !sdk || !amount) return;
    setIsProcessing(true);
    
    try {
        const userId = localStorage.getItem('circle_user_id');
        const res = await fetch('/api/treasury/bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletId, userId, amount })
        });
        const data = await res.json();
        
        if (data.challengeId) {
            if (data.userToken && data.encryptionKey) {
                localStorage.setItem('circle_user_token', data.userToken);
                localStorage.setItem('circle_encryption_key', data.encryptionKey);
                sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });
            }

            sdk.execute(data.challengeId, (error, result) => {
                setIsProcessing(false);
                if (error) {
                    console.error("Bridge Challenge Error:", error);
                    alert(`Bridge Failed: ${error.message}`);
                    return;
                }
                if (result) {
                    console.log("Bridge Initiated:", result);
                    alert(`Bridge Initiated! ${data.message}`);
                    setAmount('');
                }
            });
        } else {
            setIsProcessing(false);
            alert(data.message || "Bridge failed");
        }
    } catch (e: any) {
        setIsProcessing(false);
        console.error("Bridge Error:", e);
        alert(`Bridge Error: ${e.message}`);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-zinc-200">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-zinc-900 font-display">Cross-Chain Bridge</h3>
        <p className="text-sm text-zinc-500">Powered by Circle CCTP</p>
      </div>

      <div className="space-y-4 relative">
        {/* From Chain */}
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-zinc-500">From</span>
            <span className="text-xs text-zinc-500">Balance: {balance} USDC</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-zinc-200 shadow-sm">
              <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">A</div>
              <span className="text-sm font-medium">Arc</span>
            </div>
            <input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-transparent text-2xl font-bold text-zinc-900 w-full text-right focus:outline-none"
            />
          </div>
        </div>

        {/* Switch Icon */}
        <div className="absolute left-1/2 top-[88px] -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-zinc-200 rounded-full flex items-center justify-center shadow-sm z-10">
          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {/* To Chain */}
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-100">
          <div className="flex justify-between mb-2">
            <span className="text-xs text-zinc-500">To</span>
            <span className="text-xs text-zinc-500">Est. time: ~20s</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-zinc-200 shadow-sm">
              <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] text-white font-bold">E</div>
              <span className="text-sm font-medium">Ethereum</span>
            </div>
            <div className="text-2xl font-bold text-zinc-400 w-full text-right">
              {amount || '0.00'}
            </div>
          </div>
        </div>

        <Button 
          className="w-full mt-4" 
          size="lg"
          onClick={handleBridge}
          isLoading={isProcessing}
          disabled={!amount}
        >
          {isProcessing ? 'Bridging via CCTP...' : 'Bridge USDC'}
        </Button>

        <div className="text-center text-xs text-zinc-400 mt-2">
          0% Slippage • Native Burn & Mint
        </div>
      </div>
    </Card>
  );
}
