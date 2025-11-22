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
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Experience the power of Unified Vaults, Treasury Automation, and Cross-Chain Interoperability.
          </p>
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
