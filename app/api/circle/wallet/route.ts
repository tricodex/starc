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

interface CircleWalletResponse {
  data?: {
    challengeId?: string;
  };
}

interface CircleUserTokenResponse {
  data: {
    userToken: string;
    encryptionKey: string;
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
    // If user already exists (409), we can proceed
    if (response.status === 409) {
      console.log(`User ${userId} already exists.`);
      return { id: userId, status: 'EXISTING', createDate: '', updateDate: '' };
    }
    const errorMessage = (error as CircleAPIError).message || `HTTP ${response.status}`;
    throw new Error(`Circle API failed to create user: ${errorMessage}`);
  }

  const data = await response.json();
  return data.data;
}

async function createUserToken(userId: string): Promise<{ userToken: string; encryptionKey: string }> {
  const response = await fetch('https://api.circle.com/v1/w3s/users/token', {
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
    const errorText = await response.text();
    throw new Error(`Failed to create user token: ${errorText}`);
  }

  const data: CircleUserTokenResponse = await response.json();
  return {
    userToken: data.data.userToken,
    encryptionKey: data.data.encryptionKey
  };
}

async function createWallet(userId: string): Promise<CircleWalletResponse & { userToken: string; encryptionKey: string }> {
  if (!CIRCLE_API_KEY) {
    throw new Error("Circle API key not configured");
  }

  // Generate a fresh user token and encryption key
  const { userToken, encryptionKey } = await createUserToken(userId);

  // Prepare wallet initialization payload
  const payload: {
    idempotencyKey: string;
    blockchains: string[];
    accountType: string;
  } = {
    idempotencyKey: uuidv4(),
    blockchains: ['ARC-TESTNET'],
    accountType: 'SCA'
  };

  console.log("Initializing user wallet with payload:", JSON.stringify({ ...payload, userToken: '[REDACTED]' }, null, 2));

  // Use /user/initialize for first-time setup
  const response = await fetch('https://api.circle.com/v1/w3s/user/initialize', {
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
    console.error("Circle API Error Response:", errorText);
    let error;
    try {
        error = JSON.parse(errorText);
    } catch (e) {
        error = { message: errorText };
    }
    const errorMessage = (error as CircleAPIError).message || `HTTP ${response.status}`;
    throw new Error(`Circle API failed to initialize wallet: ${errorMessage} - ${JSON.stringify(error)}`);
  }

  const data: CircleWalletResponse = await response.json();

  // Validate response structure
  if (!data.data || !data.data.challengeId) {
    throw new Error("Circle API returned invalid response: missing challengeId");
  }

  return {
    ...data,
    userToken,
    encryptionKey
  };
}

async function createChallenge(userId: string): Promise<CircleWalletResponse & { userToken: string; encryptionKey: string }> {
  // 1. Create User (idempotent logic handled inside createUser)
  await createUser(userId);

  // 2. Initialize Wallet (returns challengeId, userToken, encryptionKey)
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // We need a fresh user token to list wallets
    const { userToken } = await createUserToken(userId);

    const response = await fetch('https://api.circle.com/v1/w3s/wallets', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CIRCLE_API_KEY}`,
        'X-User-Token': userToken
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list wallets: ${errorText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Circle API GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch wallets" }, { status: 500 });
  }
}
