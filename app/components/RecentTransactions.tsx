'use client';

import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { Card } from './ui/Card';
import { VAULT_ABI } from '../config/abis';
import { SUPPORTED_ASSETS } from '../config/assets';

interface Transaction {
  hash: string;
  sender: string;
  amount: string;
  asset: string;
  type: 'Deposit' | 'Withdraw';
  timestamp: number; // We might not get exact timestamp easily without block fetch, so maybe just block number
  blockNumber: bigint;
}

export function RecentTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const publicClient = usePublicClient();
  const vaultAddress = SUPPORTED_ASSETS['USDC'].vaultAddress as `0x${string}`;

  useEffect(() => {
    const fetchLogs = async () => {
      if (!publicClient) return;

      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock - BigInt(5000); // Look back ~5000 blocks to stay within RPC limits

        // Fetch Deposit Logs
        const logs = await publicClient.getContractEvents({
          address: vaultAddress,
          abi: VAULT_ABI,
          eventName: 'Deposit',
          fromBlock: fromBlock,
          toBlock: 'latest'
        });

        // Process logs
        const formattedLogs = logs.map(log => {
            const args = log.args as any;
            return {
                hash: log.transactionHash,
                sender: args.owner,
                amount: formatUnits(args.assets, 6), // USDC has 6 decimals
                asset: 'USDC',
                type: 'Deposit' as const,
                timestamp: Date.now(), // Placeholder, would need getBlock to be accurate
                blockNumber: log.blockNumber
            };
        });

        // Sort by block number desc
        formattedLogs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

        setTransactions(formattedLogs.slice(0, 5)); // Show top 5
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
    
    // Set up interval to refresh
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [publicClient, vaultAddress]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <Card className="h-full border-zinc-200 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-zinc-900">Recent Transactions</h3>
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-500">Live Feed</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {isLoading ? (
           <div className="space-y-3">
             {[1, 2, 3].map(i => (
               <div key={i} className="h-16 bg-zinc-50 rounded-xl animate-pulse" />
             ))}
           </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            No recent transactions found on-chain.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx.hash} className="flex items-center justify-between p-3 bg-white border border-zinc-100 rounded-xl hover:border-indigo-100 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-zinc-900">Deposit {tx.asset}</div>
                    <div className="text-xs text-zinc-500 font-mono">{formatAddress(tx.sender)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-emerald-600">+{parseFloat(tx.amount).toFixed(2)}</div>
                  <div className="text-[10px] text-zinc-400">Block {tx.blockNumber.toString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
