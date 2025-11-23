import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function GET() {
    try {
        const merchant = await db.merchant.findUnique({
            where: { slug: 'demo-merchant' }
        });

        if (!merchant) {
            return NextResponse.json({ requests: [] });
        }

        const requests = await db.paymentRequest.findMany({
            where: {
                merchantId: merchant.id,
                status: 'PENDING'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json({ requests, merchantAddress: merchant.walletAddress });

    } catch (error) {
        console.error('Fetch Requests Error:', error);
        return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }
}
