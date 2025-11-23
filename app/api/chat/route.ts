import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { chatRateLimiter, checkRateLimit, getClientIdentifier } from "@/app/lib/ratelimit";

// Validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1, "Message cannot be empty").max(1000, "Message too long"),
  context: z.object({
    balance: z.number().nonnegative("Balance must be non-negative"),
    vaultBalance: z.number().nonnegative("Vault balance must be non-negative"),
    openRequests: z.array(z.object({
      id: z.string(),
      amount: z.string(), // Decimal as string
      currency: z.string(),
      status: z.string()
    })).optional()
  }),
});

// Initialize Gemini AI with new SDK
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("CRITICAL: GEMINI_API_KEY is not set in environment variables");
}
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

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


    // Check API key
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API not configured. Please contact support." },
        { status: 503 }
      );
    }

    const { balance, vaultBalance, openRequests } = context;

    let requestsContext = "";
    if (openRequests && openRequests.length > 0) {
      requestsContext = "Open Payment Requests:\n" + openRequests.map((r: any) =>
        `- ID: ${r.id} | Amount: ${r.amount} ${r.currency} | Status: ${r.status}`
      ).join("\n");
    } else {
      requestsContext = "No open payment requests.";
    }

    const fullPrompt = `${SYSTEM_PROMPT}

IMPORTANT: If the user asks to send funds, make a payment, or transfer assets, you MUST return a JSON object in the following format ONLY (no markdown, no other text):
{
  "action": "TRANSFER",
  "params": {
    "amount": "0.00",
    "token": "USDC",
    "recipient": "0x..."
  },
  "message": "I have initiated the transfer request..."
}

If the user asks to "pay request [ID]" or "pay all requests", use the "openRequests" from the context to find the amount and recipient (which is the merchant address).
For normal conversation, just return the text response.

Current Treasury State:
- Operational Float (USDC): $${balance.toFixed(2)}
- Vault Savings: $${vaultBalance.toFixed(2)}

${requestsContext}

User Message: "${message}"
`;

    // Use new SDK with Gemini 2.5 Flash
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: fullPrompt,
      config: {
        maxOutputTokens: 2048, // Increased from 512 to allow complete responses
        temperature: 0.7,
      },
    });

    const text = response.text || "";

    // Validate response
    if (!text) {
      const finishReason = response.candidates?.[0]?.finishReason || 'UNKNOWN';
      console.error("Gemini response missing text:", {
        candidates: response.candidates,
        modelVersion: response.modelVersion,
        finishReason,
      });

      // Provide helpful error message based on finish reason
      if (finishReason === 'MAX_TOKENS') {
        throw new Error("Response was truncated due to token limit. Please try a shorter question.");
      } else if (finishReason === 'SAFETY') {
        throw new Error("Response blocked due to safety filters. Please rephrase your question.");
      } else {
        throw new Error("No response text from AI");
      }
    }

    // Try to parse JSON from the response if it looks like JSON
    let action = null;
    let cleanText = text;

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const json = JSON.parse(jsonMatch[0]);
        if (json.action === 'TRANSFER') {
          action = json;
          cleanText = json.message || "Transfer initiated.";
        }
      }
    } catch (e) {
      // Not JSON or failed to parse, treat as normal text
    }

    return NextResponse.json({ response: cleanText, action });
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
