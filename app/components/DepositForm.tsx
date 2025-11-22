'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { SUPPORTED_ASSETS } from '../config/assets';
import { VAULT_ABI } from '../config/abis';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';

export function DepositForm() {
  const [selectedAsset, setSelectedAsset] = useState<keyof typeof SUPPORTED_ASSETS>('USDC');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'input' | 'approve' | 'deposit'>('input');
  
  const { address, isConnected } = useAccount();
  const asset = SUPPORTED_ASSETS[selectedAsset];

  // Contract Writes
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Reads
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, asset.vaultAddress as `0x${string}`],
    query: { enabled: !!address },
  });

  // Effect to handle step transitions
  useEffect(() => {
    if (isConfirmed) {
      if (step === 'approve') {
        refetchAllowance();
        setStep('deposit');
      } else if (step === 'deposit') {
        setAmount('');
        setStep('input');
        alert('Deposit successful! You have received uTokens.');
      }
    }
  }, [isConfirmed, step, refetchAllowance]);

  // Check allowance on amount change
  useEffect(() => {
    if (allowance && amount && parseFloat(amount) > 0) {
      const amountBI = parseUnits(amount, asset.decimals);
      if (allowance >= amountBI) {
        setStep('deposit');
      } else {
        setStep('approve');
      }
    }
  }, [allowance, amount, asset.decimals]);

  const handleAction = async () => {
    if (!address) return;
    
    try {
      if (step === 'approve') {
        await writeContract({
          address: asset.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [asset.vaultAddress as `0x${string}`, parseUnits(amount, asset.decimals)],
        });
      } else {
        // V2: deposit(amount, receiver) - Single Asset
        await writeContract({
          address: asset.vaultAddress as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [parseUnits(amount, asset.decimals), address],
        });
      }
    } catch (e: any) {
      console.error("Transaction failed:", e);
    }
  };

  const isLoading = isPending || isConfirming;
  
  // Stepper Logic
  const steps = [
    { id: 'input', label: 'Input' },
    { id: 'approve', label: 'Approve' },
    { id: 'deposit', label: 'Mint' }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === (step === 'input' ? 'input' : step));
  
  const getStepStatus = (index: number) => {
    if (step === 'input') return index === 0 ? 'current' : 'upcoming';
    if (step === 'approve') return index === 1 ? 'current' : (index < 1 ? 'complete' : 'upcoming');
    if (step === 'deposit') return index === 2 ? 'current' : 'complete';
    return 'upcoming';
  };

  return (
    <Card className="h-full flex flex-col">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-zinc-900 font-display">Safe Yield Vault (USDC)</h2>
        <p className="text-sm text-zinc-500">Deposit USDC to earn yield. V2 Architecture.</p>
      </div>

      {/* Transaction Stepper */}
      <div className="flex items-center justify-between mb-8 px-2">
        {steps.map((s, i) => {
          const status = getStepStatus(i);
          return (
            <div key={s.id} className="flex flex-col items-center relative z-10">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                ${status === 'complete' ? 'bg-emerald-500 text-white' : ''}
                ${status === 'current' ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : ''}
                ${status === 'upcoming' ? 'bg-zinc-100 text-zinc-400' : ''}
              `}>
                {status === 'complete' ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium mt-2 ${status === 'current' ? 'text-indigo-600' : 'text-zinc-500'}`}>
                {s.label}
              </span>
              {/* Connector Line */}
              {i < steps.length - 1 && (
                <div className={`
                  absolute top-4 left-1/2 w-[calc(100%+2rem)] h-0.5 -z-10
                  ${status === 'complete' ? 'bg-emerald-500' : 'bg-zinc-100'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-8 flex-1">
        {/* Asset Selection - Expanded Grid */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-3">Select Asset</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {(Object.keys(SUPPORTED_ASSETS) as Array<keyof typeof SUPPORTED_ASSETS>).map((assetKey) => {
              const isSupported = assetKey === 'USDC';
              return (
                <button
                  key={assetKey}
                  onClick={() => isSupported && setSelectedAsset(assetKey)}
                  disabled={!isSupported}
                  className={`
                    flex flex-col items-center justify-center p-3 rounded-xl border transition-all
                    ${selectedAsset === assetKey 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' 
                      : isSupported 
                        ? 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                        : 'bg-zinc-50 border-zinc-100 text-zinc-300 cursor-not-allowed opacity-60'}
                  `}
                >
                  <span className="font-bold text-lg">{SUPPORTED_ASSETS[assetKey].symbol}</span>
                  <span className="text-[10px] opacity-70">{isSupported ? SUPPORTED_ASSETS[assetKey].name : 'Migrating to V2'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount Input - Spacious */}
        <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-100">
          <div className="flex justify-between mb-2">
             <label className="text-sm font-medium text-zinc-700">Amount to Deposit</label>
             <span className="text-xs text-zinc-500">Balance: --</span>
          </div>
          <div className="relative">
            <input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-4xl font-bold text-zinc-900 placeholder-zinc-300 focus:outline-none"
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <span className="text-lg font-medium text-zinc-500">{asset.symbol}</span>
              <button className="text-xs bg-zinc-200 hover:bg-zinc-300 text-zinc-600 px-2 py-1 rounded">MAX</button>
            </div>
          </div>
        </div>

        {/* Info Panel & Error */}
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-zinc-200 shadow-sm">
            <div className="text-sm text-zinc-500">Exchange Rate</div>
            <div className="font-mono font-medium text-zinc-900">1 {asset.symbol} = 1.00 u{asset.symbol}</div>
          </div>
          
          {writeError && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-700">
                <span className="font-bold block mb-1">Transaction Failed</span>
                {writeError.message.split('\n')[0]}
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          className="w-full py-4 text-lg" 
          size="lg" 
          onClick={handleAction}
          isLoading={isLoading}
          disabled={!isConnected || !amount || parseFloat(amount) <= 0}
        >
          {!isConnected ? 'Connect Wallet' : (
            isLoading 
              ? (step === 'approve' ? 'Approving USDC...' : 'Minting uTokens...') 
              : (step === 'approve' ? `Approve ${asset.symbol}` : 'Mint uTokens')
          )}
        </Button>
      </div>
    </Card>
  );
}
