import { db } from '@/app/lib/db';
import { DashboardClient } from './DashboardClient';
import { notFound } from 'next/navigation';

export default async function MerchantDashboardPage({ 
  params 
}: { 
  params: Promise<{ merchant_id: string }> 
}) {
  const { merchant_id } = await params;

  const merchant = await db.merchant.findUnique({
    where: { slug: merchant_id },
    include: {
      paymentRequests: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!merchant) {
    return notFound();
  }

  // Serialize Decimals
  const serializedRequests = merchant.paymentRequests.map(req => ({
    ...req,
    amount: req.amount.toString(),
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }));

  return <DashboardClient merchant={merchant} paymentRequests={serializedRequests} />;
}
