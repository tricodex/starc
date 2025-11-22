'use client';

import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits, type Address } from 'viem';
import { SUPPORTED_ASSETS } from '../config/assets';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

// Arc Testnet Chain Definition
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    decimals: 18, // Arc Testnet uses 18 decimals for Native USDC
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
} as const;

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http()
});

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface TokenBalanceDropdownProps {
  walletAddress: string;
}

export function TokenBalanceDropdown({ walletAddress }: TokenBalanceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const fetchBalances = async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const newBalances: Record<string, string> = {};
      
      // Fetch Native USDC Balance (Gas Token)
      const nativeBalance = await publicClient.getBalance({ address: walletAddress as Address });
      newBalances['Native USDC'] = formatUnits(nativeBalance, 18);

      // Fetch Token Balances
      await Promise.all(
        Object.entries(SUPPORTED_ASSETS).map(async ([key, asset]) => {
          // Skip if it's the Native USDC entry in assets (since we fetched it via getBalance)
          // But actually, assets.ts has 'Native USDC' as a key now with an address.
          // If that address is the precompile 0x36...00, readContract might work too, but getBalance is safer for "native".
          // Let's fetch all ERC20s defined in assets.ts
          
          try {
             // If the asset is marked as Native USDC in assets.ts, we can skip or double check.
             // But for consistency, let's just read the contract if it has an address.
             // However, 0x36...00 IS the native token precompile, so readContract might fail or behave like native.
             // Let's rely on the keys.
             
            const balance = await publicClient.readContract({
              address: asset.address as Address,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [walletAddress as Address],
            });
            newBalances[key] = formatUnits(balance, asset.decimals);
          } catch (err) {
            console.error(`Failed to fetch balance for ${key}:`, err);
            newBalances[key] = '0';
          }
        })
      );

      setBalances(newBalances);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBalances();
    }
  }, [isOpen, walletAddress]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-700 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
      >
        <span>Balances</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-zinc-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Wallet Assets</span>
              {loading && <span className="text-xs text-indigo-600 animate-pulse">Updating...</span>}
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {/* Native USDC (Gas) */}
              <div className="px-4 py-2.5 hover:bg-zinc-50 flex justify-between items-center border-b border-zinc-50">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-zinc-900">Native USDC</span>
                  <span className="text-xs text-zinc-500">Gas Token</span>
                </div>
                <span className="text-sm font-mono text-zinc-700">
                  {balances['Native USDC'] ? parseFloat(balances['Native USDC']).toFixed(4) : '0.0000'}
                </span>
              </div>

              {/* Supported Assets */}
              {Object.entries(SUPPORTED_ASSETS).map(([key, asset]) => {
                // Avoid duplicating Native USDC if we display it above
                if (key === 'Native USDC') return null; 
                
                return (
                <div key={key} className="px-4 py-2.5 hover:bg-zinc-50 flex justify-between items-center border-t border-zinc-50">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900">{asset.symbol}</span>
                    <span className="text-xs text-zinc-500">{asset.name}</span>
                  </div>
                  <span className="text-sm font-mono text-zinc-700">
                    {balances[key] ? parseFloat(balances[key]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                  </span>
                </div>
              )})}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
