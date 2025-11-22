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
| **Mock Oracle** | `0xed2ecEc90a6ad378c819391D585bf5598c73e896` |
| **mUSDC** | `0x7504C2C43D0782Ba2CbbF741e845584168A1EF90` |
| **mARS** | `0xc8F56dd89b0314D407Cf82AAb721766825E4dC8d` |
| **nARS** | `0xF9689228ba321ae71c078dFf5e48Ac94e6B6b692` |

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
3.  Set up `.env` (see `CLAUDE.md` for required vars).
4.  Run the development server:
    ```bash
    bun run dev
    ```

## Architecture

The system uses a "Safety First" architecture. 
- **Vault**: Single-asset (USDC) design to minimize oracle risk.
- **Settlement**: Atomic on-chain settlement.
- **Oracles**: Chainlink-compatible feeds used for risk monitoring and "De-peg" circuit breakers (simulated in Admin console).

## License

MIT
