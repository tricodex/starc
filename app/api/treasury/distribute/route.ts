'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';

// Hardcoded Employee Address
const PAYROLL_ADDRESS = '0x712e31E91166d6a7926cf2740f99Cba38954F838';
const PAYROLL_AMOUNT = '5.00';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, userId } = body;

    if (!walletId || !userId) {
      return NextResponse.json({ message: 'Missing walletId or userId' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken, encryptionKey } = await createUserToken(userId);

    // 2. Get Wallet Balance to find USDC
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

    if (parseFloat(usdcToken.amount) < parseFloat(PAYROLL_AMOUNT)) {
        return NextResponse.json({ message: 'Insufficient funds for payroll' }, { status: 400 });
    }

    const tokenId = usdcToken.token.id;

    // 3. Initiate Transfer (Payroll)
    const payload = {
        idempotencyKey: uuidv4(),
        userId: userId,
        destinationAddress: PAYROLL_ADDRESS,
        amounts: [PAYROLL_AMOUNT],
        tokenId: tokenId,
        walletId: walletId,
        feeLevel: "MEDIUM"
    };

    console.log(`Distributing ${PAYROLL_AMOUNT} USDC Payroll to ${PAYROLL_ADDRESS}`);

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
        console.error("Circle Payroll Transfer Failed:", errorText);
        throw new Error(`Payroll Failed: ${errorText}`);
    }

    const transferData = await transferRes.json();

    return NextResponse.json({
        challengeId: transferData.data.challengeId,
        userToken,
        encryptionKey,
        amount: PAYROLL_AMOUNT,
        message: `Distributing ${PAYROLL_AMOUNT} USDC Payroll`
    });

  } catch (error: any) {
    console.error('Treasury Payroll Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

