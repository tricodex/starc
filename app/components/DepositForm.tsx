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

  const handleAction = () => {
    if (!address) return;
    
    try {
      if (step === 'approve') {
        writeContract({
          address: asset.address as `0x${string}`,
          abi: erc20Abi,
          functionName: 'approve',
          args: [asset.vaultAddress as `0x${string}`, parseUnits(amount, asset.decimals)],
        });
      } else {
        writeContract({
          address: asset.vaultAddress as `0x${string}`,
          abi: VAULT_ABI,
          functionName: 'deposit',
          args: [asset.address as `0x${string}`, parseUnits(amount, asset.decimals), address],
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const isLoading = isPending || isConfirming;
  const buttonText = isLoading 
    ? (step === 'approve' ? 'Approving...' : 'Depositing...') 
    : (step === 'approve' ? `Approve ${asset.symbol}` : 'Deposit to Vault');

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
              {asset.symbol}
            </span>
          }
        />

        {/* Info Panel */}
        <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-indigo-700">Exchange Rate</span>
            <span className="font-medium text-indigo-900">1 {asset.symbol} ≈ 1.00 uARS</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-indigo-700">Est. Shares</span>
            <span className="font-medium text-indigo-900">{amount || '0.00'} uARS</span>
          </div>
        </div>

        {/* Error Message */}
        {writeError && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {writeError.message.split('\n')[0]}
          </div>
        )}

        {/* Action Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleAction}
          isLoading={isLoading}
          disabled={!isConnected || !amount || parseFloat(amount) <= 0}
        >
          {!isConnected ? 'Connect Wallet' : buttonText}
        </Button>
      </div>
    </Card>
  );
}
