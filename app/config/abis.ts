export const VAULT_ABI = [
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }]
    },
    {
        name: 'totalAssets',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
    },
    {
        name: 'assetConfig',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'asset', type: 'address' }],
        outputs: [
            { name: 'isSupported', type: 'bool' },
            { name: 'oracle', type: 'address' },
            { name: 'tokenDecimals', type: 'uint8' },
            { name: 'oracleDecimals', type: 'uint8' },
            { name: 'dailyDepositLimit', type: 'uint256' },
            { name: 'dailyDeposited', type: 'uint256' },
            { name: 'lastResetTimestamp', type: 'uint256' },
            { name: 'minPrice', type: 'int256' },
            { name: 'maxPrice', type: 'int256' }
        ]
    }
] as const;
