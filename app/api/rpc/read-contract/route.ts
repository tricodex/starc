import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';

// Define Arc Testnet chain
const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
});

// Create public client for reading contract data
const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http('https://rpc.testnet.arc.network'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, abi, functionName, args } = body;

    if (!address || !abi || !functionName) {
      return NextResponse.json(
        { error: 'Missing required parameters: address, abi, functionName' },
        { status: 400 }
      );
    }

    // Read contract using viem
    const result = await publicClient.readContract({
      address: address as `0x${string}`,
      abi,
      functionName,
      args: args || [],
    });

    // Convert BigInt values to strings for JSON serialization
    const serializedResult = JSON.parse(
      JSON.stringify(result, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json({ result: serializedResult });
  } catch (error: any) {
    console.error('RPC read-contract error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to read contract' },
      { status: 500 }
    );
  }
}

