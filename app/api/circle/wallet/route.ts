import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { circleRateLimiter, checkRateLimit, getClientIdentifier } from "@/app/lib/ratelimit";

// Validation schemas
const CreateChallengeRequestSchema = z.object({
  action: z.literal('create_challenge'),
  userId: z.string().min(1, "User ID is required").max(100),
});

// Environment variables with validation
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;
const WALLET_SET_ID = process.env.CIRCLE_WALLET_SET_ID;

// Check critical environment variables at module load
if (!CIRCLE_API_KEY) {
  console.error("CRITICAL: CIRCLE_API_KEY is not set in environment variables");
}
if (!APP_ID) {
  console.error("CRITICAL: NEXT_PUBLIC_CIRCLE_APP_ID is not set in environment variables");
}

interface CircleAPIError {
  code?: number;
  message?: string;
}

interface CircleUser {
  id: string;
  status: string;
  createDate: string;
  updateDate: string;
}

interface CircleWallet {
  id: string;
  state: string;
  walletSetId: string;
  custodyType: string;
  userId: string;
  address?: string;
  blockchain: string;
  accountType: string;
  updateDate: string;
  createDate: string;
}

interface CircleWalletResponse {
  data?: {
    challengeId?: string;
    wallets?: CircleWallet[];
  };
}

async function createUser(userId: string): Promise<CircleUser> {
  if (!CIRCLE_API_KEY) {
    throw new Error("Circle API key not configured");
  }

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

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    const errorMessage = (error as CircleAPIError).message || `HTTP ${response.status}`;
    throw new Error(`Circle API failed to create user: ${errorMessage}`);
  }

  const data = await response.json();
  return data.data;
}

async function createWallet(userId: string): Promise<CircleWalletResponse> {
  if (!CIRCLE_API_KEY) {
    throw new Error("Circle API key not configured");
  }

  // Prepare wallet creation payload
  const payload: {
    idempotencyKey: string;
    userId: string;
    blockchains: string[];
    description: string;
    walletSetId?: string;
  } = {
    idempotencyKey: uuidv4(),
    userId: userId,
    blockchains: ['MATIC-AMOY'], // Using Polygon Amoy testnet - Arc Testnet may not be supported yet
    description: 'Starc Merchant Wallet',
  };

  // Only include walletSetId if it's configured
  if (WALLET_SET_ID) {
    payload.walletSetId = WALLET_SET_ID;
  }

  const response = await fetch('https://api.circle.com/v1/w3s/user/wallets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CIRCLE_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    const errorMessage = (error as CircleAPIError).message || `HTTP ${response.status}`;
    throw new Error(`Circle API failed to create wallet: ${errorMessage}`);
  }

  const data: CircleWalletResponse = await response.json();

  // Validate response structure
  if (!data.data || !data.data.challengeId) {
    throw new Error("Circle API returned invalid response: missing challengeId");
  }

  return data;
}

async function createChallenge(userId: string): Promise<CircleWalletResponse> {
  // 1. Create User (idempotent - Circle handles duplicates)
  try {
    await createUser(userId);
  } catch (error) {
    // If user already exists, Circle returns 409 which is fine
    console.log(`User ${userId} may already exist, continuing...`);
  }

  // 2. Initialize Wallet (returns challenge)
  const walletResponse = await createWallet(userId);

  return walletResponse;
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(circleRateLimiter, identifier);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many wallet creation requests. Please try again later.",
          retryAfter: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimitResult.limit.toString(),
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.reset.toString(),
          },
        }
      );
    }

    // Validate API keys are configured
    if (!CIRCLE_API_KEY || !APP_ID) {
      return NextResponse.json(
        { error: "Circle API not properly configured. Please contact support." },
        { status: 503 }
      );
    }

    // Parse and validate request body
    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body");
    });

    const validationResult = CreateChallengeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { action, userId } = validationResult.data;

    if (action === 'create_challenge') {
      const result = await createChallenge(userId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Circle API Error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "API authentication failed" },
          { status: 503 }
        );
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "API rate limit exceeded. Please try again later." },
          { status: 429 }
        );
      }
      if (error.message.includes("Invalid JSON")) {
        return NextResponse.json(
          { error: "Malformed request body" },
          { status: 400 }
        );
      }

      // Return specific error message for debugging in development
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
