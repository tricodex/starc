import Image from "next/image";
import Link from "next/link";
import { Card } from "./components/ui/Card";
import { Header } from './components/Header';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-24">
          
          <h1 className="text-5xl sm:text-7xl font-bold text-zinc-900 font-display tracking-tight mb-8 leading-[1.1]">
            The Unified Layer for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-500">Stablecoin Liquidity</span>
          </h1>
          <p className="text-xl text-zinc-500 mb-10 leading-relaxed">
            Aggregate fragmented stablecoins into a single, robust unified token. 
            {/* Powered by Circle and secured by Arc. */}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/demo" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 hover:-translate-y-0.5">
              Launch App
            </Link>
            <Link href="/docs/risk_architecture.md" className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-50 transition-all hover:border-zinc-300">
              Read Architecture
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-24">
          <Link href="/demo" className="group">
            <Card className="h-full hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300 group-hover:-translate-y-1">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 font-display mb-2">Unified Vaults</h3>
              <p className="text-zinc-500">Deposit mARS, nARS, or wARS to mint uARS. One token, deep liquidity, zero fragmentation.</p>
            </Card>
          </Link>

          <Link href="/123/payment" className="group">
            <Card className="h-full hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 group-hover:-translate-y-1">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 font-display mb-2">Merchant Payments</h3>
              <p className="text-zinc-500">Accept payments in any supported asset. Integrated with Circle Programmable Wallets.</p>
            </Card>
          </Link>

          <Link href="/admin" className="group">
            <Card className="h-full hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-900/5 transition-all duration-300 group-hover:-translate-y-1">
              <div className="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-900 font-display mb-2">Risk Management</h3>
              <p className="text-zinc-500">Admin dashboard for monitoring oracle health, pausing contracts, and managing risk parameters.</p>
            </Card>
          </Link>
        </div>

        {/* Trust Section */}
        <div className="border-t border-zinc-200 pt-16 text-center">
          <p className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-8">Secured by Industry Leaders</p>
          <div className="flex items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Placeholders for logos - using text for now to avoid missing images */}
             <span className="text-xl font-bold text-zinc-700">Circle</span>
             <span className="text-xl font-bold text-zinc-700">Chainlink</span>
             <span className="text-xl font-bold text-zinc-700">Arc</span>
             <span className="text-xl font-bold text-zinc-700">OpenZeppelin</span>
          </div>
        </div>
      </main>
    </div>
  );
}
