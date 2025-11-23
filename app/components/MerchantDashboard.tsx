'use client';

import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi, erc4626Abi } from 'viem';
import { SUPPORTED_ASSETS } from '../config/assets';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { AiAgent } from './AiAgent';
import { DemoRequests } from './DemoRequests';
import { CircleWallet } from './CircleWallet';
import { useCircleWallet } from '../context/CircleWalletContext';

export function MerchantDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'agent'>('overview');
  const [autoSweep, setAutoSweep] = useState(true);
  const { walletId } = useCircleWallet();
  const { address } = useAccount();

  const usdcConfig = SUPPORTED_ASSETS['Native USDC'] || SUPPORTED_ASSETS['mUSDC'];

  // 1. Read USDC Balance (Operational Float)
  const { data: usdcBalanceData } = useReadContract({
    address: usdcConfig.address as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // 2. Read Vault Shares
  const { data: vaultShares } = useReadContract({
    address: usdcConfig.vaultAddress as `0x${string}`,
    abi: erc4626Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  // 3. Convert Shares to Assets (Vault Savings)
  const { data: vaultAssetsData } = useReadContract({
    address: usdcConfig.vaultAddress as `0x${string}`,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: vaultShares ? [vaultShares] : undefined,
    query: { enabled: !!vaultShares }
  });

  const balance = usdcBalanceData ? parseFloat(formatUnits(usdcBalanceData, usdcConfig.decimals)) : 0;
  const vaultBalance = vaultAssetsData ? parseFloat(formatUnits(vaultAssetsData, usdcConfig.decimals)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 font-display">Merchant Dashboard</h2>
          <p className="text-zinc-500">Manage your treasury and automate flows</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Report
          </Button>
          <Button>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            New Invoice
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-zinc-200 pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'overview' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'agent' 
              ? 'border-indigo-600 text-indigo-600' 
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Starc Agent
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-white border-zinc-200">
                <div className="text-sm text-zinc-500 mb-1">Operational Float</div>
                <div className="text-2xl font-bold text-zinc-900">${balance.toLocaleString()}</div>
                <div className="text-xs text-emerald-600 mt-1">Ready for payouts</div>
              </Card>
              <Card className="bg-indigo-50 border-indigo-100">
                <div className="text-sm text-indigo-600 mb-1">Vault Savings</div>
                <div className="text-2xl font-bold text-indigo-900">${vaultBalance.toLocaleString()}</div>
                <div className="text-xs text-indigo-700 mt-1">Query from ERC4626 vault</div>
              </Card>
              <Card className="bg-zinc-900 text-white border-zinc-800">
                <div className="text-sm text-zinc-400 mb-1">Net Treasury</div>
                <div className="text-2xl font-bold">${(balance + vaultBalance).toLocaleString()}</div>
                <div className="text-xs text-zinc-500 mt-1">Updated just now</div>
              </Card>
            </div>

            <Card className="border-zinc-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 font-display">Treasury Automation</h3>
                  <p className="text-sm text-zinc-500">Powered by Circle Gateway & Smart Contracts</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${autoSweep ? 'text-emerald-600' : 'text-zinc-500'}`}>
                    {autoSweep ? 'Active' : 'Paused'}
                  </span>
                  <button 
                    onClick={() => setAutoSweep(!autoSweep)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${autoSweep ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${autoSweep ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900">Auto-Sweep to Vault</div>
                      <div className="text-xs text-zinc-500">Move excess float &gt; $10k to Starc Vault</div>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900">Payroll Distribution</div>
                      <div className="text-xs text-zinc-500">Auto-disburse USDC on 1st/15th</div>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">View Schedule</Button>
                </div>
              </div>
            </Card>

            <DemoRequests />
          </div>

          <div className="lg:col-span-1">
             <CircleWallet />
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto">
          <AiAgent balance={balance} vaultBalance={vaultBalance} walletId={walletId || address} />
        </div>
      )}
    </div>
  );
}
