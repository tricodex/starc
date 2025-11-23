'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useWaitForTransactionReceipt, useWriteContract, useReadContract, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { LottieAnimation } from '@/app/components/ui/LottieAnimation';
import { TruncatedHash } from '@/app/components/ui/TruncatedHash';
import { SUPPORTED_ASSETS } from '@/app/config/assets';
import { CircleWallet } from '@/app/components/CircleWallet';
import { useCircleWallet } from '@/app/context/CircleWalletContext';
import { Header } from '@/app/components/Header';
import { VAULT_ABI, STARC_ROUTER_ABI } from '@/app/config/abis';
import { updatePaymentStatus } from './actions';

import { encodeFunctionData } from 'viem';

// Import Lottie JSONs directly
import loadingCoinAnimation from '@/app/assets/lottie/LoadingCoin.json';
import successAnimation from '@/app/assets/lottie/Succes.json';
import errorAnimation from '@/app/assets/lottie/Error.json';
import qrScanSuccessAnimation from '@/app/assets/lottie/QRScanSucces.json';

interface PaymentRequestFormProps {
  merchant: {
    id: string;
    slug: string;
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
  paymentUrl: string;
}

export function PaymentRequestForm({ merchant, paymentRequest, paymentUrl }: PaymentRequestFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<'vault' | 'circle'>('vault');
  const [step, setStep] = useState<'connect' | 'approve' | 'pay' | 'processing' | 'success' | 'error'>('connect');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txType, setTxType] = useState<'approve' | 'pay' | null>(null);
  const [circleTxHash, setCircleTxHash] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Asset Data - Map currency to asset config
  const asset = SUPPORTED_ASSETS[paymentRequest.currency as keyof typeof SUPPORTED_ASSETS] || SUPPORTED_ASSETS['USDC'];

  // For Native USDC, we need to detect it early
  const isNativeToken = asset.address === '0x3600000000000000000000000000000000000000';

  // Balance Check - Use getBalance for native token, balanceOf for ERC20
  const { data: nativeBalanceData } = useBalance({
    address: address,
    query: { enabled: !!address && isNativeToken },
  });

