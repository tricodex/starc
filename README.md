# Starc Unified Stablecoin Protocol (V2)

Starc is a decentralized protocol for unified stablecoin liquidity and merchant payments.

**V2 Update**: The protocol has pivoted to a **Single-Asset Vault Architecture** (ERC4626) to eliminate cross-asset contamination risks and oracle dependencies. This ensures maximum safety for merchant funds.

## Architecture

### Smart Contracts
- **StarcVaultV2**: A robust, single-asset ERC4626 vault.
    - **Safety**: Enforces 1:1 asset matching. No oracle risk. No death spirals.
    - **Yield**: Fee-based revenue model with Treasury and Risk Fund splits.
    - **Access Control**: Role-based permissions for pausing and fee management.

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Library**: React 19
- **Styling**: Tailwind CSS 4
- **Runtime**: Bun

For detailed framework documentation, see `@frameworks.md`.

## Getting Started

This project uses **Bun** for package management and script execution.

### Prerequisites
- Bun v1.3.0+
- Node.js v20.x (for Vercel compatibility)

### Installation

```bash
bun install
```

### Development

Start the local development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Deployment

The project is configured for Vercel deployment.

```bash
bun run build
```

## Environment Variables

Copy `.env.example` to `.env` (if available) or ensure the following variables are set:

- `GEMINI_API_KEY`: For AI features.
- `CIRCLE_API_KEY`: For Circle Wallet integration.
- `NEXT_PUBLIC_CIRCLE_APP_ID`: Circle App ID.
- `STARC_DATABASE_URL`: Neon DB connection string (pooled).
- `STARC_POSTGRES_PRISMA_URL`: Neon DB connection string (pooled).
- `STARC_POSTGRES_URL_NON_POOLING`: Neon DB connection string (direct).

## License

MIT
