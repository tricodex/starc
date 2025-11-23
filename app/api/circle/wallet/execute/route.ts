'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';

// This route handles contract execution requests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, contractAddress, callData, userId, amount } = body;

    // basic validation
    if (!walletId || !contractAddress || !callData || !userId) {
      return NextResponse.json({ message: 'Missing required fields: walletId, contractAddress, callData, userId' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken } = await createUserToken(userId);

    // 2. Initiate Contract Execution
    const payload: any = {
        idempotencyKey: uuidv4(),
        userId: userId,
        contractAddress: contractAddress,
        callData: callData,
        walletId: walletId,
        fee: {
          type: "level",
          config: {
            feeLevel: "MEDIUM"
          }
        }
    };

    // If sending native token (payable function), include amount
    if (amount) {
        payload.amount = amount;
    }

    const response = await fetch('https://api.circle.com/v1/w3s/user/transactions/contractExecution', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'X-User-Token': userToken
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Circle Execute API Error:", errorText);
      return NextResponse.json({ message: `Circle Execution Failed: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();

    // 3. Return Challenge ID
    return NextResponse.json({
      challengeId: data.data.challengeId
    }, { status: 200 });

  } catch (error) {
    console.error('Execute API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

