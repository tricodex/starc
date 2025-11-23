# Starc Protocol

Unified stablecoin payment settlement layer on the Arc Network.

## Overview

Starc enables merchants to accept USDC payments through Circle Programmable Wallets, settling them into an ERC4626 vault on Arc Testnet. The system provides payment link generation, transaction tracking, and basic treasury automation.

## Features

### Merchant Dashboard
- Payment link and QR code generation for customer payments
- Transaction history with status tracking (PENDING/COMPLETED)
- Merchant profile management with PostgreSQL persistence

### Payment Processing
- **Circle Wallet Integration**: PIN-secured smart contract wallets via W3S SDK
- **Transaction Polling**: Automatic transaction hash retrieval after PIN confirmation (up to 40 seconds)
- **Database Tracking**: Payment requests stored with status updates and blockchain transaction links
- **Multi-Token Support**: Native USDC (18 decimals, gas token at `0x36...00`) and ERC20 mock tokens

### Treasury Management
- **Payroll System**: Database-driven employee payments
  - Individual or batch payment execution via Circle Wallet
  - Transaction receipt tracking with status and blockchain links
  - Employee records with wallet addresses and payroll amounts
- **CCTP Bridge Widget**: Cross-chain USDC transfers via Circle's burn-and-mint protocol
  - Modal-based UI with transaction status feedback
  - Transaction hash polling and ArcScan explorer links

### Starc Vault V2
- ERC4626-compliant single-asset vault (USDC only)
- Fee mechanism mints shares to treasury and risk fund (not asset withdrawal)
- Pausable by risk manager role for emergency stops
- Reentrancy guards on all state-changing functions

### Starc Router
- Unification layer that accepts alternative stablecoin assets (mARS, nARS, wARS)
- Simulated swap to vault's base asset (USDC) via mock token minting
- Deposits unified USDC into vault on behalf of merchant
- Ensures merchants receive vault shares regardless of input token

### AI Payment Agent
- **Gemini 2.5 Flash** integration for natural language payment execution
- Executes pending payment requests via Circle Wallet when user asks to "pay" them
- Displays open payment requests with merchant address context
- Rate-limited API endpoint (10 requests per 60 seconds via Upstash Redis)
- **NOT a treasury advisor** - purely a payment request executor

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **Blockchain**: Arc Testnet (Chain ID: 5042002)
- **Smart Contracts**: Solidity 0.8.24, OpenZeppelin (ERC4626)
- **Database**: PostgreSQL (Neon), Prisma ORM
- **Infrastructure**: Circle Web3 Services (W3S), Gemini AI
- **Rate Limiting**: Upstash Redis

## Deployed Contracts (Arc Testnet)

| Contract | Address |
|----------|---------|
| **Native USDC** | `0x3600000000000000000000000000000000000000` |
| **StarcVaultV2** | `0x6b9214D97aebd45D308F3dBdf599042f51B3D846` |
| **StarcRouter** | `0x1eda051D6C1cbD07026B63E3E8DF6e154239bBC4` |
| **ARS Vault (uARS)** | `0x4Ec59D328fFBbbe05E93E0a7D140a28eE4254B88` |
| **Mock Oracle** | `0xed2ecEc90a6ad378c819391D585bf5598c73e896` |
| **mUSDC** | `0x7504C2C43D0782Ba2CbbF741e845584168A1EF90` |
| **mARS** | `0xc9e86CdB5ACaFAD519A7c9018C45af5E93C258ee` |
| **nARS** | `0x8b99629a10DbD2C4503A45A882EAC03f60ae8F15` |
| **wARS** | `0xbb9086400A5fce3A3a771C0C1F39d7A0bEF04523` |
| **dARS** | `0x5AC020fc454e62379E4Fd7d05B413DfA990F7c0c` |
| **bARS** | `0xFc9d1ECC6AbE3e2fD0b571fB5119B4d08bc189c1` |

## Getting Started

### Prerequisites

- **Bun** v1.2+ (Required)
- **Foundry** (for contract interactions)
- **Circle Developer Account** (App ID & API Key)
- **Gemini API Key** (for AI agent functionality)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Set up `.env` with required credentials:
   - Database URLs (Postgres)
   - Circle API credentials
   - Gemini API key
   - Optional: Upstash Redis for rate limiting
4. Run database migrations:
   ```bash
   bun run db:migrate
   bun run db:seed
   ```
5. Start development server:
   ```bash
   bun run dev
   ```

## Architecture

### System Components

**Frontend (Next.js 16)**: Server-rendered application managing Circle W3S SDK interactions and user sessions.

**Backend API**: Handles User Token generation, Challenge ID creation, merchant data persistence, and AI agent requests.

**Blockchain (Arc Testnet)**: Settlement layer where all value transfers occur.

**Database (PostgreSQL)**: Stores merchants, payment requests, employees, and payroll receipts.

