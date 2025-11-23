'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parseUnits, pad } from 'viem';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';
import { CCTP_TOKEN_MESSENGER_ADDRESS, USDC_ADDRESS } from '@/app/config/assets';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { walletId, userId, amount } = body;

        if (!walletId || !userId || !amount) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get User Token
        const { userToken, encryptionKey } = await createUserToken(userId);

        // 2. Get Wallet Address (for mintRecipient)
        const walletRes = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}`, {
            headers: {
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!walletRes.ok) {
            throw new Error("Failed to fetch wallet details");
        }

        const walletData = await walletRes.json();
        const walletAddress = walletData.data?.wallet?.address;

        if (!walletAddress) {
            throw new Error("Wallet address not found");
        }

        // 3. Prepare CCTP V2 Parameters
        const amountBigInt = parseUnits(amount, 18); // Arc Native USDC uses 18 decimals
        const destinationDomain = 0; // Ethereum (domain 0)
        const mintRecipient = pad(walletAddress as `0x${string}`); // Pad address to bytes32
        const burnToken = USDC_ADDRESS; // Arc Native USDC (0x3600...0000)
        const destinationCaller = '0x0000000000000000000000000000000000000000000000000000000000000000'; // bytes32(0) = anyone can call
        const maxFee = '0'; // No fast transfer fee for testnet
        const minFinalityThreshold = 0; // Use default finality (Fast Transfer)

        // 4. Initiate Contract Execution (depositForBurn - CCTP V2)
        const payload = {
            idempotencyKey: uuidv4(),
            userId: userId,
            contractAddress: CCTP_TOKEN_MESSENGER_ADDRESS,
            abiFunctionSignature: 'depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)',
            abiParameters: [
                amountBigInt.toString(),
                destinationDomain,
                mintRecipient,
                burnToken,
                destinationCaller,
                maxFee,
                minFinalityThreshold
            ],
            walletId: walletId,
            feeLevel: "MEDIUM"
        };

        console.log(`Bridging (CCTP) ${amount} USDC via ${CCTP_TOKEN_MESSENGER_ADDRESS}`);
        console.log("CCTP Payload:", JSON.stringify(payload, null, 2));

        const transferRes = await fetch('https://api.circle.com/v1/w3s/user/transactions/contractExecution', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CIRCLE_API_KEY}`,
                'X-User-Token': userToken
            },
            body: JSON.stringify(payload)
        });

        console.log("Circle API Response Status:", transferRes.status);

        if (!transferRes.ok) {
            const errorText = await transferRes.text();
            console.error("Circle Bridge Transfer Failed:", errorText);
            console.error("Status:", transferRes.status);
            console.error("Payload that failed:", JSON.stringify(payload, null, 2));
            throw new Error(`Bridge Failed (${transferRes.status}): ${errorText}`);
        }

        const transferData = await transferRes.json();
        console.log("Circle API Response Data:", JSON.stringify(transferData, null, 2));

        return NextResponse.json({
            challengeId: transferData.data.challengeId,
            userToken,
            encryptionKey,
            message: `Bridging ${amount} USDC to Ethereum (CCTP)`
        });

    } catch (error: any) {
        console.error('Treasury Bridge Error:', error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