  const { data: erc20Balance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address!],
    query: { enabled: !!address && !isNativeToken },
  });

  // Combine balances - use native balance if it's native token, otherwise ERC20
  const balanceValue = isNativeToken ? nativeBalanceData?.value : erc20Balance;

  // Allowance Check (Wagmi) - Skip for native tokens
  const spenderAddress = asset.isVaultAsset ? asset.vaultAddress : asset.routerAddress;
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address!, spenderAddress as `0x${string}`],
    query: { enabled: !!address && !isNativeToken },
  });

  // Circle Wallet Logic
  const { walletAddress: circleWalletAddress } = useCircleWallet();

  // For Native USDC (gas token), we don't need approvals
  const isNativeUSDC = asset.symbol === 'USDC' && asset.address === '0x3600000000000000000000000000000000000000';

  // Allowance Check (Circle) - Skip for native USDC
  // Only check allowance if we have a wallet address and circle mode is active
  const { data: circleAllowance, refetch: refetchCircleAllowance } = useReadContract({
    address: asset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [circleWalletAddress as `0x${string}`, spenderAddress as `0x${string}`],
    query: { enabled: !!circleWalletAddress && paymentMethod === 'circle' && !isNativeUSDC },
  });

  // Check if approved - Native USDC doesn't need approval
  const isCircleApproved = isNativeUSDC || (circleAllowance !== undefined && parseFloat(formatUnits(circleAllowance, asset.decimals)) >= parseFloat(paymentRequest.amount));

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
      if (txType === 'pay') {
        if (hash) {
            updatePaymentStatus(paymentRequest.id, hash)
                .then(() => setStep('success'))
                .catch((err) => {
                    console.error("Failed to update status", err);
                    setStep('success'); // Show success anyway
                });
        } else {
            setStep('success');
        }
      } else if (txType === 'approve') {
        refetchAllowance();
        setStep('pay');
        setTxType(null);
      }
    }
  }, [isConfirmed, txType, refetchAllowance, hash, paymentRequest.id]);

  useEffect(() => {
    if (writeError) {
      setStep('error');
      setErrorMsg(writeError.message || 'Transaction failed');
      setTxType(null);
    }
  }, [writeError]);

  // Auto-advance if allowance is sufficient OR if it's a native token (Wagmi)
  useEffect(() => {
    if (step === 'approve') {
      if (isNativeToken) {
        // Native tokens don't need approval, skip directly to pay
        setStep('pay');
      } else if (allowance && parseFloat(formatUnits(allowance, asset.decimals)) >= parseFloat(paymentRequest.amount)) {
        setStep('pay');
      }
    }
  }, [allowance, paymentRequest.amount, asset.decimals, step, isNativeToken]);

  const handleConnect = () => {
    connect({ connector: injected() });
  };

  const handleApprove = () => {
    try {
      setTxType('approve');
      writeContract({
        address: asset.address as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [spenderAddress as `0x${string}`, parseUnits(paymentRequest.amount, asset.decimals)],
      });
    } catch (e) {
      console.error(e);
      setTxType(null);
    }
  };

  const handlePay = () => {
    try {
      setTxType('pay');
      if (asset.isVaultAsset) {
        // Direct Deposit to Vault
        writeContract({
            address: asset.vaultAddress as `0x${string}`,
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [parseUnits(paymentRequest.amount, asset.decimals), merchant.walletAddress as `0x${string}`],
        });
      } else {
        // Route via Starc Router
        if (!asset.routerAddress) throw new Error("Router address not configured");
        
        writeContract({
            address: asset.routerAddress as `0x${string}`,
            abi: STARC_ROUTER_ABI,
            functionName: 'pay',
            args: [
                asset.address as `0x${string}`,
                parseUnits(paymentRequest.amount, asset.decimals),
                asset.vaultAddress as `0x${string}`,
                merchant.walletAddress as `0x${string}`
            ],
        });
      }
    } catch (e) {
      console.error(e);
      setTxType(null);
    }
  };

  const getCirclePaymentConfig = () => {
    if (!asset || !circleWalletAddress) return {};

    // For Native USDC (gas token), use direct transfer - no contract calls needed
    if (isNativeUSDC) {
        return {
            recipientAddress: merchant.walletAddress, // Direct transfer to merchant
            contractAddress: undefined,
            callData: undefined
        };
    }

    // Force Approve if needed (for ERC20 tokens only)
    if (!isCircleApproved) {
        const callData = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'approve',
            args: [spenderAddress as `0x${string}`, parseUnits(paymentRequest.amount, asset.decimals)]
        });
        return {
            contractAddress: asset.address,
            callData
        };
    }

    if (asset.isVaultAsset) {
        // Direct Deposit to Vault
        const callData = encodeFunctionData({
            abi: VAULT_ABI,
            functionName: 'deposit',
            args: [parseUnits(paymentRequest.amount, asset.decimals), merchant.walletAddress as `0x${string}`]
        });
        return {
            contractAddress: asset.vaultAddress,
            callData
        };
    } else {
        // Route via Starc Router
        if (!asset.routerAddress) return {};

        const callData = encodeFunctionData({
            abi: STARC_ROUTER_ABI,
            functionName: 'pay',
            args: [
                asset.address as `0x${string}`,
                parseUnits(paymentRequest.amount, asset.decimals),
                asset.vaultAddress as `0x${string}`,
                merchant.walletAddress as `0x${string}`
            ]
        });
        return {
            contractAddress: asset.routerAddress,
            callData
        };
    }
  };

  const circleConfig = getCirclePaymentConfig();

  // Render States
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <LottieAnimation animationData={loadingCoinAnimation} height={200} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold text-zinc-900 mb-2">
            {txType === 'approve' ? 'Approving Token' : 'Processing Payment'}
          </h2>
          <p className="text-zinc-500 mb-4">
            {txType === 'approve' 
              ? 'Please wait while the approval confirms on Arc Testnet.' 
              : 'Please wait while the transaction confirms on Arc Testnet.'}
          </p>
          {hash && <TruncatedHash hash={hash} externalLink={`https://testnet.arcscan.app/tx/${hash}`} />}
        </Card>
      </div>
    );
  }

  if (step === 'success' || paymentRequest.status === 'COMPLETED') {
    const displayHash = circleTxHash || hash || paymentRequest.txHash;

    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <LottieAnimation animationData={successAnimation} loop={false} height={150} className="mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-emerald-600 mb-2">Payment Successful!</h2>
          <p className="text-zinc-500 mb-6">
            You paid <span className="font-bold text-zinc-900">{paymentRequest.amount} {asset.symbol}</span> to {merchant.name}
          </p>
          {displayHash && (
            <div className="bg-zinc-50 rounded-lg p-3 mb-6">
              <div className="text-xs text-zinc-400 mb-1">Transaction Hash</div>
              <TruncatedHash hash={displayHash} externalLink={`https://testnet.arcscan.app/tx/${displayHash}`} />
            </div>
          )}
          <Button className="w-full" onClick={() => window.location.href = `/${merchant.slug}`}>
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
          <h2 className="text-xl font-bold text-red-600 mb-2">
             {txType === 'approve' ? 'Approval Failed' : 'Payment Failed'}
          </h2>
          <p className="text-zinc-500 mb-6">{errorMsg}</p>
          <Button className="w-full" onClick={() => setStep(txType === 'approve' ? 'approve' : 'pay')}>
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
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                        <span>Step 1 of 2</span>
                        <span>Approve Token</span>
                    </div>
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handleApprove}
                        isLoading={isPending || isConfirming}
                    >
                        {isPending || isConfirming ? 'Approving...' : `Approve ${asset.symbol}`}
                    </Button>
                    <p className="text-xs text-center text-zinc-400 mt-2">
                        You must approve the vault to spend your {asset.symbol} before paying.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                        <span>Step 2 of 2</span>
                        <span>Confirm Payment</span>
                    </div>
                    <Button 
                        className="w-full" 
                        size="lg" 
                        onClick={handlePay}
                        isLoading={isPending || isConfirming}
                    >
                        {isPending || isConfirming ? 'Processing...' : `Pay Now`}
                    </Button>
                  </div>
                )}
                
                {balanceValue !== undefined && balanceValue !== null && (
                  <div className="text-center text-xs text-zinc-400">
                    Balance: {formatUnits(balanceValue, asset.decimals)} {asset.symbol}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                  {!isCircleApproved && circleWalletAddress && (
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                          <span>Step 1 of 2</span>
                          <span>Approve Token</span>
                      </div>
                  )}
                  {isCircleApproved && (
                      <div className="flex items-center justify-between text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wider">
                          <span>Step 2 of 2</span>
                          <span>Confirm Payment</span>
                      </div>
                  )}
                  
                  <CircleWallet
                    onPay={(txHash) => {
                        if (!isCircleApproved && !isNativeUSDC) {
                            // Just finished Approval (only for ERC20 tokens)
                            console.log("Approval Transaction Hash:", txHash);
                            // Wait a moment then refetch
                            setTimeout(() => refetchCircleAllowance(), 2000);
                        } else {
                            // Finished Payment
                            if (txHash) {
                                setCircleTxHash(txHash); // Store Circle tx hash
                                updatePaymentStatus(paymentRequest.id, txHash)
                                    .then(() => setStep('success'))
                                    .catch(err => {
                                        console.error("Failed to update status", err);
                                        setStep('success');
                                    });
                            } else {
                                setStep('success');
                            }
                        }
                    }}
                    amount={paymentRequest.amount}
                    symbol={asset.symbol}
                    recipientAddress={circleConfig.recipientAddress || merchant.walletAddress}
                    contractAddress={circleConfig.contractAddress}
                    callData={circleConfig.callData}
                    buttonText={!isCircleApproved ? `Approve ${asset.symbol}` : "Pay Now"}
                  />
                  
                  {!isCircleApproved && (
                      <p className="text-xs text-center text-zinc-400 mt-2">
                          You must approve the router to spend your {asset.symbol} before paying.
                      </p>
                  )}
              </div>
            )}

            {/* QR Code Section */}
            <div className="border-t border-zinc-100 pt-6 text-center">
               <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Or Scan to Pay</div>
               <div className="bg-white p-3 rounded-xl shadow-sm border border-zinc-100 inline-block">
                 <QRCodeSVG value={paymentUrl} size={120} />
               </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
