'use server';

import { db } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPaymentRequest(merchantId: string, amount: string, currency: string) {
    await db.paymentRequest.create({
        data: {
            merchantId,
            amount: parseFloat(amount),
            currency: currency,
            status: 'PENDING',
        },
    });

    revalidatePath('/[merchant_id]');
}
