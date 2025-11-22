import { db } from '../../lib/db';
import { PaymentForm } from './PaymentForm';
import { notFound } from 'next/navigation';

export default async function MerchantPaymentPage({ params }: { params: Promise<{ merchant_id: string }> }) {
  const { merchant_id } = await params;

  // Fetch merchant from DB
  const merchant = await db.merchant.findUnique({
    where: { slug: merchant_id },
  });

  if (!merchant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Merchant Not Found</h1>
          <p className="text-zinc-500 mb-4">
            The merchant "{merchant_id}" does not exist in the registry.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <PaymentForm merchant={merchant} />;
}
