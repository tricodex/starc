'use client';

import Image from "next/image";
import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SUPPORTED_ASSETS } from '../config/assets';

export default function AdminPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'risk' | 'assets'>('risk');

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Starc Logo" width={32} height={32} className="rounded-lg" />
            <span className="font-display text-xl font-bold text-zinc-900">starc admin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-500">Logged in as Risk Manager</span>
            <div className="w-8 h-8 bg-zinc-200 rounded-full"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('risk')}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'risk' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Risk Controls
              </button>
              <button
                onClick={() => setActiveTab('assets')}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'assets' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                Asset Management
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6">
            {activeTab === 'risk' && (
              <>
                <Card title="Emergency Controls" description="Critical actions for protocol safety.">
                  <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                    <div>
                      <h4 className="font-medium text-red-900">Protocol Status</h4>
                      <p className="text-sm text-red-700">
                        {isPaused ? 'Protocol is PAUSED. No deposits allowed.' : 'Protocol is ACTIVE. All systems normal.'}
                      </p>
                    </div>
                    <Button 
                      variant={isPaused ? 'primary' : 'secondary'}
                      className={isPaused ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700 text-white'}
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? 'Resume Protocol' : 'Emergency Pause'}
                    </Button>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                  <Card title="Risk Parameters">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Max Oracle Staleness</span>
                        <span className="font-mono text-sm">24 hours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Deposit Fee</span>
                        <span className="font-mono text-sm">0.10%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Withdraw Fee</span>
                        <span className="font-mono text-sm">0.10%</span>
                      </div>
                    </div>
                  </Card>
                  <Card title="Treasury">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Risk Fund Balance</span>
                        <span className="font-mono text-sm">$54,321.00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-zinc-500">Treasury Balance</span>
                        <span className="font-mono text-sm">$12,345.00</span>
                      </div>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'assets' && (
              <Card title="Supported Assets" description="Manage asset configurations and limits.">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                      <tr>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">Symbol</th>
                        <th className="px-4 py-3">Daily Limit</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(SUPPORTED_ASSETS) as Array<keyof typeof SUPPORTED_ASSETS>).map((key) => (
                        <tr key={key} className="border-b border-zinc-50 last:border-0">
                          <td className="px-4 py-3 font-medium text-zinc-900">{SUPPORTED_ASSETS[key].name}</td>
                          <td className="px-4 py-3 text-zinc-500">{SUPPORTED_ASSETS[key].symbol}</td>
                          <td className="px-4 py-3 font-mono">$1,000,000</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button className="text-indigo-600 hover:text-indigo-900 font-medium">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
