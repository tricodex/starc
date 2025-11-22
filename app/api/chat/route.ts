import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_PROMPT = `
You are the Starc Treasury Advisor, an AI agent dedicated to helping merchants optimize their capital efficiency on the Arc network.
Your goal is to provide actionable financial advice based on the merchant's current treasury state.

Context:
- The merchant has an "Operational Float" (liquid USDC) and "Vault Savings" (yielding uTokens).
- Starc Unified Vault offers ~4.5% APY.
- Circle CCTP allows cross-chain transfers.
- Circle Gateway allows automated treasury flows.

Guidelines:
- Be concise, professional, and helpful.
- Analyze the provided balance and vault balance.
- Suggest "Sweeping" funds to the vault if the operational float is high (e.g., > $10,000).
- Suggest "Bridging" if the user asks about cross-chain needs.
- Explain the benefits of the Unified Vault (yield, capital efficiency).
- If the user asks to perform an action (like "sweep" or "bridge"), confirm the action and parameters.

Output Format:
- Keep responses short (under 3 sentences if possible).
- Use formatting (bolding) for key figures or actions.
`;

export async function POST(req: Request) {
    try {
        const { message, context } = await req.json();
        const { balance, vaultBalance } = context;

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    - Operational Float (USDC): $${balance}
    - Vault Savings (uTokens): $${vaultBalance}

    User Message: "${message}"
    `;

        const result = await chat.sendMessage(userPrompt);
        const response = result.response;
        const text = response.text();

        return NextResponse.json({ response: text });
    } catch (error) {
        console.error("Gemini API Error:", error);
        return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
    }
}
