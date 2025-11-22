'use client';

import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SUPPORTED_ASSETS } from '../config/assets';
import { Header } from '../components/Header';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';

// Minimal ABIs
const VAULT_ABI = [
  { type: 'function', name: 'paused', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
  { type: 'function', name: 'pause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'unpause', inputs: [], outputs: [], stateMutability: 'nonpayable' },
] as const;

const ORACLE_ABI = [
  { type: 'function', name: 'latestAnswer', inputs: [], outputs: [{ type: 'int256' }], stateMutability: 'view' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'updateAnswer', inputs: [{ type: 'int256', name: '_answer' }], outputs: [], stateMutability: 'nonpayable' },
] as const;

function AssetRow({ assetKey }: { assetKey: keyof typeof SUPPORTED_ASSETS }) {
  const asset = SUPPORTED_ASSETS[assetKey];
  const [isUpdatingOracle, setIsUpdatingOracle] = useState(false);

  // Read Vault Status
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: asset.vaultAddress as `0x${string}`,
    abi: VAULT_ABI,
    functionName: 'paused',
  });

  // Read Oracle Price
  const { data: oraclePrice, refetch: refetchOracle } = useReadContract({
    address: asset.oracleAddress as `0x${string}`,
    abi: ORACLE_ABI,
    functionName: 'latestAnswer',
  });

  // Write Contracts
  const { writeContract: pauseVault, data: pauseHash } = useWriteContract();
  const { writeContract: unpauseVault, data: unpauseHash } = useWriteContract();
  const { writeContract: updateOracle, data: oracleHash } = useWriteContract();

  // Wait for Tx
  const { isSuccess: isPauseSuccess } = useWaitForTransactionReceipt({ hash: pauseHash });
  const { isSuccess: isUnpauseSuccess } = useWaitForTransactionReceipt({ hash: unpauseHash });
  const { isSuccess: isOracleSuccess } = useWaitForTransactionReceipt({ hash: oracleHash });

  useEffect(() => {
    if (isPauseSuccess || isUnpauseSuccess) refetchPaused();
    if (isOracleSuccess) {
        refetchOracle();
        setIsUpdatingOracle(false);
    }
  }, [isPauseSuccess, isUnpauseSuccess, isOracleSuccess, refetchPaused, refetchOracle]);

  const handleTogglePause = () => {
    if (isPaused) {
      unpauseVault({
        address: asset.vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'unpause',
      });
    } else {
      pauseVault({
        address: asset.vaultAddress as `0x${string}`,
        abi: VAULT_ABI,
        functionName: 'pause',
      });
    }
  };

  const handleSimulateDepeg = () => {
    setIsUpdatingOracle(true);
    // Simulate a crash to 0.90 (decimals 8)
    const newPrice = BigInt(90000000); 
    updateOracle({
        address: asset.oracleAddress as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'updateAnswer',
        args: [newPrice]
    });
  };

  const handleRestorePeg = () => {
    setIsUpdatingOracle(true);
    // Restore to 1.00 (decimals 8)
    const newPrice = BigInt(100000000); 
    updateOracle({
        address: asset.oracleAddress as `0x${string}`,
        abi: ORACLE_ABI,
        functionName: 'updateAnswer',
        args: [newPrice]
    });
  };

  // Parse Price
  const price = oraclePrice ? Number(formatUnits(oraclePrice, 8)) : 0;
  const isPegged = Math.abs(price - 1.0) < 0.02; // 2% deviation tolerance

  return (
    <tr className="border-b border-zinc-50 last:border-0">
      <td className="px-4 py-3 font-medium text-zinc-900">{asset.name}</td>
      <td className="px-4 py-3 text-zinc-500">{asset.symbol}</td>
      <td className="px-4 py-3 font-mono">
        {oraclePrice ? `$${price.toFixed(4)}` : 'Loading...'}
      </td>
      <td className="px-4 py-3">
         <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            !isPaused ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
            {!isPaused ? 'Active' : 'Paused'}
            </span>
            
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            isPegged ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
            {isPegged ? 'Pegged' : 'De-pegged'}
            </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
            <Button 
                size="sm" 
                variant={isPaused ? "primary" : "secondary"}
                onClick={handleTogglePause}
                className={isPaused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-100 text-red-700 hover:bg-red-200 border-red-200"}
            >
                {isPaused ? 'Unpause Vault' : 'Pause Vault'}
            </Button>
            
            <div className="flex flex-col gap-1">
                 <button 
                    onClick={handleSimulateDepeg} 
                    disabled={isUpdatingOracle}
                    className="text-[10px] text-red-600 hover:underline disabled:opacity-50"
                 >
                    Simulate Depeg
                 </button>
                 <button 
                    onClick={handleRestorePeg} 
                    disabled={isUpdatingOracle}
                    className="text-[10px] text-emerald-600 hover:underline disabled:opacity-50"
                 >
                    Restore Peg
                 </button>
            </div>
        </div>
      </td>
    </tr>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'risk' | 'assets'>('assets');

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-2">Admin Console</div>
                <nav className="space-y-1">
                <button
                    onClick={() => setActiveTab('assets')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'assets' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                    Asset Management
                </button>
                <button
                    onClick={() => setActiveTab('risk')}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'risk' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                >
                    Risk Controls
                </button>
                </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6">
            <div className="mb-2">
                <h1 className="font-display text-2xl font-bold text-zinc-900">
                    {activeTab === 'assets' ? 'Asset Management' : 'Risk Controls'}
                </h1>
                <p className="text-zinc-500 text-sm">
                    {activeTab === 'assets' 
                        ? 'Monitor vault status, oracle prices, and manage asset whitelisting.' 
                        : 'Global protocol parameters and emergency controls.'}
                </p>
            </div>

            {activeTab === 'risk' && (
              <>
                <Card title="Emergency Controls" description="Critical actions for protocol safety.">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <h4 className="font-medium text-red-900">Global Protocol Pause</h4>
                      <p className="text-sm text-red-700">
                        Stops all deposits and withdrawals across all vaults.
                      </p>
                    </div>
                    <Button variant="secondary" className="bg-red-600 hover:bg-red-700 text-white border-none">
                      Emergency Pause All
                    </Button>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                  <Card title="Risk Parameters">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Max Oracle Staleness</span>
                        <span className="font-mono text-sm">24 hours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Deposit Fee</span>
                        <span className="font-mono text-sm">0.10%</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'assets' && (
              <Card title="Supported Assets" description="Real-time vault status and oracle feeds.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Oracle Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(SUPPORTED_ASSETS).filter(k => k !== 'USDC') as Array<keyof typeof SUPPORTED_ASSETS>).map((key) => (
                        <AssetRow key={key} assetKey={key} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
