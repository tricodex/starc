
'use client';

import { useState, useEffect } from 'react';
import { useCircleWallet } from '../context/CircleWalletContext';
import { useReadContract, useWriteContract } from 'wagmi';
import { formatUnits, parseUnits, encodeFunctionData, erc20Abi } from 'viem';
import { VAULT_ABI, STARC_ROUTER_ABI } from '../config/abis';
import { SUPPORTED_ASSETS, STARC_ROUTER_ADDRESS } from '../config/assets';

// Icons
import { CheckCircleIcon, ShieldCheckIcon, BanknotesIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { TruncatedHash } from './ui/TruncatedHash';

const ASSETS = [
  { symbol: 'USDC', name: 'Native USDC', type: 'native', status: 'active', address: SUPPORTED_ASSETS['Native USDC'].address, decimals: 18, isNative: true },
  { symbol: 'USDC', name: 'Bridged USDC', type: 'legacy', status: 'migrating', address: '0x...', decimals: 6, isNative: false },
  { symbol: 'mUSDC', name: 'Mock USDC', type: 'mock', status: 'migrating', address: SUPPORTED_ASSETS['mUSDC'].address, decimals: 18, isNative: false },
  { symbol: 'mARS', name: 'Mock ARS', type: 'mock', status: 'migrating', address: SUPPORTED_ASSETS['mARS'].address, decimals: 18, isNative: false },
  { symbol: 'nARS', name: 'Nu ARS', type: 'mock', status: 'migrating', address: SUPPORTED_ASSETS['nARS'].address, decimals: 18, isNative: false },
];

export function UnifiedVaultWidget() {
  const { walletAddress, sdk, walletId } = useCircleWallet();
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [step, setStep] = useState(1); // 1: Input, 2: Approve, 3: Mint
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Vault Stats (Read from Contract)
  const vaultAddress = SUPPORTED_ASSETS['Native USDC'].vaultAddress as `0x${string}`;
  
  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
    query: { refetchInterval: 5000 }
  });

  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
    query: { refetchInterval: 5000 }
  });

  // Allowance Check - Skip for native tokens
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedAsset.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [walletAddress as `0x${string}`, vaultAddress],
    query: { enabled: !!walletAddress && selectedAsset.status === 'active' && !selectedAsset.isNative }
  });

  // Helper: Poll for Tx Hash - Track transaction count to get the NEW transaction
  const pollForTxHash = async (isApproval: boolean = false) => {
    const userId = localStorage.getItem('circle_user_id');
    if (!userId) return null;

    // Get current transaction count BEFORE executing
    let initialTxCount = 0;
    try {
      const userToken = localStorage.getItem('circle_user_token');
      const headers: Record<string, string> = {};
      if (userToken) headers['X-User-Token'] = userToken;
      const res = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });
      const data = await res.json();
      initialTxCount = data?.data?.transactions?.length || 0;
      console.log(`Initial tx count: ${initialTxCount}`);
    } catch (e) {
      console.error("Failed to get initial tx count:", e);
    }

    for (let i = 0; i < 20; i++) { // 40s timeout
      const userToken = localStorage.getItem('circle_user_token');
      const headers: Record<string, string> = {};
      if (userToken) headers['X-User-Token'] = userToken;

      try {
        const res = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });
        const data = await res.json();
        
        if (data?.data?.transactions?.length > initialTxCount) {
           // NEW transaction found - get the latest one
           const latest = data.data.transactions[0];
           console.log(`Polling attempt ${i+1}: New tx found - ID: ${latest.id}, State: ${latest.state}, Hash: ${latest.txHash}`);
           if (latest.txHash) {
             console.log(`Tx Hash found: ${latest.txHash}`);
             return latest.txHash;
           }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
      await new Promise(r => setTimeout(r, 2000));
    }
    return null;
  };

  // Execute Circle Transaction
  const executeCircleTx = async (contractAddress: string, callData: string) => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('circle_user_id');
      if (!userId || !walletId) throw new Error("Wallet not connected");

      const res = await fetch('/api/circle/wallet/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          walletId,
          contractAddress,
          callData,
          amount: '0' // Contract call, not transfer
        })
      });

      const data = await res.json();
      if (!data.challengeId) throw new Error(data.message || "Execution failed");

      // Persist new session
      if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        sdk?.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });
      }

      // Execute Challenge
      sdk?.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error("Challenge error:", error);
          setLoading(false);
          return;
        }
        
        if (result) {
          console.log("Challenge success, polling for tx...");
          const isApprovalStep = (step === 2);
          const hash = await pollForTxHash(isApprovalStep);
          setLoading(false);
          if (hash) {
            setTxHash(hash);
            if (step === 2) {
                console.log("Approval complete, moving to Mint step");
                setStep(3); // Move to Mint
                refetchAllowance();
            } else if (step === 3) {
                console.log("Mint complete, resetting form");
                setAmount(''); // Reset
            }
          }
        }
      });

    } catch (e) {
      console.error("Execution error:", e);
      setLoading(false);
    }
  };

  const handleApprove = () => {
    if (!amount) return;
    const callData = encodeFunctionData({
      abi: erc20Abi,
      functionName: 'approve',
      args: [vaultAddress, parseUnits(amount, selectedAsset.decimals)]
    });
    executeCircleTx(selectedAsset.address, callData);
  };

  const handleMint = () => {
    if (!amount) return;
    const callData = encodeFunctionData({
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [parseUnits(amount, selectedAsset.decimals), walletAddress as `0x${string}`]
    });
    executeCircleTx(vaultAddress, callData);
  };

  // Check if approved - Native tokens skip approval
  useEffect(() => {
    if (selectedAsset.isNative) {
      // Native USDC doesn't need approval, skip to step 3
      if (step === 2 && amount) setStep(3);
    } else if (allowance && amount) {
        const amountBN = parseUnits(amount, selectedAsset.decimals);
        if (allowance >= amountBN) {
            if (step === 2) setStep(3);
        } else {
            if (step === 3) setStep(2);
        }
    }
  }, [allowance, amount, step, selectedAsset.isNative]);

  // Helper: Format number with max 6 decimals, remove trailing zeros
  const formatAmount = (value: bigint | undefined, decimals: number) => {
    if (!value) return '0.00';
    const formatted = formatUnits(value, decimals);
    const num = parseFloat(formatted);
    if (num === 0) return '0.00';
    if (num < 0.01) return num.toFixed(6).replace(/\.?0+$/, ''); // Small numbers: max 6 decimals
    return num.toFixed(2); // Normal numbers: 2 decimals
  };

  return (
    <div className="space-y-8">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Protocol Health</div>
          <div className="text-sm font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircleIcon className="w-4 h-4" /> System Stable
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Collateralization</div>
          <div className="text-lg font-bold text-zinc-900">99.90%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Vault Type</div>
          <div className="text-sm font-medium text-indigo-600 flex items-center gap-1">
            <ShieldCheckIcon className="w-4 h-4" /> Safe V2
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Assets</div>
          <div className="text-lg font-bold text-zinc-900 truncate" title={totalAssets ? formatUnits(totalAssets, 18) : '0.00'}>
            ${formatAmount(totalAssets, 18)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Supply</div>
          <div className="text-lg font-bold text-zinc-900 truncate" title={totalSupply ? formatUnits(totalSupply, 18) : '0.00'}>
            {formatAmount(totalSupply, 18)}
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
            <BanknotesIcon className="w-5 h-5 text-indigo-600" />
            Safe Yield Vault (USDC)
          </h3>
          <p className="text-sm text-zinc-500">Deposit USDC to earn yield. V2 Architecture.</p>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Asset List */}
          <div className="lg:col-span-4 space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Select Asset</label>
            <div className="space-y-2">
              {ASSETS.map((asset, idx) => (
                <button
                  key={idx}
                  onClick={() => asset.status === 'active' && setSelectedAsset(asset)}
                  disabled={asset.status !== 'active'}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    selectedAsset.symbol === asset.symbol && asset.status === 'active'
                      ? 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  } ${asset.status !== 'active' ? 'opacity-60 cursor-not-allowed bg-zinc-50' : ''}`}
                >
                  <div>
                    <div className="font-medium text-zinc-900">{asset.symbol}</div>
                    <div className="text-xs text-zinc-500">{asset.name}</div>
                  </div>
                  {asset.status === 'migrating' && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      Migrating to V2
                    </span>
                  )}
                  {selectedAsset.symbol === asset.symbol && asset.status === 'active' && (
                    <CheckCircleIcon className="w-5 h-5 text-indigo-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Action Area */}
          <div className="lg:col-span-8 space-y-6">
            {/* Stepper */}
            <div className="flex items-center gap-4 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step >= s ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-400'
                  }`}>
                    {s}
                  </div>
                  <span className={`text-sm font-medium ${step >= s ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {s === 1 ? 'Input' : s === 2 ? 'Approve' : 'Mint'}
                  </span>
                  {s < 3 && <div className="w-8 h-px bg-zinc-200 mx-2" />}
                </div>
              ))}
            </div>

            {/* Input Step */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Amount to Deposit</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                        setAmount(e.target.value);
                        if (step === 3) setStep(2); // Reset to approve check if amount changes
                    }}
                    placeholder="0.00"
                    className="w-full text-3xl font-bold text-zinc-900 bg-transparent border-b-2 border-zinc-200 focus:border-indigo-600 focus:outline-none py-2 px-1 placeholder:text-zinc-300"
                  />
                  <span className="absolute right-0 bottom-3 text-lg font-medium text-zinc-400">{selectedAsset.symbol}</span>
                </div>
                <div className="flex justify-between mt-2 text-xs text-zinc-500">
                  <span>Balance: --</span>
                  <button className="text-indigo-600 font-medium hover:text-indigo-700">MAX</button>
                </div>
              </div>

              <div className="bg-zinc-50 p-4 rounded-lg flex justify-between items-center">
                <span className="text-sm text-zinc-500">Exchange Rate</span>
                <span className="text-sm font-medium text-zinc-900">1 {selectedAsset.symbol} = 1.00 uUSDC</span>
              </div>

              {/* Actions */}
              <div className="pt-4">
                {step === 2 && (
                    <button
                        onClick={handleApprove}
                        disabled={loading || !amount}
                        className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                        {loading ? 'Approving...' : `Approve ${selectedAsset.symbol}`}
                    </button>
                )}
                {step === 3 && (
                    <button
                        onClick={handleMint}
                        disabled={loading || !amount}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : null}
                        {loading ? 'Minting...' : 'Mint uTokens'}
                    </button>
                )}
                {step === 1 && (
                    <button
                        onClick={() => setStep(2)}
                        disabled={!amount}
                        className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        Continue
                    </button>
                )}
              </div>

              {txHash && (
                <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="font-bold">Transaction Successful</span>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                        <TruncatedHash hash={txHash} externalLink={`https://testnet.arcscan.app/tx/${txHash}`} />
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
