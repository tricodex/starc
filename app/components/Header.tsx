'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/Button';
import { useState, useEffect } from 'react';
import { useCircleWallet } from '../context/CircleWalletContext';
import { TokenBalanceDropdown } from './TokenBalanceDropdown';

export function Header() {
  const { isConnected, walletId, walletAddress, createWallet, disconnect, isLoading } = useCircleWallet();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const copyToClipboard = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="bg-white border-b border-zinc-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Starc Logo" width={32} height={32} className="rounded-lg" />
            <span className="text-xl font-bold text-zinc-900 font-display tracking-tight">starc</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600">
            <Link href="/demo" className="hover:text-indigo-600 transition-colors">Vaults</Link>
            <Link href="/merchant_id/payment" className="hover:text-indigo-600 transition-colors">Merchant</Link>
            <Link href="/admin" className="hover:text-indigo-600 transition-colors">Governance</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {mounted && isConnected && walletId ? (
            <div className="flex items-center gap-3">
              <TokenBalanceDropdown walletAddress={walletAddress || walletId || ''} />
              <div 
                className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 cursor-pointer hover:bg-indigo-100 transition-colors relative group"
                onClick={copyToClipboard}
                title="Click to copy address"
              >
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-indigo-700 font-mono">
                  {walletAddress ? formatAddress(walletAddress) : formatAddress(walletId)}
                </span>
                
                {/* Tooltip */}
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {copied ? 'Copied!' : 'Copy Address'}
                </div>
              </div>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={disconnect}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={createWallet}
              isLoading={isLoading}
            >
              {isLoading ? 'Initializing...' : 'Connect Circle Wallet'}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
