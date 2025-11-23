'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';

// Hardcoded Vault Address for StarcVaultV2 (USDC)
const VAULT_ADDRESS = '0x6b9214D97aebd45D308F3dBdf599042f51B3D846';
const SWEEP_THRESHOLD = 10; // Keep 10 USDC in wallet

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, userId } = body;

    if (!walletId || !userId) {
      return NextResponse.json({ message: 'Missing walletId or userId' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken, encryptionKey } = await createUserToken(userId);

    // 2. Get Wallet Balance to find USDC and amount
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
    
    // Find USDC (either Native or Token)
    const usdcToken = tokens.find((t: any) => t.token.symbol === 'USDC' || t.token.symbol === 'USDC-TESTNET');

    if (!usdcToken) {
        return NextResponse.json({ message: 'No USDC found in wallet' }, { status: 400 });
    }

    const currentBalance = parseFloat(usdcToken.amount);
    const tokenId = usdcToken.token.id;

    // 3. Check Threshold
    if (currentBalance <= SWEEP_THRESHOLD) {
        return NextResponse.json({ 
            message: `Balance (${currentBalance}) is below sweep threshold (${SWEEP_THRESHOLD}). No action needed.`,
            skipped: true 
        }, { status: 200 });
    }

    const sweepAmount = (currentBalance - SWEEP_THRESHOLD).toFixed(2);

    // 4. Initiate Transfer (Sweep)
    const payload = {
        idempotencyKey: uuidv4(),
        userId: userId,
        destinationAddress: VAULT_ADDRESS,
        amounts: [sweepAmount],
        tokenId: tokenId,
        walletId: walletId,
        feeLevel: "MEDIUM"
    };

    console.log(`Sweeping ${sweepAmount} USDC to Vault ${VAULT_ADDRESS}`);

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
        console.error("Circle Sweep Transfer Failed:", errorText);
        throw new Error(`Sweep Failed: ${errorText}`);
    }

    const transferData = await transferRes.json();

    return NextResponse.json({
        challengeId: transferData.data.challengeId,
        userToken,
        encryptionKey,
        sweepAmount,
        message: `Sweeping ${sweepAmount} USDC to Vault`
    });

  } catch (error: any) {
    console.error('Treasury Sweep Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

