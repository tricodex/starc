'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';

// Simulated CCTP Burn Address (Dead Address)
const CCTP_BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, userId, amount } = body;

    if (!walletId || !userId || !amount) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken, encryptionKey } = await createUserToken(userId);

    // 2. Get Wallet Balance to find USDC Token ID
    const balanceRes = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}/balances`, {
        headers: {
            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!balanceRes.ok) {
        throw new Error("Failed to fetch wallet balance");
    }

    const balanceData = await balanceRes.json();
    const tokens = balanceData.data?.tokenBalances || [];
    const usdcToken = tokens.find((t: any) => t.token.symbol === 'USDC' || t.token.symbol === 'USDC-TESTNET');

    if (!usdcToken) {
        return NextResponse.json({ message: 'No USDC found in wallet' }, { status: 400 });
    }

    const tokenId = usdcToken.token.id;

    // 3. Initiate Transfer (Simulated Bridge Burn)
    const payload = {
        idempotencyKey: uuidv4(),
        userId: userId,
        destinationAddress: CCTP_BURN_ADDRESS,
        amounts: [amount],
        tokenId: tokenId,
        walletId: walletId,
        feeLevel: "MEDIUM"
    };

    console.log(`Bridging (Burning) ${amount} USDC via ${CCTP_BURN_ADDRESS}`);

    const transferRes = await fetch('https://api.circle.com/v1/w3s/user/transactions/transfer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
            'X-User-Token': userToken
        },
        body: JSON.stringify(payload)
    });

    if (!transferRes.ok) {
        const errorText = await transferRes.text();
        console.error("Circle Bridge Transfer Failed:", errorText);
        throw new Error(`Bridge Failed: ${errorText}`);
    }

    const transferData = await transferRes.json();

    return NextResponse.json({
        challengeId: transferData.data.challengeId,
        userToken,
        encryptionKey,
        message: `Bridging ${amount} USDC to Ethereum`
    });

  } catch (error: any) {
    console.error('Treasury Bridge Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

