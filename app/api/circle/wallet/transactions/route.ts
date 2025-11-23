'use server';

import { NextResponse } from 'next/server';
import { CIRCLE_API_KEY } from '@/app/lib/circle';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
    }

    // We need a User Token to fetch user transactions. 
    // Ideally we should use the one we have, but for simplicity we can generate a fresh one 
    // or use the one passed in headers if we forwarded it.
    // However, `createUserToken` is for creating a token.
    // To list transactions, we need to call Circle API.
    // Circle API requires `X-User-Token` for user endpoints.
    
    // Let's check if the request has a user token header, otherwise generate one.
    // Generating a new one is safe as they are valid for 60 mins.
    
    // Re-import createUserToken dynamically or assume it's available
    // We'll use the existing lib function
    const { createUserToken } = await import('@/app/lib/circle');
    
    // IMPORTANT: Do NOT create a NEW token here if possible, as it might invalidate the previous one 
    // or cause session issues if not handled correctly.
    // However, for server-side fetching where we don't have the client's token, we MUST create a new one
    // OR use the one passed from the client if we modify the API to accept it.
    // But listTransactions requires a User Token. 
    // Let's try to use the one from headers if present, otherwise create a new one.
    
    let userToken = request.headers.get('X-User-Token');
    
    if (!userToken) {
        console.log("No User Token in headers, creating a new one for fetching transactions...");
        const result = await createUserToken(userId);
        userToken = result.userToken;
    } else {
        console.log("Using provided User Token from headers for fetching transactions.");
    }

    const response = await fetch(`https://api.circle.com/v1/w3s/transactions?pageSize=10`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'X-User-Token': userToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Circle List Transactions API Error:", errorText);
      return NextResponse.json({ message: `Failed to list transactions: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('List Transactions API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

