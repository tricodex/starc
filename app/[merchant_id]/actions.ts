'use server';

import { db } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPaymentRequest(merchantId: string, amount: string) {
    await db.paymentRequest.create({
        data: {
            merchantId,
            amount: parseFloat(amount),
            status: 'PENDING',
        },
    });

    // Revalidate the merchant dashboard
    // We can't easily get the slug here without passing it, but we can revalidate the path if we knew it.
    // For now, we'll just revalidate the generic path structure or rely on client refresh.
    // Actually, better to pass the slug or just revalidate everything for now.
    revalidatePath('/[merchant_id]');
}
