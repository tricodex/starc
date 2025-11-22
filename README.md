# Starc Protocol

Unified stablecoin payment settlement layer on the Arc Network.

## Overview

Starc enables merchants to accept instant, verifiable USDC payments directly into a single-asset vault. It eliminates the complexity of traditional payment gateways by leveraging the Arc Network's speed and Circle's programmable infrastructure.

## Features

-   **Merchant Dashboard**: Generate custom payment links and QR codes.
-   **Starc Vault V2**: ERC4626-compliant single-asset vault (USDC) for secure settlement.
-   **Circle Integration**: 
    -   **Programmable Wallets**: Embedded wallet creation and management via W3S SDK.
    -   **Smart Rules**: AI-driven logic for automated small payment approvals.
-   **Real-Time Verification**: WebSocket-based transaction tracking and Lottie-animated feedback.

## Tech Stack

-   **Frontend**: Next.js 16, React 19, Tailwind CSS v4
-   **Blockchain**: Arc Testnet (Chain ID: 5042002)
-   **Smart Contracts**: Solidity, OpenZeppelin (ERC4626)
-   **Database**: PostgreSQL (Neon), Prisma ORM
-   **Infrastructure**: Circle Web3 Services (W3S)

## Getting Started

### Prerequisites

-   Bun runtime
-   Circle Developer Account (API Key)
-   Arc Testnet RPC URL

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Set up environment variables (`.env`):
    ```bash
    NEXT_PUBLIC_CIRCLE_APP_ID=...
    CIRCLE_API_KEY=...
    DATABASE_URL=...
    ```
4.  Run the development server:
    ```bash
    bun run dev
    ```

## Architecture

The system uses a "Safety First" architecture. We avoid complex oracle dependencies by strictly using a single-asset vault design. Payments are settled atomically on-chain, with the frontend listening for `Deposit` events to trigger success states.

## License

MIT
