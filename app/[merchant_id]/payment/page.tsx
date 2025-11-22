'use client';

import { useState, use } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SUPPORTED_ASSETS } from '../../config/assets';

export default function MerchantPaymentPage({ params }: { params: Promise<{ merchant_id: string }> }) {
  const { merchant_id } = use(params);
  const [amount, setAmount] = useState('50.00');
  const [selectedAsset, setSelectedAsset] = useState<keyof typeof SUPPORTED_ASSETS>('mARS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handlePay = async () => {
    setIsProcessing(true);
    // Simulate payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsProcessing(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-zinc-900 font-display mb-2">Payment Successful!</h2>
          <p className="text-zinc-500 mb-6">
            You paid <span className="font-medium text-zinc-900">{amount} {SUPPORTED_ASSETS[selectedAsset].symbol}</span> to Merchant #{merchant_id}
          </p>
          <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-400 font-mono break-all">
            0x7f9...3a2b
          </div>
          <Button className="w-full mt-6" onClick={() => setIsSuccess(false)}>
            Make Another Payment
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-3">M</div>
          <h1 className="text-xl font-bold text-zinc-900 font-display">Merchant #{merchant_id}</h1>
          <p className="text-sm text-zinc-500">Starc Unified Payment Gateway</p>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 text-center">
            <div className="text-sm text-zinc-500 mb-1">Total Due</div>
            <div className="text-3xl font-bold text-zinc-900">$ {amount}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Pay with</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(SUPPORTED_ASSETS) as Array<keyof typeof SUPPORTED_ASSETS>).map((assetKey) => (
                <button
                  key={assetKey}
                  onClick={() => setSelectedAsset(assetKey)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all border
                    ${selectedAsset === assetKey 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'}
                  `}
                >
                  {SUPPORTED_ASSETS[assetKey].symbol}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-500">Payment Method</span>
              <span className="font-medium text-zinc-900">Unified Vault Transfer</span>
            </div>
            <div className="flex justify-between text-sm mb-4">
              <span className="text-zinc-500">Network Fee</span>
              <span className="font-medium text-emerald-600">Free (Sponsored)</span>
            </div>
          </div>

          <Button 
            className="w-full" 
            size="lg" 
            onClick={handlePay}
            isLoading={isProcessing}
          >
            Pay {amount} {SUPPORTED_ASSETS[selectedAsset].symbol}
          </Button>
        </div>
      </Card>
    </div>
  );
}
