'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Button } from './ui/Button';
import { useState, useEffect } from 'react';

export function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = () => {
    const connector = connectors.find(c => c.id === 'injected') || connectors[0];
    if (connector) {
      connect({ connector });
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
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
          {mounted && isConnected && address ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-zinc-600 font-mono bg-zinc-100 px-3 py-1 rounded-full">
                {formatAddress(address)}
              </span>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => disconnect()}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <Button 
              size="sm" 
              className="bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={handleConnect}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
