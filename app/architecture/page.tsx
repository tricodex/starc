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
            <div className="grid grid-cols-4 gap-8 text-sm font-bold text-zinc-400 uppercase tracking-wider text-center">
              <div>Client Side</div>
              <div>Server Side / API</div>
              <div>Unification Layer</div>
              <div>Settlement Layer</div>
            </div>

            <div className="grid grid-cols-4 gap-8 relative">
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
                      <div className="text-xs text-zinc-500 font-mono">POST /execute</div>
                      <div className="mt-2 text-[10px] text-zinc-500 border-t border-zinc-100 pt-2">
                        1. Construct Tx Payload<br/>
                        2. Call W3S Execution<br/>
                        3. Return Challenge
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

              {/* UNIFICATION LAYER (ROUTER) */}
              <div className="space-y-6">
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-6 relative h-full flex items-center">
                  <div className="absolute -top-3 left-4 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">
                    Starc Router
                  </div>
                  
                  <div className="space-y-6 w-full">
                    <div className="bg-white p-4 rounded-lg border border-purple-500 shadow-md ring-4 ring-purple-500/10">
                      <div className="font-bold text-purple-900 mb-1">StarcRouter.sol</div>
                      <div className="text-xs text-purple-600 font-mono mb-2">Aggregation Logic</div>
                      
                      <div className="space-y-2">
                        <div className="bg-purple-50 p-2 rounded text-[10px] text-purple-800">
                          <strong>1. Receive:</strong> Any Asset (mARS, nARS)
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-[10px] text-purple-800">
                          <strong>2. Swap:</strong> Convert to Base Asset
                        </div>
                        <div className="bg-purple-50 p-2 rounded text-[10px] text-purple-800">
                          <strong>3. Deposit:</strong> Call Vault.deposit()
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Arrow to Settlement */}
                  <div className="absolute top-1/2 -right-4 w-8 h-0.5 bg-purple-200" />
                  <div className="absolute top-1/2 -right-4 w-2 h-2 border-t-2 border-r-2 border-purple-200 rotate-45 transform -translate-y-[3px]" />
                </div>
              </div>

              {/* SETTLEMENT LAYER (VAULT) */}
              <div className="space-y-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 relative h-full">
                  <div className="absolute -top-3 left-4 bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded">
                    Arc Testnet (5042002)
                  </div>
                  
                  <div className="space-y-6">
                    {/* Starc Vault */}
                    <div className="bg-white p-4 rounded-lg border border-emerald-500 shadow-md ring-4 ring-emerald-500/10">
                      <div className="font-bold text-emerald-900 mb-1">StarcVaultV2.sol</div>
                      <div className="text-xs text-emerald-600 font-mono mb-2">ERC4626 Compliant</div>
                      
                      <div className="space-y-2">
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Single Asset:</strong> 1:1 Backing
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Fee Mechanism:</strong> Mint-on-Top
                        </div>
                        <div className="bg-emerald-50 p-2 rounded text-[10px] text-emerald-800">
                          <strong>Security:</strong> Pausable, AccessControl
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
        <div className="grid md:grid-cols-3 gap-8">
          <Card title="Circle Programmable Wallets" className="h-full">
            <div className="space-y-4 text-sm text-zinc-600">
              <p>
                The application leverages <strong>Circle's Web3 Services (W3S)</strong> to provide users with non-custodial, programmable wallets.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>SDK Integration:</strong> The <code>@circle-fin/w3s-pw-web-sdk</code> handles sensitive user interactions (PIN entry, challenge execution) directly in the browser.
                </li>
                <li>
                  <strong>Contract Execution:</strong> The new <code>/execute</code> endpoint facilitates interaction with the StarcRouter by encoding function calls and relaying them to Circle's SCA infrastructure.
                </li>
              </ul>
            </div>
          </Card>

          <Card title="Starc Router (Unification)" className="h-full border-purple-200 bg-purple-50/30">
            <div className="space-y-4 text-sm text-zinc-600">
              <p>
                The <strong>Unification Layer</strong> ensuring all roads lead to the Unified Vault.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Asset Swapping:</strong> Accepts non-native assets (e.g., nARS) and atomically swaps them to the Vault's base asset (USDC/mARS).
                </li>
                <li>
                  <strong>Atomic Deposit:</strong> Performs swap and deposit in a single transaction, minting shares directly to the merchant.
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
                  <strong>Single-Asset Design:</strong> Eliminates oracle dependency risks and prevents "death spiral" scenarios.
                </li>
                <li>
                  <strong>Share-Based Fees:</strong> Fees are calculated and taken in <em>shares</em>, ensuring capital efficiency.
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* Vault Logic Diagram */}
        <div className="mt-12">
            <h2 className="text-2xl font-bold text-zinc-900 font-display mb-6">Vault Mechanics & Economics</h2>
            <div className="grid lg:grid-cols-2 gap-8">
                <Card title="Deposit & Fee Logic">
                    <div className="bg-zinc-900 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs text-emerald-400 font-mono">
{`graph TD
    User[User] -->|Deposit 100 USDC| Vault[StarcVaultV2]
    Vault -->|Mint 100 Shares| User
    Vault -->|Mint 0.1 Share (Fee)| Treasury[Treasury/RiskFund]
    
    subgraph "Dilution Effect"
    Assets[Total Assets: 100 USDC]
    Shares[Total Shares: 100.1]
    Price[Share Price: ~0.999 USDC]
    end`}
                        </pre>
                    </div>
                    <p className="mt-4 text-sm text-zinc-600">
                        <strong>Fee Mechanism:</strong> The vault mints fee shares <em>on top</em> of user shares. This immediately dilutes the share price for all holders (including the depositor). 
                        While this avoids withdrawing assets for fees (keeping capital efficient), it creates an immediate "paper loss" for depositors.
                    </p>
                </Card>

                <Card title="Unified Payment Flow">
                    <div className="space-y-4 text-sm text-zinc-600">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                            <h4 className="font-bold text-emerald-800 mb-1">✅ Solution: The Starc Router</h4>
                            <p>
                                The Starc Router bridges the gap between diverse payment tokens and the unified treasury.
                                <br/><br/>
                                <strong>The Flow:</strong>
                            </p>
                            <ul className="list-decimal pl-5 mt-2 space-y-1">
                                <li>Merchant Requests Payment (e.g., $50).</li>
                                <li>User pays with <strong>Any Asset</strong> (e.g., nARS).</li>
                                <li>Router <strong>Swaps</strong> nARS {'->'} Base Asset (USDC).</li>
                                <li>Router <strong>Deposits</strong> Base Asset to Vault.</li>
                                <li>Vault Mints <strong>StarcShares</strong> to Merchant.</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Router Diagram */}
            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-zinc-200 p-8">
                <h3 className="text-lg font-bold text-zinc-900 mb-4">Target Architecture: The Unifying Router</h3>
                <div className="bg-zinc-900 p-4 rounded-lg overflow-x-auto">
                    <pre className="text-xs text-indigo-400 font-mono">
{`graph LR
    User[User] -->|Pays ARS/EURC| Router[Starc Router]
    
    subgraph "Aggregation Layer"
    Router -->|Swap ARS->USDC| AMM[DEX / Curve]
    AMM -->|USDC| Router
    end
    
    Router -->|Deposit USDC| Vault[StarcVaultV2]
    Vault -->|Mint Shares| Merchant[Merchant Treasury]
    
    style Router fill:#4f46e5,stroke:#312e81,color:#fff
    style AMM fill:#db2777,stroke:#831843,color:#fff`}
                    </pre>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}

