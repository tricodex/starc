'use server';

import { db } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

export async function updatePaymentStatus(paymentId: string, txHash: string, status: 'COMPLETED' | 'FAILED' = 'COMPLETED') {
  await db.paymentRequest.update({
    where: { id: paymentId },
    data: { 
      status,
      txHash
    }
  });
  
  revalidatePath(`/${paymentId}`);
}

