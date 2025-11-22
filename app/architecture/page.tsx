'use client';

import { Header } from '../components/Header';
import { Card } from '../components/ui/Card';

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-zinc-900 font-display mb-4">System Architecture</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            A verified overview of the Starc Protocol infrastructure, highlighting the integration between 
            Circle Programmable Wallets and the StarcVaultV2 smart contracts on Arc Testnet.
          </p>
        </div>

        {/* Architecture Diagram */}
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 mb-12 overflow-x-auto">
          <div className="min-w-[1000px] flex flex-col gap-12">
            
            {/* Layer Labels */}
            <div className="grid grid-cols-3 gap-8 text-sm font-bold text-zinc-400 uppercase tracking-wider text-center">
              <div>Client Side</div>
              <div>Server Side / API</div>
              <div>Blockchain (Arc Testnet)</div>
            </div>

            <div className="grid grid-cols-3 gap-8 relative">
              {/* Connection Lines (Absolute) */}
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 -z-10" />
              
              {/* CLIENT SIDE */}
              <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-4 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded">
                    User Browser
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                      <div className="font-bold text-zinc-900 mb-1">Next.js Frontend</div>
                      <div className="text-xs text-zinc-500">React 19, Tailwind 4</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-indigo-100 shadow-sm ring-2 ring-indigo-500/20">
                      <div className="font-bold text-indigo-900 mb-1">Circle W3S SDK</div>
                      <div className="text-xs text-indigo-600 font-mono">@circle-fin/w3s-pw-web-sdk</div>
                      <div className="mt-2 text-[10px] text-zinc-500 border-t border-indigo-50 pt-2">
                        • Handles PIN/Biometrics<br/>
                        • Executes Challenges
                      </div>
                    </div>
                  </div>
                  {/* Arrow to Backend */}
                  <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-indigo-200" />
                  <div className="absolute top-1/2 -right-4 w-2 h-2 border-t-2 border-r-2 border-indigo-200 rotate-45 transform -translate-y-[3px]" />
                </div>
              </div>

              {/* SERVER SIDE */}
              <div className="space-y-6">
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-6 relative">
                  <div className="absolute -top-3 left-4 bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-1 rounded">
                    Next.js API Routes
                  </div>
                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
                      <div className="font-bold text-zinc-900 mb-1">/api/circle/wallet</div>
                      <div className="text-xs text-zinc-500 font-mono">POST /v1/w3s/user/initialize</div>
                      <div className="mt-2 text-[10px] text-zinc-500 border-t border-zinc-100 pt-2">
                        1. Create User Token<br/>
                        2. Generate Challenge ID<br/>
                        3. Return Encryption Key
                      </div>
                    </div>
                  </div>
                  {/* Arrow to Circle API */}
                  <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-zinc-300" />
                  <div className="absolute top-1/2 -right-4 w-2 h-2 border-t-2 border-r-2 border-zinc-300 rotate-45 transform -translate-y-[3px]" />
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 relative mt-8">
                   <div className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                    Circle Infrastructure
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-100 shadow-sm">
                    <div className="font-bold text-blue-900 mb-1">Programmable Wallets API</div>
                    <div className="text-xs text-blue-600">Smart Contract Accounts (SCA)</div>
                  </div>
                   {/* Arrow to Blockchain */}
                  <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-blue-200" />
                  <div className="absolute top-1/2 -right-4 w-2 h-2 border-t-2 border-r-2 border-blue-200 rotate-45 transform -translate-y-[3px]" />
                </div>
              </div>

              {/* BLOCKCHAIN */}
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 relative h-full">
                  <div className="absolute -top-3 left-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">
                    Arc Testnet (5042002)
                  </div>
                  
                  <div className="space-y-6">
                    {/* Circle Wallet */}
                    <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <div className="font-bold text-zinc-900">User Wallet (SCA)</div>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono bg-zinc-50 p-2 rounded">
                        0xeFE5...99d
                      </div>
                    </div>

                    {/* Arrow Down */}
                    <div className="flex justify-center">
                        <div className="h-6 w-0.5 bg-emerald-200" />
                    </div>

                    {/* Starc Vault */}
                    <div className="bg-white p-4 rounded-lg border border-emerald-500 shadow-md ring-4 ring-emerald-500/10">
                      <div className="font-bold text-emerald-900 mb-1">StarcVaultV2.sol</div>
                      <div className="text-xs text-emerald-600 font-mono mb-2">ERC4626 Compliant</div>
                      
                      <div className="space-y-2">
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Single Asset:</strong> Enforces 1:1 backing (No Oracle Risk)
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Fee Mechanism:</strong> Mints fee shares to Treasury/RiskFund
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Security:</strong> Pausable, ReentrancyGuard, AccessControl
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="grid md:grid-cols-2 gap-8">
          <Card title="Circle Programmable Wallets" className="h-full">
            <div className="space-y-4 text-sm text-zinc-600">
              <p>
                The application leverages <strong>Circle's Web3 Services (W3S)</strong> to provide users with non-custodial, programmable wallets.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>SDK Integration:</strong> The <code>@circle-fin/w3s-pw-web-sdk</code> handles sensitive user interactions (PIN entry, challenge execution) directly in the browser, ensuring keys never touch our servers.
                </li>
                <li>
                  <strong>Smart Contract Accounts (SCA):</strong> Wallets are deployed as smart contracts on Arc Testnet, enabling advanced features like gas abstraction and batched transactions.
                </li>
                <li>
                  <strong>Authentication:</strong> We generate ephemeral <code>userToken</code> and <code>encryptionKey</code> via our backend to authenticate SDK sessions securely.
                </li>
              </ul>
            </div>
          </Card>

          <Card title="StarcVaultV2 Architecture" className="h-full">
            <div className="space-y-4 text-sm text-zinc-600">
              <p>
                The core protocol logic resides in <code>StarcVaultV2.sol</code>, a robust implementation of the <strong>ERC4626 Tokenized Vault Standard</strong>.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Single-Asset Design:</strong> Unlike V1, V2 vaults accept only one underlying asset. This eliminates oracle dependency risks and prevents "death spiral" scenarios.
                </li>
                <li>
                  <strong>Share-Based Fees:</strong> Fees are calculated and taken in <em>shares</em>, not assets. This ensures the vault's total assets remain fully invested to generate yield.
                </li>
                <li>
                  <strong>Risk Management:</strong> The contract includes <code>Pausable</code> functionality, allowing a designated <code>RISK_MANAGER_ROLE</code> to freeze deposits and withdrawals in emergencies.
                </li>
              </ul>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
