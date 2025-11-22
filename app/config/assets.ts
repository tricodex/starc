export const SUPPORTED_ASSETS = {
    'Native USDC': {
        address: '0x3600000000000000000000000000000000000000', // Native USDC (Gas Token)
        vaultAddress: '0x6b9214D97aebd45D308F3dBdf599042f51B3D846', // Original Vault
        decimals: 6,
        symbol: 'USDC',
        name: 'Native USDC'
    },
    'USDC': {
        address: '0x3600000000000000000000000000000000000000', // Native USDC (Gas Token)
        vaultAddress: '0x6b9214D97aebd45D308F3dBdf599042f51B3D846', // Original Vault
        decimals: 6,
        symbol: 'USDC',
        name: 'Native USDC'
    },
    'mUSDC': {
        address: '0x7504C2C43D0782Ba2CbbF741e845584168A1EF90', // Mock USDC (ERC20)
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C', // Vault for Mock USDC
        decimals: 6,
        symbol: 'mUSDC',
        name: 'Mock USDC'
    },
    'mARS': {
        address: '0xc8F56dd89b0314D407Cf82AAb721766825E4dC8d', // Mock ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C', // Using same vault for now (technically incorrect as V2 is single asset, but for demo config placeholder)
        decimals: 18,
        symbol: 'mARS',
        name: 'Mock ARS'
    },
    'nARS': {
        address: '0xF9689228ba321ae71c078dFf5e48Ac94e6B6b692', // Native ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'nARS',
        name: 'Native ARS'
    },
    'wARS': {
        address: '0xE7069F0fb0240c88946a4e22b92B3Fe22A8B2bE1', // Wrapped ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'wARS',
        name: 'Wrapped ARS'
    },
    'dARS': {
        address: '0x5AC020fc454e62379E4Fd7d05B413DfA990F7c0c', // Digital ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'dARS',
        name: 'Digital ARS'
    },
    'bARS': {
        address: '0xFc9d1ECC6AbE3e2fD0b571fB5119B4d08bc189c1', // Bank ARS
        vaultAddress: '0xF0B6802b0f772486ce2F7950F0D8826914c1BF0C',
        decimals: 18,
        symbol: 'bARS',
        name: 'Bank ARS'
    },
} as const;
