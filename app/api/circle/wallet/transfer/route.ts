'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';

// This route handles transfer requests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, destinationAddress, amount, tokenId, userId } = body;

    // basic validation
    if (!walletId || !destinationAddress || !amount || !tokenId || !userId) {
      return NextResponse.json({ message: 'Missing required fields: walletId, destinationAddress, amount, tokenId, userId' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken } = await createUserToken(userId);

    // 2. Initiate Transfer
    const response = await fetch('https://api.circle.com/v1/w3s/user/transactions/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'X-User-Token': userToken
      },
      body: JSON.stringify({
        idempotencyKey: uuidv4(),
        userId: userId,
        destinationAddress: destinationAddress,
        amounts: [amount],
        tokenId: tokenId,
        walletId: walletId,
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM"
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Circle Transfer API Error:", errorText);
      return NextResponse.json({ message: `Circle Transfer Failed: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    // 3. Return Challenge ID
    return NextResponse.json({
      challengeId: data.data.challengeId
    }, { status: 200 });

  } catch (error) {
    console.error('Transfer API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

