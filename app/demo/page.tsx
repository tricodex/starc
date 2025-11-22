import Image from "next/image";
import { DepositForm } from '../components/DepositForm';
import { VaultAnalytics } from '../components/VaultAnalytics';
import { Header } from '../components/Header';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-zinc-900 mb-4">Protocol Playground</h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Experience the power of Unified Vaults. Deposit fragmented stablecoins and receive a single, robust uToken.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Deposit Form */}
          <div className="max-w-md mx-auto w-full">
            <DepositForm />
          </div>

          {/* Right Column: Analytics / Info */}
          <div className="space-y-8">
            {/* Analytics Component */}
            <VaultAnalytics />

            {/* Oracle Info */}
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
      </main>
    </div>
  );
}
