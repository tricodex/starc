import { db } from '@/app/lib/db';
import { PaymentRequestForm } from './PaymentRequestForm';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

export default async function PaymentPage({ 
  params 
}: { 
  params: Promise<{ merchant_id: string; payment_id: string }> 
}) {
  const { merchant_id, payment_id } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const protocol = headersList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'development' ? 'http' : 'https');
  const paymentUrl = `${protocol}://${host}/${merchant_id}/${payment_id}`;

  // Fetch Payment Request & Merchant
  const paymentRequest = await db.paymentRequest.findUnique({
    where: { id: payment_id },
    include: { merchant: true }
  });

  if (!paymentRequest) {
    return notFound();
  }

  // Verify merchant matches
  if (paymentRequest.merchant.slug !== merchant_id) {
    return notFound();
  }

  // Serialize Decimal to string for client component
  const serializedPayment = {
    ...paymentRequest,
    amount: paymentRequest.amount.toString(),
    createdAt: paymentRequest.createdAt.toISOString(),
    updatedAt: paymentRequest.updatedAt.toISOString(),
  };

  return <PaymentRequestForm merchant={paymentRequest.merchant} paymentRequest={serializedPayment} paymentUrl={paymentUrl} />;
}
