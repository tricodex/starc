'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { SUPPORTED_ASSETS } from '../config/assets';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { LottieAnimation } from './ui/LottieAnimation';
import { TruncatedHash } from './ui/TruncatedHash';

import { useCircleWallet } from '../context/CircleWalletContext';

import loadingCoinAnimation from '@/app/assets/lottie/LoadingCoin.json';
import successAnimation from '@/app/assets/lottie/Succes.json';
import errorAnimation from '@/app/assets/lottie/Error.json';

type BridgeStatus = 'idle' | 'processing' | 'success' | 'error';

export function BridgeWidget() {
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { address } = useAccount();
  const { walletId, sdk, walletAddress } = useCircleWallet();
  const [balance, setBalance] = useState<string>('--');

  // Fetch Circle Wallet Balance - Native USDC doesn't need approval
  useEffect(() => {
    const fetchData = async () => {
      if (!walletId) return;
      try {
        const res = await fetch(`/api/circle/wallet/balance?id=${walletId}`);
        const data = await res.json();
        
        // Find Native USDC balance
        const nativeUSDC = data?.data?.tokenBalances?.find(
          (t: any) => t.token.isNative === true
        );
        
        if (nativeUSDC) {
          setBalance(nativeUSDC.amount);
        }
      } catch (e) {
        console.error("Failed to fetch balance", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [walletId]);

  const pollForTxHash = async (userId: string, initialTxCount: number): Promise<string | null> => {
    const userToken = localStorage.getItem('circle_user_token');
    console.log(`Starting poll with initial tx count: ${initialTxCount}`);
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const headers: Record<string, string> = {};
        if (userToken) headers['X-User-Token'] = userToken;
        const res = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });
        const data = await res.json();
        
        const currentTxCount = data?.data?.transactions?.length || 0;
        console.log(`Polling attempt ${i+1}: Found ${currentTxCount} transactions (initial: ${initialTxCount})`);
        
        if (currentTxCount > initialTxCount) {
          // NEW transaction found
          const latestTx = data.data.transactions[0];
          console.log(`Latest Tx: ${latestTx.id}, State: ${latestTx.state}, Hash: ${latestTx.txHash}`);
          if (latestTx.txHash) {
            console.log(`Tx Hash found: ${latestTx.txHash}`);
            return latestTx.txHash;
          }
        }
      } catch (error) { console.error('Polling error:', error); }
    }
    return null;
  };

  const handleBridge = async () => {
    if (!walletId || !sdk || !amount) return;
    setIsProcessing(true);
    setBridgeStatus('processing');
    
    try {
        const userId = localStorage.getItem('circle_user_id');
        
        // Get initial transaction count BEFORE bridge
        const userToken = localStorage.getItem('circle_user_token');
        const headers: Record<string, string> = {};
        if (userToken) headers['X-User-Token'] = userToken;
        const txRes = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });
        const txData = await txRes.json();
        const initialTxCount = txData?.data?.transactions?.length || 0;
        console.log(`Bridge: Initial tx count = ${initialTxCount}`);
        
        const res = await fetch('/api/treasury/bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletId, userId, amount })
        });
        const data = await res.json();
        
        console.log("Bridge Initiated:", data);
        console.log("Challenge ID:", data.challengeId);
        console.log("API Response Full:", JSON.stringify(data, null, 2));
        
        if (data.challengeId) {
            if (data.userToken && data.encryptionKey) {
                localStorage.setItem('circle_user_token', data.userToken);
                localStorage.setItem('circle_encryption_key', data.encryptionKey);
                sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });
            }

            sdk.execute(data.challengeId, async (error, result) => {
                if (error) {
                    setIsProcessing(false);
                    setBridgeStatus('error');
                    setErrorMessage(error.message || 'Bridge transaction failed');
                    return;
                }
                if (result) {
                    console.log("Bridge challenge complete, polling for tx hash...");
                    const hash = await pollForTxHash(userId!, initialTxCount);
                    setIsProcessing(false);
                    if (hash) {
                        console.log("Bridge tx hash:", hash);
                        setTxHash(hash);
                        setBridgeStatus('success');
                        setAmount('');
                    } else {
                        setBridgeStatus('error');
                        setErrorMessage('Transaction hash not found.');
                    }
                }
            });
        } else {
            setIsProcessing(false);
            setBridgeStatus('error');
            setErrorMessage(data.message || "Bridge failed");
        }
    } catch (e: any) {
        setIsProcessing(false);
        setBridgeStatus('error');
        setErrorMessage(e.message || 'An unexpected error occurred');
    }
  };

  return (
    <>
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
            disabled={!amount || parseFloat(amount) <= 0 || parseFloat(balance) < parseFloat(amount || '0')}
          >
            {isProcessing ? 'Bridging via CCTP...' : 'Bridge to Ethereum'}
          </Button>

          <div className="text-center text-xs text-zinc-400 mt-2">
            0% Slippage • Native Burn & Mint
          </div>
        </div>
      </Card>

      {/* Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full text-center p-8 animate-in fade-in zoom-in-95 duration-200">
            <LottieAnimation animationData={loadingCoinAnimation} height={200} className="mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-900 mb-2">Bridging USDC</h2>
            <p className="text-zinc-500 mb-4">
              Please wait while Circle CCTP processes your cross-chain transfer...
            </p>
            <div className="text-xs text-zinc-400">
              This usually takes about 20 seconds
            </div>
          </Card>
        </div>
      )}

      {/* Success Modal */}
      {bridgeStatus === 'success' && txHash && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full text-center p-8 animate-in fade-in zoom-in-95 duration-200">
            <LottieAnimation animationData={successAnimation} loop={false} height={150} className="mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-emerald-600 mb-2">Bridge Successful!</h2>
            <p className="text-zinc-500 mb-6">
              Your USDC has been bridged to Ethereum via Circle CCTP
            </p>
            <div className="bg-zinc-50 rounded-lg p-3 mb-6">
              <div className="text-xs text-zinc-400 mb-1">Transaction Hash</div>
              <TruncatedHash hash={txHash} externalLink={`https://testnet.arcscan.app/tx/${txHash}`} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                setBridgeStatus('idle');
                setTxHash(null);
              }}
            >
              Close
            </Button>
          </Card>
        </div>
      )}

      {/* Error Modal */}
      {bridgeStatus === 'error' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full text-center p-8 animate-in fade-in zoom-in-95 duration-200">
            <LottieAnimation animationData={errorAnimation} loop={false} height={150} className="mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Bridge Failed</h2>
            <p className="text-zinc-500 mb-6">{errorMessage}</p>
            <Button
              className="w-full"
              onClick={() => {
                setBridgeStatus('idle');
                setErrorMessage('');
              }}
            >
              Try Again
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
