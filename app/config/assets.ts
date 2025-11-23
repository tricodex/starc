export const STARC_ROUTER_ADDRESS = '0x1eda051D6C1cbD07026B63E3E8DF6e154239bBC4';
export const STREAMING_PAYMENTS_ADDRESS = '0x8572a110f6a41116d0ace7f24d7f744893385673';
export const LIQUIDITY_MANAGER_ADDRESS = '0xfc4b34e57f348e2cb7b1f7396881e183e7611825';
export const CCTP_TOKEN_MESSENGER_ADDRESS = '0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA'; // Arc Testnet (CCTP V2)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'; // Arc Testnet Native USDC (Gas Token)


export const SUPPORTED_ASSETS = {
    'Native USDC': {
        address: '0x3600000000000000000000000000000000000000', // Arc Testnet Native USDC
        vaultAddress: '0x6b9214D97aebd45D308F3dBdf599042f51B3D846', // Original Vault
        decimals: 18, // Arc Testnet uses 18 decimals for Native USDC (for display)
        symbol: 'USDC',
        name: 'Native USDC',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false // Native tokens can't be vault assets (no approve/transferFrom)
    },
    'USDC': {
        address: '0x3600000000000000000000000000000000000000', // Native USDC (Gas Token)
        vaultAddress: '0x6b9214D97aebd45D308F3dBdf599042f51B3D846', // Original Vault
        decimals: 18, // Arc Testnet uses 18 decimals for Native USDC (for display)
        symbol: 'USDC',
        name: 'Native USDC',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false // Native tokens can't be vault assets (no approve/transferFrom)
    },
    'mUSDC': {
        address: '0x7504C2C43D0782Ba2CbbF741e845584168A1EF90', // Mock USDC (ERC20)
        vaultAddress: '0x6b9214D97aebd45D308F3dBdf599042f51B3D846', // Pointing to USDC Vault
        decimals: 6,
        symbol: 'mUSDC',
        name: 'Mock USDC',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false
    },
    'mARS': {
        address: '0xc9e86CdB5ACaFAD519A7c9018C45af5E93C258ee', // Mock ARS (Deployed)
        vaultAddress: '0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88', // ARS Vault (uARS)
        decimals: 18,
        symbol: 'mARS',
        name: 'Mock ARS',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: true
    },
    'nARS': {
        address: '0x8b99629a10DbD2C4503A45A882EAC03f60ae8F15', // Native ARS (Deployed)
        vaultAddress: '0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88', // ARS Vault (uARS)
        decimals: 18,
        symbol: 'nARS',
        name: 'Native ARS',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false
    },
    'wARS': {
        address: '0xbb9086400A5fce3A3a771C0C1F39d7A0bEF04523', // Wrapped ARS (Deployed)
        vaultAddress: '0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88', // ARS Vault (uARS)
        decimals: 18,
        symbol: 'wARS',
        name: 'Wrapped ARS',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false
    },
    'dARS': {
        address: '0x5AC020fc454e62379E4Fd7d05B413DfA990F7c0c', // Digital ARS
        vaultAddress: '0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88', // ARS Vault (uARS)
        decimals: 18,
        symbol: 'dARS',
        name: 'Digital ARS',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false
    },
    'bARS': {
        address: '0xFc9d1ECC6AbE3e2fD0b571fB5119B4d08bc189c1', // Bank ARS
        vaultAddress: '0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88', // ARS Vault (uARS)
        decimals: 18,
        symbol: 'bARS',
        name: 'Bank ARS',
        oracleAddress: '0xed2ecEc90a6ad378c819391D585bf5598c73e896',
        routerAddress: STARC_ROUTER_ADDRESS,
        isVaultAsset: false
    },
} as const;
