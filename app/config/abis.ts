export const VAULT_ABI = [
    // Standard ERC4626
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }]
    },
    {
        name: 'withdraw',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' },
            { name: 'owner', type: 'address' }
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
        name: 'asset',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'address' }]
    },
    // Custom V2
    {
        name: 'pause',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: []
    },
    {
        name: 'unpause',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: []
    },
    {
        name: 'setFees',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'depositFeeBps', type: 'uint256' },
            { name: 'withdrawFeeBps', type: 'uint256' }
        ],
        outputs: []
    },
    // Events
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'sender', type: 'address' },
            { indexed: true, name: 'owner', type: 'address' },
            { indexed: false, name: 'assets', type: 'uint256' },
            { indexed: false, name: 'shares', type: 'uint256' }
        ],
        name: 'Deposit',
        type: 'event'
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, name: 'sender', type: 'address' },
            { indexed: true, name: 'receiver', type: 'address' },
            { indexed: true, name: 'owner', type: 'address' },
            { indexed: false, name: 'assets', type: 'uint256' },
            { indexed: false, name: 'shares', type: 'uint256' }
        ],
        name: 'Withdraw',
        type: 'event'
    }
] as const;
