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
    const { userToken } = await createUserToken(userId);

    const response = await fetch(`https://api.circle.com/v1/w3s/transactions?userId=${userId}&pageSize=10`, {
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

