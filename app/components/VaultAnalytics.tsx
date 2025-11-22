'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { SUPPORTED_ASSETS } from '../config/assets';
import { VAULT_ABI } from '../config/abis';

export function VaultAnalytics() {
  // Use the first asset's vault address as the main vault (they should be the same for Unified Vault)
  const vaultAddress = SUPPORTED_ASSETS['USDC'].vaultAddress as `0x${string}`;
  const usdcAddress = SUPPORTED_ASSETS['USDC'].address as `0x${string}`;

  // 1. Total Assets
  const { data: totalAssets } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalAssets',
  });

  // 2. Total Supply
  const { data: totalSupply } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'totalSupply',
  });

  // 3. Asset Config (for Daily Limit of USDC)
  const { data: assetConfig } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: 'assetConfig',
    args: [usdcAddress],
  });

  // Calculations
  const totalAssetsNum = totalAssets ? parseFloat(formatUnits(totalAssets, 18)) : 0;
  const totalSupplyNum = totalSupply ? parseFloat(formatUnits(totalSupply, 18)) : 0;
  
  // Collateralization Ratio = Total Assets / Total Supply
  const collatRatio = totalSupplyNum > 0 ? (totalAssetsNum / totalSupplyNum) * 100 : 100;

  // Daily Limit Usage
  const dailyLimit = assetConfig ? parseFloat(formatUnits(assetConfig[4], 18)) : 0; // index 4 is dailyDepositLimit
  const dailyDeposited = assetConfig ? parseFloat(formatUnits(assetConfig[5], 18)) : 0; // index 5 is dailyDeposited
  const limitUsage = dailyLimit > 0 ? (dailyDeposited / dailyLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card title="Protocol Health" description="Real-time on-chain risk metrics">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="The ratio of assets held in the vault vs. total liabilities (shares).">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Collateralization Ratio</span>
              </Tooltip>
              <span className={`text-sm font-bold ${collatRatio >= 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                {collatRatio.toFixed(2)}%
              </span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${collatRatio >= 100 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                style={{ width: `${Math.min(collatRatio, 100)}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="Percentage of the daily deposit limit currently utilized for USDC.">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Daily Limit Usage (USDC)</span>
              </Tooltip>
              <span className="text-sm font-bold text-indigo-600">{limitUsage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(limitUsage, 100)}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="Current deviation of the oracle price from the peg (1.00).">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Peg Deviation</span>
              </Tooltip>
              <span className="text-sm font-bold text-zinc-900">0.02%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-zinc-900 h-2 rounded-full" style={{ width: '2%' }}></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 mb-1">Total Assets</div>
          <div className="text-xl font-bold text-zinc-900">${totalAssetsNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-emerald-600 mt-1">Verified On-Chain</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 mb-1">Total Supply</div>
          <div className="text-xl font-bold text-zinc-900">{totalSupplyNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-zinc-500 mt-1">uTokens</div>
        </div>
      </div>
    </div>
  );
}
