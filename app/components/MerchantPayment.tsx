'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { createPaymentRequest } from '../[merchant_id]/actions';
import Link from 'next/link';
import { useCircleWallet } from '../context/CircleWalletContext';
import { SUPPORTED_ASSETS } from '../config/assets';

import { getMerchantPayments } from '../lib/actions';

interface MerchantPaymentProps {
  merchantId?: string;
  merchantName?: string;
  merchantSlug?: string;
}

export function MerchantPayment({ merchantId, merchantName, merchantSlug }: MerchantPaymentProps) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USDC');
  const [isCreating, setIsCreating] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const { walletAddress } = useCircleWallet();

  // Load transactions
  useEffect(() => {
    if (walletAddress) {
      getMerchantPayments(walletAddress).then(setTransactions);
    }
  }, [walletAddress]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantId) {
        alert("Please create a merchant profile first.");
        return;
    }
    setIsCreating(true);
    try {
      await createPaymentRequest(merchantId, amount, currency); // This creates the DB record
      
      // Simulate finding the ID (in real app, createPaymentRequest should return the ID)
      // We'll just re-fetch transactions to show pending
      const updated = await getMerchantPayments(walletAddress!);
      setTransactions(updated);
      
      const latest = updated[0]; // Assuming sort by desc
      
      setPaymentLink(`${window.location.origin}/${merchantSlug}/${latest.id}`);
      setAmount('');
      
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Create Link */}
      <div className="lg:col-span-1 space-y-6">
        <Card title="Create Payment Link">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-4 pr-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Currency</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  {Object.keys(SUPPORTED_ASSETS).filter(key => key !== 'USDC').map((assetKey) => (
                    <option key={assetKey} value={assetKey}>
                       {SUPPORTED_ASSETS[assetKey as keyof typeof SUPPORTED_ASSETS].name} ({SUPPORTED_ASSETS[assetKey as keyof typeof SUPPORTED_ASSETS].symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" className="w-full" isLoading={isCreating} disabled={!merchantId}>
              {merchantId ? 'Generate Link' : 'Create Profile First'}
            </Button>
          </form>

          {paymentLink && (
            <div className="mt-6 pt-6 border-t border-zinc-100 animate-in fade-in">
              <div className="flex flex-col items-center text-center">
                <div className="bg-white p-2 rounded-lg border border-zinc-200 mb-4 shadow-sm">
                  <QRCodeSVG value={paymentLink} size={140} />
                </div>
                <p className="text-sm text-zinc-500 mb-2">Scan to Pay</p>
                <code className="text-[10px] bg-zinc-100 px-2 py-1 rounded text-zinc-600 break-all w-full">
                  {paymentLink}
                </code>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Right Column: Transactions & Pending */}
      <div className="lg:col-span-2 space-y-6">
        {/* Pending Overview */}
        <div className="grid grid-cols-2 gap-4">
            <Card className="bg-amber-50 border-amber-100">
                <div className="text-sm text-amber-800 mb-1">Pending Payments</div>
                <div className="text-2xl font-bold text-amber-900">
                    {transactions.filter(t => t.status === 'PENDING').length}
                </div>
            </Card>
            <Card className="bg-emerald-50 border-emerald-100">
                <div className="text-sm text-emerald-800 mb-1">Completed Today</div>
                <div className="text-2xl font-bold text-emerald-900">
                    {transactions.filter(t => t.status === 'COMPLETED').length}
                </div>
            </Card>
        </div>

        {/* Transaction List */}
        <Card title="Transaction Overview">
            <div className="overflow-hidden">
                {transactions.length === 0 ? (
                    <p className="text-zinc-500 text-sm py-4 text-center">No transactions yet.</p>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-100">
                            <tr>
                                <th className="px-4 py-3">ID</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Date</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {transactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-zinc-50/50">
                                    <td className="px-4 py-3 font-mono text-xs">{tx.id.slice(0, 8)}...</td>
                                    <td className="px-4 py-3 font-medium">${tx.amount} {tx.currency}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tx.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                            tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-zinc-500">
                                        {new Date(tx.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link 
                                            href={`/${merchantSlug}/${tx.id}`}
                                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
}
