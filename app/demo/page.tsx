'use client';

import { useState } from 'react';
import { DepositForm } from '../components/DepositForm';
import { VaultAnalytics } from '../components/VaultAnalytics';
import { MerchantDashboard } from '../components/MerchantDashboard';
import { BridgeWidget } from '../components/BridgeWidget';
import { Header } from '../components/Header';
import { Accordion } from '../components/ui/Accordion';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'vault' | 'merchant' | 'bridge'>('vault');

  const SidebarItem = ({ id, label, icon }: { id: typeof activeTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all mb-1 ${
        activeTab === id 
          ? 'bg-zinc-900 text-white shadow-sm' 
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sticky top-24">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-4">Menu</div>
            <nav>
              <SidebarItem 
                id="vault" 
                label="Unified Vault" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                } 
              />
              <SidebarItem 
                id="merchant" 
                label="Merchant Treasury" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                } 
              />
              <SidebarItem 
                id="bridge" 
                label="Bridge (CCTP)" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                } 
              />
            </nav>

            <div className="mt-8 pt-8 border-t border-zinc-100">
              <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-4">Information</div>
              <div className="space-y-2">
                <Accordion title="Why Unified Vaults?">
                  <div className="space-y-3">
                    <div>
                      <div className="font-medium text-zinc-900 mb-1">Fragmented Liquidity</div>
                      <p className="text-xs text-zinc-500">Merchants receive various stablecoins. Managing them individually is inefficient.</p>
                    </div>
                    <div>
                      <div className="font-medium text-zinc-900 mb-1">Unified Standard</div>
                      <p className="text-xs text-zinc-500">Starc unifies them into a single uToken backed 1:1 by the basket.</p>
                    </div>
                  </div>
                </Accordion>
                
                <Accordion title="Live Oracle Feeds">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                      <span className="text-zinc-500">mARS / USD</span>
                      <span className="font-mono text-emerald-600 text-xs">0.001002</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                      <span className="text-zinc-500">nARS / USD</span>
                      <span className="font-mono text-emerald-600 text-xs">0.000998</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">wARS / USD</span>
                      <span className="font-mono text-emerald-600 text-xs">0.001000</span>
                    </div>
                    <div className="mt-2 text-[10px] text-zinc-400 text-right">Powered by Chainlink</div>
                  </div>
                </Accordion>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-zinc-900">
              {activeTab === 'vault' && 'Unified Vault Protocol'}
              {activeTab === 'merchant' && 'Merchant Treasury Dashboard'}
              {activeTab === 'bridge' && 'Cross-Chain Bridge (CCTP)'}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              {activeTab === 'vault' && 'Manage your stablecoin exposure and mint unified uTokens.'}
              {activeTab === 'merchant' && 'Automate your treasury operations and yield generation.'}
              {activeTab === 'bridge' && 'Seamlessly transfer USDC across chains with zero slippage.'}
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'vault' && (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 space-y-6">
                  <VaultAnalytics />
                  {/* Transaction History Placeholder */}
                  <div className="bg-white rounded-xl border border-zinc-200 p-6">
                    <h3 className="font-bold text-zinc-900 mb-4">Recent Transactions</h3>
                    <div className="text-center py-8 text-zinc-400 text-sm bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                      No recent transactions found
                    </div>
                  </div>
                </div>
                <div className="xl:col-span-1">
                  <DepositForm />
                </div>
              </div>
            )}

            {activeTab === 'merchant' && (
              <MerchantDashboard />
            )}

            {activeTab === 'bridge' && (
              <BridgeWidget />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
