import { db } from '../../lib/db';
import { PaymentForm } from './PaymentForm';
import { notFound } from 'next/navigation';

export default async function MerchantPaymentPage({ params }: { params: Promise<{ merchant_id: string }> }) {
  const { merchant_id } = await params;

  // Fetch merchant from DB
  // Note: If DB connection fails (e.g. missing env var), this will throw.
  // We are designing for the "Happy Path" where the user provides the credentials.
  let merchant;
  try {
    merchant = await db.merchant.findUnique({
      where: { slug: merchant_id },
    });
  } catch (e) {
    console.error("Database Error:", e);
    // Fallback for demo purposes if DB is not set up yet
    if (merchant_id === 'demo' || merchant_id === 'merchant_id') {
        merchant = {
            id: 'demo-123',
            slug: merchant_id,
            name: 'Demo Merchant',
            walletAddress: '0x1234567890123456789012345678901234567890',
            logoUrl: '/logo.png'
        };
    }
  }

  if (!merchant) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50">
            <div className="text-center">
                <h1 className="text-2xl font-bold text-zinc-900">Merchant Not Found</h1>
                <p className="text-zinc-500">The merchant "{merchant_id}" does not exist in the registry.</p>
            </div>
        </div>
    );
  }

  return <PaymentForm merchant={merchant} />;
}
