import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;

if (!CIRCLE_API_KEY) {
    console.warn("Missing CIRCLE_API_KEY in environment variables");
}

async function createWallet(userId: string) {
    const response = await fetch('https://api.circle.com/v1/w3s/user/wallets', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CIRCLE_API_KEY}`
        },
        body: JSON.stringify({
            idempotencyKey: uuidv4(),
            userId: userId,
            blockchains: ['ARC-TESTNET'], // Arc Testnet Identifier
            description: 'Starc Merchant Wallet',
            walletSetId: process.env.CIRCLE_WALLET_SET_ID // Optional, or generate new
        })
    });
    return response.json();
}

async function createUser(userId: string) {
    const response = await fetch('https://api.circle.com/v1/w3s/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CIRCLE_API_KEY}`
        },
        body: JSON.stringify({
            userId: userId
        })
    });
    return response.json();
}

async function createChallenge(userId: string) {
    // This is a simplified example. In reality, you'd request a specific action (like creating a wallet or transfer)
    // which returns a challengeId.
    // For this demo, we'll assume we are initializing a wallet which requires a challenge.

    // 1. Create User (idempotent)
    await createUser(userId);

    // 2. Initialize Wallet (returns challenge)
    const walletRes = await createWallet(userId);

    return walletRes;
}

export async function POST(req: Request) {
    try {
        const { action, userId } = await req.json();

        if (action === 'create_challenge') {
            const result = await createChallenge(userId);
            return NextResponse.json(result);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Circle API Error:", error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
