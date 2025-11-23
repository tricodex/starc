# Starc Protocol

Unified stablecoin payment settlement layer on the Arc Network.

## Overview

Starc enables merchants to accept instant, verifiable USDC payments directly into a single-asset vault. It eliminates the complexity of traditional payment gateways by leveraging the Arc Network's speed and Circle's programmable infrastructure.

## Features

-   **Merchant Dashboard**: 
    -   Generate custom payment links and QR codes.
    -   Real-time transaction overview with pending/completed status.
    -   Merchant profile management.
-   **Starc Vault V2**: 
    -   ERC4626-compliant single-asset vault (USDC).
    -   Live risk controls (Admin Pause, Oracle Depeg Simulation).
-   **Starc Router (Unification Layer)**:
    -   Automatically swaps non-standard assets (e.g., mARS, nARS) into USDC.
    -   Deposits unified USDC into the Vault on behalf of the merchant.
    -   Ensures merchants always receive liquid `StarcShares` regardless of payment token.
-   **Circle Integration**: 
    -   **User-Controlled Wallets**: PIN-secured, non-custodial wallet creation via W3S SDK.
    -   **Simulated Transfers**: Demo interface for asset transfers.
-   **Admin Console**:
    -   Real-time monitoring of vault status and oracle prices.
    -   Emergency pause/unpause controls.
    -   De-peg simulation for risk testing.

## Tech Stack

-   **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4
-   **Blockchain**: Arc Testnet (Chain ID: 5042002)
-   **Smart Contracts**: Solidity 0.8.24, OpenZeppelin (ERC4626)
-   **Database**: PostgreSQL (Neon), Prisma ORM
-   **Infrastructure**: Circle Web3 Services (W3S)

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

-   **Bun** v1.2+ (Required)
-   **Foundry** (for contract interactions)
-   **Circle Developer Account** (App ID & API Key)

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Set up `.env`
4.  Run the development server:
    ```bash
    bun run dev
    ```

## Architecture

The Starc Protocol is built on a "Safety First" architecture, prioritizing capital preservation and atomic settlement.

### 1. System Components

-   **Frontend (Next.js 16)**: A responsive, server-rendered application that manages user sessions and interfaces with the Circle W3S SDK.
-   **Backend API**: Handles secure operations like User Token generation, Challenge ID creation, and Merchant data management via Prisma/Postgres.
-   **Blockchain (Arc Testnet)**: The settlement layer where all value transfer occurs.

### 2. StarcVault V2 (Smart Contract)

The core of the protocol is `StarcVaultV2.sol`, an ERC4626-compliant vault designed for stability.

-   **Single-Asset Design**: The vault accepts *only* USDC. This deliberate limitation eliminates the risk of "death spirals" seen in multi-asset algorithmic stablecoins.
-   **Fee Mechanism (Mint-on-Top)**:
    -   Fees are taken in **shares**, not assets.
    -   When a user deposits, the vault mints additional shares for the Treasury and Risk Fund.
    -   **Impact**: This dilutes the share price slightly for all holders but ensures 100% of deposited assets remain in the vault to generate yield.
-   **Risk Controls**:
    -   **Pausable**: The `RISK_MANAGER_ROLE` can freeze all deposits and withdrawals in an emergency.
    -   **ReentrancyGuard**: Prevents reentrancy attacks on all state-changing functions.

### 3. Starc Router (Unification)

The `StarcRouter.sol` acts as the unified entry point for payments.

-   **Route**: User Payment (Any Asset) -> Router -> Swap to Base Asset -> Deposit to Vault -> Merchant (Shares).
-   **Verification**: Ensures that regardless of the input token (mARS, nARS, etc.), the merchant always settles in the Vault's base asset (USDC or uARS), maintaining treasury unification.

### 4. Circle Programmable Wallets

We utilize Circle's Web3 Services (W3S) to provide a seamless, non-custodial experience.

-   **Smart Contract Accounts (SCA)**: Every user gets a smart contract wallet on the Arc Testnet. This allows for future features like gas abstraction and batched transactions.
-   **Non-Custodial**: The user controls their wallet via a PIN. The private key is sharded and never fully exposed to the Starc server.
-   **Atomic Settlement**: Payments are settled directly on-chain, with no intermediate holding accounts.

