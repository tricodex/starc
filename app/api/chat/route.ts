import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { chatRateLimiter, checkRateLimit, getClientIdentifier } from "@/app/lib/ratelimit";

// Validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  context: z.object({
    balance: z.number().nonnegative("Balance must be non-negative"),
    vaultBalance: z.number().nonnegative("Vault balance must be non-negative"),
  }),
});

// Initialize Gemini AI
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is not set in environment variables");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

const SYSTEM_PROMPT = `
You are the Starc Treasury Advisor, an AI agent dedicated to helping merchants optimize their capital efficiency on the Arc network.
Your goal is to provide actionable financial advice based on the merchant's current treasury state.

Context:
- The merchant has an "Operational Float" (liquid USDC) and "Vault Savings" (vault shares).
- Starc Vault (V2) is a single-asset ERC4626 vault for USDC.
- Circle CCTP allows cross-chain transfers.
- Circle Gateway allows automated treasury flows.

Guidelines:
- Be concise, professional, and helpful.
- Analyze the provided balance and vault balance.
- Suggest "Sweeping" funds to the vault if the operational float is high (e.g., > $10,000).
- Suggest "Bridging" if the user asks about cross-chain needs.
- Explain the benefits of the vault (capital efficiency, standardized interface).
- If the user asks to perform an action (like "sweep" or "bridge"), confirm the action and parameters.

Output Format:
- Keep responses short (under 3 sentences if possible).
- Use formatting (bolding) for key figures or actions.
`;

export async function POST(req: Request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(req);
    const rateLimitResult = await checkRateLimit(chatRateLimiter, identifier);

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
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

    // Parse and validate request body
    const body = await req.json().catch(() => {
      throw new Error("Invalid JSON in request body");
    });

    const validationResult = ChatRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { message, context } = validationResult.data;
    const { balance, vaultBalance } = context;

    // Check API key
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API not configured. Please contact support." },
        { status: 503 }
      );
    }

    // Initialize model with stable version and limits
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        maxOutputTokens: 256,
        temperature: 0.7,
      },
    });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am the Starc Treasury Advisor. I am ready to analyze treasury states and provide optimization recommendations." }],
        },
      ],
    });

    const userPrompt = `
Current Treasury State:
- Operational Float (USDC): $${balance.toFixed(2)}
- Vault Savings: $${vaultBalance.toFixed(2)}

User Message: "${message}"
`;

    const result = await chat.sendMessage(userPrompt);
    const response = result.response;
    const text = response.text();

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Gemini API Error:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return NextResponse.json(
          { error: "API authentication failed" },
          { status: 503 }
        );
      }
      if (error.message.includes("quota")) {
        return NextResponse.json(
          { error: "API quota exceeded. Please try again later." },
          { status: 429 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process request. Please try again." },
      { status: 500 }
    );
  }
}
