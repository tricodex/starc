'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

// Mock Arc Testnet chain
const arcTestnet = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
} as const;

import { injected } from 'wagmi/connectors';

const config = createConfig({
  chains: [arcTestnet],
  connectors: [
    injected(),
  ],
  ssr: true,
  transports: {
    [arcTestnet.id]: http(),
  },
});

import { CircleWalletProvider } from './context/CircleWalletContext';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <CircleWalletProvider>
          {children}
        </CircleWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
