import { v4 as uuidv4 } from "uuid";

export const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY;
export const APP_ID = process.env.NEXT_PUBLIC_CIRCLE_APP_ID;

if (!CIRCLE_API_KEY) {
    console.error("CRITICAL: CIRCLE_API_KEY is not set in environment variables");
}
if (!APP_ID) {
    console.error("CRITICAL: NEXT_PUBLIC_CIRCLE_APP_ID is not set in environment variables");
}

export interface CircleUserTokenResponse {
    data: {
        userToken: string;
        encryptionKey: string;
    };
}

export async function createUserToken(userId: string): Promise<{ userToken: string; encryptionKey: string }> {
    if (!CIRCLE_API_KEY) {
        throw new Error("Circle API key not configured");
    }

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
