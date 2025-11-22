'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWaitForTransactionReceipt, useWriteContract, useReadContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LottieAnimation } from '@/app/components/ui/LottieAnimation';
import { TruncatedHash } from '@/app/components/ui/TruncatedHash';
import { SUPPORTED_ASSETS } from '@/app/config/assets';
import { CircleWallet } from '@/app/components/CircleWallet';
import { Header } from '@/app/components/Header';
import { VAULT_ABI } from '@/app/config/abis';

// Import Lottie JSONs directly
import loadingCoinAnimation from '@/app/assets/lottie/LoadingCoin.json';
import successAnimation from '@/app/assets/lottie/Succes.json';
import errorAnimation from '@/app/assets/lottie/Error.json';
import qrScanSuccessAnimation from '@/app/assets/lottie/QRScanSucces.json';

interface PaymentRequestFormProps {
  merchant: {
    id: string;
    name: string;
    walletAddress: string;
    logoUrl?: string | null;
  };
  paymentRequest: {
    id: string;
    amount: string; // Serialized Decimal
    currency: string;
    status: string;
    txHash?: string | null;
  };
}

export function PaymentRequestForm({ merchant, paymentRequest }: PaymentRequestFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'vault' | 'circle'>('vault');
  const [step, setStep] = useState<'connect' | 'approve' | 'pay' | 'processing' | 'success' | 'error'>('connect');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Asset Data (Fixed to USDC for now based on schema default)
  const asset = SUPPORTED_ASSETS['mUSDC'];
  
  // Balance Check
  const { data: balanceValue } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address },
  });

  // Allowance Check
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, asset.vaultAddress as `0x${string}`],
    query: { enabled: !!address },
  });

  useEffect(() => {
    if (isConnected && step === 'connect') setStep('approve');
  }, [isConnected, step]);

  useEffect(() => {
    if (isPending || isConfirming) {
      setStep('processing');
    }
  }, [isPending, isConfirming]);

  useEffect(() => {
    if (isConfirmed) {
      setStep('success');
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (writeError) {
      setStep('error');
      setErrorMsg(writeError.message || 'Transaction failed');
    }
  }, [writeError]);

  // Auto-advance if allowance is sufficient
  useEffect(() => {
    if (allowance && parseFloat(formatUnits(allowance, asset.decimals)) >= parseFloat(paymentRequest.amount) && step === 'approve') {
      setStep('pay');
    }
  }, [allowance, paymentRequest.amount, asset.decimals, step]);

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleApprove = () => {
    try {
      writeContract({
        address: asset.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [asset.vaultAddress as `0x${string}`, parseUnits(paymentRequest.amount, asset.decimals)],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePay = () => {
    try {
      writeContract({
        address: asset.vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'deposit',
        args: [parseUnits(paymentRequest.amount, asset.decimals), merchant.walletAddress as `0x${string}`],
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Render States
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <LottieAnimation animationData={loadingCoinAnimation} height={200} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Processing Payment</h2>
          <p className="text-zinc-500 mb-4">Please wait while the transaction confirms on Arc Testnet.</p>
          {hash && <TruncatedHash hash={hash} externalLink={`https://explorer.testnet.arc.network/tx/${hash}`} />}
        </Card>
      </div>
    );
  }

  if (step === 'success' || paymentRequest.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <LottieAnimation animationData={successAnimation} loop={false} height={150} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">Payment Successful!</h2>
          <p className="text-zinc-500 mb-6">
            You paid <span className="font-bold text-zinc-900">{paymentRequest.amount} {asset.symbol}</span> to {merchant.name}
          </p>
          {hash && (
            <div className="bg-zinc-50 rounded-lg p-3 mb-6">
              <div className="text-xs text-zinc-400 mb-1">Transaction Hash</div>
              <TruncatedHash hash={hash} externalLink={`https://explorer.testnet.arc.network/tx/${hash}`} />
            </div>
          )}
          <Button className="w-full" onClick={() => window.location.reload()}>
            Return to Merchant
          </Button>
        </Card>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <LottieAnimation animationData={errorAnimation} loop={false} height={150} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-2">Payment Failed</h2>
          <p className="text-zinc-500 mb-6">{errorMsg}</p>
          <Button className="w-full" onClick={() => setStep('pay')}>
            Try Again
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-64px)]">
        <Card className="max-w-md w-full relative overflow-hidden">
          {/* QR Code Toggle */}
          <button 
            onClick={() => setShowQR(!showQR)}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4h2v-4zm-6 0H6.414a1 1 0 00-.707.293L4.293 16.707A1 1 0 004 17.414V19a1 1 0 001 1h2.586a1 1 0 00.707-.293l1.414-1.414a1 1 0 00.293-.707V16a1 1 0 00-1-1z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 3v4a1 1 0 001 1h4a1 1 0 001-1V3a1 1 0 00-1-1h-4a1 1 0 00-1 1zm4 10a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4a1 1 0 011-1h4z" />
            </svg>
          </button>

          {showQR ? (
            <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
              <h3 className="text-lg font-bold text-zinc-900 mb-6">Scan to Pay</h3>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100 inline-block mb-6">
                <QRCodeSVG value={typeof window !== 'undefined' ? window.location.href : ''} size={200} />
              </div>
              <p className="text-sm text-zinc-500 mb-6">Scan with your mobile wallet</p>
              <Button variant="secondary" onClick={() => setShowQR(false)}>Back to Payment</Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                {merchant.logoUrl && (
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full overflow-hidden bg-white shadow-sm border border-zinc-100">
                        <img src={merchant.logoUrl} alt={merchant.name} className="w-full h-full object-cover" />
                    </div>
                )}
                <h1 className="text-xl font-bold text-zinc-900 font-display">{merchant.name}</h1>
                <div className="mt-2 text-xs text-zinc-400 font-mono bg-zinc-50 inline-block px-2 py-1 rounded">
                    <TruncatedHash hash={merchant.walletAddress} showCopy={true} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>
                  <div className="text-sm text-zinc-500 mb-1">Total Amount</div>
                  <div className="text-4xl font-bold text-zinc-900 tracking-tight">
                    $ {paymentRequest.amount}
                  </div>
                  <div className="text-xs font-medium text-indigo-600 mt-2 bg-indigo-50 inline-block px-2 py-0.5 rounded-full">
                    {asset.symbol}
                  </div>
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
                  <div className="space-y-4">
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
                        {isPending || isConfirming ? 'Processing...' : `Pay Now`}
                      </Button>
                    )}
                    
                    {balanceValue && (
                      <div className="text-center text-xs text-zinc-400">
                        Balance: {formatUnits(balanceValue, asset.decimals)} {asset.symbol}
                      </div>
                    )}
                  </div>
                ) : (
                  <CircleWallet 
                    onPay={() => setStep('success')} 
                    amount={paymentRequest.amount} 
                    symbol={asset.symbol} 
                  />
                )}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
