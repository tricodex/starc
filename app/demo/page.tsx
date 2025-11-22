'use client';

import { useState, useEffect } from 'react';
import { DepositForm } from '../components/DepositForm';
import { VaultAnalytics } from '../components/VaultAnalytics';
import { MerchantDashboard } from '../components/MerchantDashboard';
import { BridgeWidget } from '../components/BridgeWidget';
import { Header } from '../components/Header';
import { Accordion } from '../components/ui/Accordion';
import { RecentTransactions } from '../components/RecentTransactions';
import { MerchantPayment } from '../components/MerchantPayment';
import { MerchantProfile } from '../components/MerchantProfile'; // Import new component
import { Card } from '../components/ui/Card';
import { useCircleWallet } from '../context/CircleWalletContext';
import { getMerchantByAddress } from '../lib/actions';

import { SendComponent } from '../components/SendComponent';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'payment' | 'vault' | 'merchant' | 'bridge' | 'profile' | 'send'>('payment');
  const { walletId, walletAddress } = useCircleWallet();
  const [merchant, setMerchant] = useState<any>(null);

  // Fetch merchant profile when wallet connects
  useEffect(() => {
    if (walletAddress) {
      getMerchantByAddress(walletAddress).then(data => {
        setMerchant(data);
      });
    }
  }, [walletAddress]);

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

      <div className="flex-1 max-w-[95%] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sticky top-24">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 px-4">Menu</div>
            <nav>
              <SidebarItem 
                id="payment" 
                label="Payments" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                } 
              />
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
              <SidebarItem 
                id="profile" 
                label="Profile" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                } 
              />
              <SidebarItem 
                id="send" 
                label="Send Assets" 
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                } 
              />
            </nav>
            {/* ... existing info ... */}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-zinc-900">
              {activeTab === 'payment' && 'Create Payment'}
              {activeTab === 'vault' && 'Unified Vault Protocol'}
              {activeTab === 'merchant' && 'Merchant Treasury Dashboard'}
              {activeTab === 'bridge' && 'Cross-Chain Bridge (CCTP)'}
              {activeTab === 'profile' && 'Merchant Profile'}
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              {activeTab === 'payment' && 'Generate payment links for your customers.'}
              {activeTab === 'vault' && 'Manage your stablecoin exposure and mint unified uTokens.'}
              {activeTab === 'merchant' && 'Automate your treasury operations and yield generation.'}
              {activeTab === 'bridge' && 'Seamlessly transfer USDC across chains with zero slippage.'}
              {activeTab === 'profile' && 'Manage your merchant account settings.'}
              {activeTab === 'send' && 'Transfer assets to other wallets.'}
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'payment' && (
              <MerchantPayment 
                merchantId={merchant?.id} 
                merchantName={merchant?.name} 
                merchantSlug={merchant?.slug}
              />
            )}

            {activeTab === 'vault' && (
              <div className="space-y-6">
                <VaultAnalytics />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-5">
                    <DepositForm />
                  </div>
                  <div className="lg:col-span-7">
                    <RecentTransactions />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'merchant' && (
              <MerchantDashboard />
            )}

            {activeTab === 'bridge' && (
              <BridgeWidget />
            )}

            {activeTab === 'profile' && (
              <MerchantProfile merchant={merchant} />
            )}

            {activeTab === 'send' && (
              <div className="max-w-xl">
                <SendComponent />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
