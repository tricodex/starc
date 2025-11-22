'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Header } from '../components/Header';
import { createPaymentRequest } from './actions';
import Link from 'next/link';

import { SUPPORTED_ASSETS } from '../config/assets';

interface DashboardClientProps {
  merchant: {
    id: string;
    slug: string;
    name: string;
  };
  paymentRequests: any[];
}

export function DashboardClient({ merchant, paymentRequests }: DashboardClientProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<string>('mUSDC');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await createPaymentRequest(merchant.id, amount, currency);
      setAmount('');
      // Refresh handled by server action revalidate
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900 font-display">Merchant Dashboard</h1>
          <p className="text-zinc-500">Manage payment links and view history for {merchant.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Link Section */}
          <div className="lg:col-span-1">
            <Card title="Create Payment Link" className="sticky top-24">
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Asset</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    {Object.keys(SUPPORTED_ASSETS).map((key) => (
                      <option key={key} value={key}>
                        {SUPPORTED_ASSETS[key as keyof typeof SUPPORTED_ASSETS].name} ({SUPPORTED_ASSETS[key as keyof typeof SUPPORTED_ASSETS].symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" isLoading={isCreating}>
                  Generate Link
                </Button>
              </form>
            </Card>
          </div>

          {/* History Section */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-zinc-900">Recent Payment Links</h2>
            {paymentRequests.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-zinc-200 border-dashed">
                <p className="text-zinc-400">No payment links created yet.</p>
              </div>
            ) : (
              paymentRequests.map((req) => (
                <Card key={req.id} className="hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-bold text-zinc-900">${req.amount}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">
                        ID: {req.id}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Created: {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Link 
                        href={`/${merchant.slug}/${req.id}`}
                        className="flex-1 sm:flex-none px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors text-center"
                      >
                        View Page
                      </Link>
                      <div className="hidden sm:block p-1 bg-white border border-zinc-100 rounded">
                         <QRCodeSVG value={`${typeof window !== 'undefined' ? window.location.origin : ''}/${merchant.slug}/${req.id}`} size={40} />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