### StarcVault V2 (Smart Contract)

ERC4626-compliant vault designed for single-asset stability:

- **Single-Asset Design**: Accepts only USDC to eliminate multi-asset risks
- **Fee Mechanism**: Fees taken in shares (not assets) to preserve capital
  - Mints additional shares to treasury and risk fund on deposit/withdraw
  - Dilutes share price slightly but keeps 100% of assets deployed
- **Risk Controls**:
  - Pausable by RISK_MANAGER_ROLE for emergency stops
  - ReentrancyGuard on all state-changing functions
  - 5% maximum fee cap enforced in contract

### Starc Router (Unification)

Entry point for multi-token payments:

**Flow**: User Payment (Any Asset) → Router → Swap to USDC → Deposit to Vault → Merchant (Shares)

**Purpose**: Ensures merchants always settle in vault's base asset regardless of payment token.

### Circle Programmable Wallets

Web3 Services (W3S) integration provides:

- **Smart Contract Accounts**: Each user gets a smart contract wallet on Arc Testnet
- **PIN Authentication**: Non-custodial control via sharded private keys
- **Challenge-Based Execution**: All write operations (transfers, contract calls) require PIN confirmation
- **Session Management**: User tokens and encryption keys rotate after each transaction
- **Transaction Polling**: Frontend polls for transaction hash after PIN completion

### Payment Flow Implementation

1. **Initiation**: Frontend calls backend API with wallet ID and user ID
2. **Challenge Creation**: Backend generates Circle API challenge and returns challenge ID + fresh credentials
3. **Authentication Update**: Frontend persists new user token/encryption key to localStorage
4. **PIN Confirmation**: W3S SDK prompts user for PIN to complete challenge
5. **Transaction Polling**: Frontend polls `/api/circle/wallet/transactions` for transaction hash
6. **Database Update**: Once hash received, payment request marked as COMPLETED with blockchain link


### Payroll System

Database-driven employee payment system:

- **Employee Model**: Stores name, wallet address, position, payroll amount
- **PayrollReceipt Model**: Tracks payment status, transaction hash, timestamps
- **API Endpoints**:
  - `/api/payroll/employees` - Fetch active employees
  - `/api/payroll/receipt` - Create/update payment receipts
  - `/api/treasury/distribute` - Execute Circle Wallet transfers to employee addresses
- **UI Component**: Shows all employees with individual/batch payment buttons and transaction history

### AI Payment Agent

Gemini 2.5 Flash model integration:

- Fetches pending payment requests from database
- Parses natural language commands like "pay request [ID]" or "pay all requests"
- Executes Circle Wallet transfers to merchant address for the requested amount
- Returns JSON action format: `{"action": "TRANSFER", "params": {"amount": "0.50", "token": "USDC", "recipient": "0x..."}}`
- Rate limiting at 10 requests per 60 seconds via Upstash Redis
- **Scope**: Payment request executor only (not a treasury advisor or general assistant)

### Asset Configuration

Arc Testnet has **native USDC** at `0x3600000000000000000000000000000000000000` with **18 decimals** (non-standard). The system:

- Uses `useBalance` for native USDC (gas token), `useReadContract` for ERC20 tokens
- Skips approval step for native tokens (no `approve`/`transferFrom` available)
- Sets `isVaultAsset: false` for native USDC in `assets.ts` (cannot be vault asset directly)
- Normalizes Circle API token symbols (USDC-TESTNET → USDC) for display
- Uses correct decimals (18 for native, 6 for mock ERC20s) for amount parsing

### Known Limitations

- Circle wallet session tokens expire; must use fresh `userToken` and `encryptionKey` after each API call
- Transaction hash retrieval is asynchronous; polling required (up to 40 seconds, 20 attempts)
- Native USDC decimals (18) differ from standard USDC (6)
- Mock tokens (mARS, nARS) use public `mint()` for router swap simulation (not production-ready)
- Contracts not audited; testnet use only

## Development Notes

- Use `bun` for all package management (not npm/yarn)
- Circle transactions require both `userToken` (authentication) and `encryptionKey` (SDK initialization)
- Backend API returns fresh credentials after each transaction; frontend must persist to `localStorage`
- Decimal types from Prisma must be converted to strings before passing to client components
- Payment polling uses fresh `userToken` from `localStorage` in `X-User-Token` header
- All amounts must be parsed with correct decimals: `parseUnits(amount, asset.decimals)`
- Native tokens (gas tokens) skip approval step; ERC20 tokens require `approve` before `deposit`/`pay`

## Documentation

- `PAYMENTS.md` - Circle Wallet integration patterns and transaction flow
- `CLAUDE.md` - Project guidelines for AI assistance
- `contracts/README.md` - Smart contract documentation
- `internal-docs/frameworks.md` - Next.js 16, React 19, Tailwind v4, Bun 1.3 reference

