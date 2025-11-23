import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function POST() {
    try {
        // 1. Find or Create Demo Merchant
        let merchant = await db.merchant.findUnique({
            where: { slug: 'demo-merchant' }
        });

        if (!merchant) {
            merchant = await db.merchant.create({
                data: {
                    slug: 'demo-merchant',
                    name: 'Starc Demo Merchant',
                    description: 'A merchant for testing AI payments',
                    walletAddress: '0x712e31E91166d6a7926cf2740f99Cba38954F838', // Use a real testnet address or one controlled by us
                }
            });
        }

        // 2. Clear existing pending requests for this merchant (optional, to keep it clean)
        await db.paymentRequest.deleteMany({
            where: {
                merchantId: merchant.id,
                status: 'PENDING'
            }
        });

        // 3. Create 5 new requests
        const requests = [];
        for (let i = 0; i < 5; i++) {
            const req = await db.paymentRequest.create({
                data: {
                    merchantId: merchant.id,
                    amount: 0.01,
                    currency: 'USDC',
                    status: 'PENDING'
                }
            });
            requests.push(req);
        }

        return NextResponse.json({
            message: 'Demo data seeded successfully',
            merchant,
            requests
        });

    } catch (error) {
        console.error('Seed Error:', error);
        return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
    }
}
