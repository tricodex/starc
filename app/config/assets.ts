export const SUPPORTED_ASSETS = {
    'USDC': {
        address: '0x3600000000000000000000000000000000000000', // Native USDC on Arc Testnet
        vaultAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        decimals: 6,
        symbol: 'USDC',
        name: 'Native USDC'
    },
    'mARS': {
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        vaultAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        decimals: 18,
        symbol: 'mARS',
        name: 'Mock ARS'
    },
    'nARS': {
        address: '0x0000000000000000000000000000000000000000', // Placeholder
        vaultAddress: '0x0000000000000000000000000000000000000000', // Placeholder
        decimals: 18,
        symbol: 'nARS',
        name: 'Native ARS'
    },
    // Add other assets as needed after deployment
} as const;
