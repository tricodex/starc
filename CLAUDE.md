# CLAUDE.md

Guidance for AI assistants working on the Starc Protocol.

## Project Context (November 2025)

**Starc** is a Unified Stablecoin Vault on the Arc Network.
- **Network**: Arc Testnet (Chain ID: `5042002`, Native Currency: `USDC`).
- **Key Nuance**: Arc uses `USDC` as its native gas token. Use `parseUnits(val, 18)` for gas/native value interactions, but `6` decimals for ERC20 USDC contract interactions.
- **Vault Strategy**: Single-asset (USDC) ERC4626 vault (`StarcVaultV2.sol`).
- **Router Layer**: `StarcRouter.sol` unifies diverse assets into the Vault.
- **Merchant Layer**: Integrates Circle User-Controlled Wallets for merchant accounts.

## Development Commands

### Frontend
```bash
bun run dev      # Start dev server
bun run build    # Production build
bun run lint     # Run linter
bun run db:studio # Open Prisma Studio
```

### Smart Contracts (Foundry)
```bash
cd contracts
forge build
forge test
forge script script/DeployVaultV2.s.sol --rpc-url $RPC_URL --broadcast --legacy
```
*Note: Always use `--legacy` flag for Arc Testnet deployments.*

## Architecture & Status

### 1. Smart Contracts (`/contracts`)
- **`StarcVaultV2.sol`**: Active. ERC4626 single-asset vault. Pausable, Fee-enabled.
- **`StarcRouter.sol`**: Active. Routes payments from any asset to Vault shares.
- **`MockV3Aggregator.sol`**: Deployed to simulate oracle feeds for risk dashboard.
- **Deployments**:
  - Vault: `0x6b92...846`
  - Router: `0x1eda...BBC4`
  - Oracle: `0xed2e...896`
  - Mock Tokens: Deployed for ARS/USD variants.

### 2. Frontend (`/app`)
- **Merchant Dashboard** (`/demo`):
  - Tabs: Payments, Unified Vault, Merchant Treasury, Bridge, Profile, Send.
  - **Profile**: Tied to Circle Wallet address. Stored in Postgres.
  - **Payments**: Generate links, track status (Pending/Completed).
- **Admin Console** (`/admin`):
  - Live monitoring of Vault status (Paused/Active).
  - Oracle price feed with "Simulate Depeg" button (sets price to 0.90).
  - Emergency Pause controls.
- **Circle Integration**:
  - **SDK**: `@circle-fin/w3s-pw-web-sdk`
  - **Auth**: `POST /v1/w3s/user/initialize` for new users.
  - **Tokens**: Managed via `app/api/circle/wallet/route.ts`.
  - **Execution**: `app/api/circle/wallet/execute/route.ts` handles contract calls.

### 3. Database (Prisma)
- **Merchant**: Stores profile (slug, name, walletAddress).
- **PaymentRequest**: Tracks individual payment links and status.

## Critical Implementation Details

1.  **Circle Wallets**: 
    -   Uses **User-Controlled** wallets (PIN authentication).
    -   `userId` is generated uniquely per session/user to allow fresh testing.
    -   Requires `userToken` and `encryptionKey` from backend for SDK init.
    
2.  **Asset Configuration**:
    -   Managed in `app/config/assets.ts`.
    -   Contains **Verified** contract addresses for Arc Testnet.
    -   Includes `oracleAddress` for admin risk monitoring.

3.  **Build System**:
    -   Strictly use **Bun**.
    -   Next.js 16 App Router.
    -   Tailwind v4 for styling.

## Environment Variables

Required in `.env`:
```bash
# Database
DATABASE_URL="..."

# Circle
NEXT_PUBLIC_CIRCLE_APP_ID="..."
CIRCLE_API_KEY="..."

# Arc Network
TESTNET_RPC_URL="https://rpc.testnet.arc.network"
PRIVATE_KEY="..."
```

## Verification Checklist
- [x] Arc Chain ID = 5042002
- [x] Native Currency = USDC (18 decimals for gas)
- [x] Vault = ERC4626 (USDC)
- [x] Circle SDK = User-Controlled Wallets
- [x] Admin = Live on-chain data
