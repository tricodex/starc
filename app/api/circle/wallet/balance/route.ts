import { NextResponse } from "next/server";
import { z } from "zod";

const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const walletId = searchParams.get('id');

    if (!walletId) {
        return NextResponse.json({ error: "Wallet ID is required" }, { status: 400 });
    }

    if (!CIRCLE_API_KEY) {
        return NextResponse.json({ error: "Circle API key not configured" }, { status: 503 });
    }

    try {
        const response = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}/balances`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CIRCLE_API_KEY}`
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Unknown error' }));
            console.error("Circle API Error:", error);
            return NextResponse.json({ error: "Failed to fetch balance" }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Balance Fetch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
