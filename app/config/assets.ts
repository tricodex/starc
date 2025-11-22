export const SUPPORTED_ASSETS = {
    'USDC': {
        address: '0x7504C2C43D0782Ba2CbbF741e845584168A1EF90', // Mock USDC (Minted for Demo)
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C', // StarcVaultV2 (Mock USDC)
        decimals: 6,
        symbol: 'USDC',
        name: 'Mock USDC'
    },
    'mARS': {
        address: '0x4c2ba4c09268cb60222e56681df2d0d942f30b5a', // Mock ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C', // Using same vault for now (technically incorrect as V2 is single asset, but for demo config placeholder)
        decimals: 18,
        symbol: 'mARS',
        name: 'Mock ARS'
    },
    'nARS': {
        address: '0xdbd5a2816ea858286030a4049cc45ea34824422d', // Native ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'nARS',
        name: 'Native ARS'
    },
    'wARS': {
        address: '0x314c96606f19511782d3d00eee53ae2ef182e5e6', // Wrapped ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'wARS',
        name: 'Wrapped ARS'
    },
    'dARS': {
        address: '0x9d4b3f3218b809e7781d3af387c6f2fffc791eaf', // Digital ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'dARS',
        name: 'Digital ARS'
    },
    'bARS': {
        address: '0xc7bf34f147862f537d16f0a172da354ab230628e', // Bank ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'bARS',
        name: 'Bank ARS'
    },
} as const;
