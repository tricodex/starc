'use client';

import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';
import { SUPPORTED_ASSETS } from '../config/assets';
import { VAULT_ABI } from '../config/abis';

export function VaultAnalytics() {
  // ... existing hooks ...
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
    <Card className="border-zinc-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-zinc-900">Protocol Health</h3>
        <div className="flex gap-2">
             <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-100">
                System Stable
             </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
          <div className="text-xs text-zinc-500 mb-1">Collateralization</div>
          <div className={`text-lg font-bold ${collatRatio >= 100 ? 'text-emerald-600' : 'text-red-600'}`}>
            {collatRatio.toFixed(2)}%
          </div>
        </div>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
          <div className="text-xs text-zinc-500 mb-1">Daily Limit (USDC)</div>
          <div className="text-lg font-bold text-indigo-600">
            {limitUsage.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
          <div className="text-xs text-zinc-500 mb-1">Total Assets</div>
          <div className="text-lg font-bold text-zinc-900">
            ${totalAssetsNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
          <div className="text-xs text-zinc-500 mb-1">Total Supply</div>
          <div className="text-lg font-bold text-zinc-900">
            {totalSupplyNum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>
    </Card>
  );
}
