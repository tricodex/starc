import Image from "next/image";
import { DepositForm } from '../components/DepositForm';

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Starc Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-xl font-bold text-zinc-900">starc</span>
          </div>
          <button className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors">
            Connect Wallet
          </button>
        </div>
      </header>

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
            {/* Stats Card */}
            <div className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm">
              <h3 className="font-display text-lg font-semibold text-zinc-900 mb-4">Vault Statistics</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Total Value Locked</div>
                  <div className="text-2xl font-bold text-zinc-900">$1,234,567</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">APY</div>
                  <div className="text-2xl font-bold text-emerald-600">4.5%</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">uARS Supply</div>
                  <div className="text-2xl font-bold text-zinc-900">1.2M</div>
                </div>
                <div>
                  <div className="text-sm text-zinc-500 mb-1">Peg Stability</div>
                  <div className="text-2xl font-bold text-indigo-600">1.001</div>
                </div>
              </div>
            </div>

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
