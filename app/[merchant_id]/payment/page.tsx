'use client';

import { useState, use, useEffect } from 'react';
import Image from "next/image";
import { useAccount, useConnect, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SUPPORTED_ASSETS } from '../../config/assets';
import { CircleWallet } from '../../components/CircleWallet';

// Mock Vault ABI for deposit
const vaultAbi = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' }
    ],
    outputs: [{ name: 'shares', type: 'uint256' }]
  }
] as const;

export default function MerchantPaymentPage({ params }: { params: Promise<{ merchant_id: string }> }) {
  const { merchant_id } = use(params);
  const [amount, setAmount] = useState('50.00');
  const [selectedAsset, setSelectedAsset] = useState<keyof typeof SUPPORTED_ASSETS>('mARS');
  const [paymentMethod, setPaymentMethod] = useState<'vault' | 'circle'>('vault');
  const [step, setStep] = useState<'connect' | 'approve' | 'pay' | 'success'>('connect');
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Asset Data
  const asset = SUPPORTED_ASSETS[selectedAsset];
  const { data: balanceValue } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });
  
  const balance = balanceValue ? { 
    value: balanceValue, 
    decimals: asset.decimals, 
    symbol: asset.symbol,
    formatted: formatUnits(balanceValue, asset.decimals)
  } : undefined;
  
  // Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, asset.vaultAddress as `0x${string}`],
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (isConnected) setStep('approve');
  }, [isConnected]);

  useEffect(() => {
    if (isConfirmed) {
      if (step === 'approve') {
        refetchAllowance();
        setStep('pay');
      } else if (step === 'pay') {
        setStep('success');
      }
    }
  }, [isConfirmed, step, refetchAllowance]);

  // Check if approval is needed
  useEffect(() => {
    if (allowance && parseFloat(formatUnits(allowance, asset.decimals)) >= parseFloat(amount)) {
      setStep('pay');
    } else if (isConnected && step !== 'success') {
      setStep('approve');
    }
  }, [allowance, amount, asset.decimals, isConnected, step]);

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleApprove = () => {
    setError(null);
    try {
      writeContract({
        address: asset.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [asset.vaultAddress as `0x${string}`, parseUnits(amount, asset.decimals)],
      });
    } catch (e) {
      setError('Approval failed. Please try again.');
    }
  };

  const handlePay = () => {
    setError(null);
    try {
      writeContract({
        address: asset.vaultAddress as `0x${string}`,
        abi: vaultAbi,
        functionName: 'deposit',
        args: [asset.address as `0x${string}`, parseUnits(amount, asset.decimals), '0x1234567890123456789012345678901234567890'], // Merchant Address
      });
    } catch (e) {
      setError('Payment failed. Please try again.');
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 font-display mb-2">Payment Successful!</h2>
          <p className="text-zinc-500 mb-6">
            You paid <span className="font-medium text-zinc-900">{amount} {asset.symbol}</span> to Merchant #{merchant_id}
          </p>
          {hash && (
            <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-400 font-mono break-all mb-6">
              {hash}
            </div>
          )}
          <Button className="w-full" onClick={() => { setStep('pay'); setPaymentMethod('vault'); }}>
            Make Another Payment
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <Image src="/logo.png" alt="Starc Logo" width={48} height={48} className="rounded-lg" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 font-display">Merchant #{merchant_id}</h1>
          <p className="text-sm text-zinc-500">Starc Unified Payment Gateway</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 text-center">
            <div className="text-sm text-zinc-500 mb-1">Total Due</div>
            <div className="text-3xl font-bold text-zinc-900">$ {amount}</div>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setPaymentMethod('vault')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                paymentMethod === 'vault' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Unified Vault
            </button>
            <button
              onClick={() => setPaymentMethod('circle')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                paymentMethod === 'circle' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Circle Wallet
            </button>
          </div>

          {paymentMethod === 'vault' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Pay with</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SUPPORTED_ASSETS) as Array<keyof typeof SUPPORTED_ASSETS>).map((assetKey) => (
                    <button
                      key={assetKey}
                      onClick={() => setSelectedAsset(assetKey)}
                      className={`
                        px-3 py-2 rounded-lg text-sm font-medium transition-all border
                        ${selectedAsset === assetKey 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}
                      `}
                    >
                      {SUPPORTED_ASSETS[assetKey].symbol}
                    </button>
                  ))}
                </div>
                {balance && (
                  <div className="text-right mt-1 text-xs text-zinc-500">
                    Balance: {balance?.formatted} {balance?.symbol}
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {!isConnected ? (
                <Button className="w-full" size="lg" onClick={handleConnect}>
                  Connect Wallet
                </Button>
              ) : step === 'approve' ? (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleApprove}
                  isLoading={isPending || isConfirming}
                >
                  {isPending || isConfirming ? 'Approving...' : `Approve ${asset.symbol}`}
                </Button>
              ) : (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handlePay}
                  isLoading={isPending || isConfirming}
                >
                  {isPending || isConfirming ? 'Processing...' : `Pay ${amount} ${asset.symbol}`}
                </Button>
              )}
            </>
          ) : (
            <CircleWallet 
              onPay={() => setStep('success')} 
              amount={amount} 
              symbol={asset.symbol} 
            />
          )}
        </div>
      </Card>
    </div>
  );
}
