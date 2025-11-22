'use client';

import { useState } from 'react';
import { DepositForm } from '../components/DepositForm';
import { VaultAnalytics } from '../components/VaultAnalytics';
import { MerchantDashboard } from '../components/MerchantDashboard';
import { BridgeWidget } from '../components/BridgeWidget';
import { Header } from '../components/Header';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'vault' | 'merchant' | 'bridge'>('vault');

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-zinc-900 mb-4">Protocol Playground</h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto mb-8">
            Experience the power of Unified Vaults, Treasury Automation, and Cross-Chain Interoperability.
          </p>

          {/* Educational Banner */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl p-8 border border-zinc-200 shadow-sm text-left mb-12">
            <h2 className="text-xl font-bold text-zinc-900 font-display mb-4">Why Unified Vaults?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 text-indigo-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">Fragmented Liquidity</h3>
                <p className="text-sm text-zinc-500">
                  Merchants receive various stablecoins (USDC, USDT, etc.). Managing them individually is inefficient.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 text-emerald-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">Unified Standard</h3>
                <p className="text-sm text-zinc-500">
                  Starc unifies them into a single, robust <b>uToken</b> (e.g., uUSD) backed 1:1 by the basket of assets.
                </p>
              </div>
              <div>
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3 text-purple-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="font-semibold text-zinc-900 mb-1">Capital Efficiency</h3>
                <p className="text-sm text-zinc-500">
                  Use uTokens for payments, lending, or cross-chain transfers without swapping fees.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-12">
          <div className="bg-white p-1 rounded-xl border border-zinc-200 shadow-sm inline-flex">
            <button
              onClick={() => setActiveTab('vault')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vault' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Unified Vault
            </button>
            <button
              onClick={() => setActiveTab('merchant')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'merchant' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Merchant Treasury
            </button>
            <button
              onClick={() => setActiveTab('bridge')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'bridge' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              Bridge (CCTP)
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'vault' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div className="max-w-md mx-auto w-full">
                <DepositForm />
              </div>
              <div className="space-y-8">
                <VaultAnalytics />
                <div className="bg-zinc-900 rounded-2xl p-6 text-white">
                  <h3 className="font-display text-lg font-semibold mb-4">Live Oracle Feeds</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <span className="text-zinc-400">mARS / USD</span>
                      <span className="font-mono text-emerald-400">0.001002</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <span className="text-zinc-400">nARS / USD</span>
                      <span className="font-mono text-emerald-400">0.000998</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-400">wARS / USD</span>
                      <span className="font-mono text-emerald-400">0.001000</span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-zinc-500">
                    Powered by Chainlink Oracles
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'merchant' && (
            <div className="max-w-4xl mx-auto">
              <MerchantDashboard />
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="max-w-4xl mx-auto">
              <BridgeWidget />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
