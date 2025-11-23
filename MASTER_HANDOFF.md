# MASTER HANDOFF: Arc Testnet & Starc Protocol Unification

**Date**: November 23, 2025
**Status**: **CRITICAL - PARTIALLY FIXED**
**Target Audience**: Next AI Developer

## 1. The Core Problem: Arc Testnet Nuances

The fundamental complexity of this project stems from **Arc Testnet's unique behavior regarding USDC**, which differs from standard EVM chains.

### Key Nuances (MEMORIZE THIS):
1.  **Native USDC is the Gas Token**: On Arc Testnet, the native currency (like ETH on Ethereum) **IS** USDC.
    *   **Symbol**: `USDC`
    *   **Decimals**: `18` (NOT 6!)
    *   **Address**: Often represented as `0x000...000` or precompile `0x3600000000000000000000000000000000000000`.
    *   **Access**: Use `provider.getBalance()` (Wagmi/Viem), NOT `ERC20.balanceOf`.

2.  **Circle API Returns "USDC-TESTNET"**:
    *   When querying a Circle User-Controlled Wallet, the token symbol returned is `USDC-TESTNET`, not `USDC`.
    *   **Frontend Must Normalize**: Always map `USDC-TESTNET` -> `USDC` before matching with asset config.

## 2. Current State of the Codebase

We have applied critical fixes to `assets.ts` and `CircleWallet.tsx`, but there is a lingering UX issue in the Header.

### ✅ What is FIXED:
*   **`app/config/assets.ts`**:
    *   Corrected `Native USDC` decimals to `18`.
    *   Removed the duplicate `USDC` key that had wrong (6) decimals.
    *   **Result**: Calculations for payments are now mathematically correct.
*   **`app/components/CircleWallet.tsx`**:
    *   Implemented robust **Token Symbol Normalization**.
    *   It now correctly matches `USDC-TESTNET` from API to `USDC` in our config.
    *   Balances are displaying correctly in the payment form.
*   **`PaymentRequestForm.tsx`**:
    *   Refactored to handle **Approvals** for Circle Wallets.
    *   Polling for transaction hash is implemented.

### ⚠️ What is BROKEN (The Side Effect):
*   **Header Balance (`TokenBalanceDropdown.tsx`)**:
    *   **Symptom**: The "Native USDC" balance in the dropdown header might show `0.00` or be duplicated/missing.
    *   **Reason**: `TokenBalanceDropdown.tsx` iterates over `SUPPORTED_ASSETS`.
        *   It explicitly handles "Native USDC" separately using `getBalance`.
        *   It *skips* the key if it equals `'Native USDC'`.
        *   Previously, we had a duplicate `'USDC'` key. Removing it might have caused it to *only* show the top-level "Native USDC" section, but if that fetching logic relies on a specific key being present or absent, it might glitch.
    *   **Current Logic**:
        ```typescript
        // TokenBalanceDropdown.tsx
        const nativeBalance = await publicClient.getBalance(...) // Fetches Native
        newBalances['Native USDC'] = ...

        Object.entries(SUPPORTED_ASSETS).map(([key, asset]) => {
            if (key === 'Native USDC') return null; // SKIPS Native USDC config
            // ... reads contract ...
        })
        ```
    *   **The Fix Needed**: Ensure `TokenBalanceDropdown.tsx` correctly displays the `Native USDC` balance it fetches via `getBalance`. It seems to store it in `balances['Native USDC']`. If the UI isn't updating, verify the `key` matches exactly.

## 3. Asset Configuration Strategy (The "Source of Truth")

We must adhere to a **SINGLE Source of Truth** for assets.

**`app/config/assets.ts`**:
```typescript
export const SUPPORTED_ASSETS = {
    'Native USDC': {
        address: '0x3600000000000000000000000000000000000000', // Arc Precompile
        decimals: 18, // CRITICAL: 18 for Native on Arc
        symbol: 'USDC',
        name: 'Native USDC',
        isVaultAsset: true
        // ...
    },
    // ... other assets (mUSDC, mARS, etc.)
}
```

**Rules for Next AI:**
1.  **DO NOT Restore the Duplicate 'USDC' Key**: It creates ambiguity. Use `'Native USDC'` as the canonical key for the gas token.
2.  **Fix Component Lookups**: If a component looks for `asset['USDC']`, update it to look for `asset['Native USDC']` OR `asset[paymentRequest.currency]` (which might be just "USDC").
3.  **Database Consistency**: If the database stores `currency: "USDC"`, we need a mapping: `DB "USDC" -> Config "Native USDC"`.
    *   *Current Hack/Fix*: In `PaymentRequestForm`, we do:
        ```typescript
        const asset = SUPPORTED_ASSETS[paymentRequest.currency] || SUPPORTED_ASSETS['Native USDC'];
        ```
        Make sure this fallback exists and is correct.

## 4. Action Items for Next Session

1.  **Verify Header Balance**: Debug `TokenBalanceDropdown.tsx` to ensure `balances['Native USDC']` is being set and rendered.
2.  **Database Mapping**: Ensure `paymentRequest.currency` (likely "USDC") correctly maps to the `Native USDC` asset config.
3.  **Test Full Flow**:
    *   Create Payment (DB stores "USDC").
    *   Open Payment Link.
    *   Form detects "USDC" -> maps to "Native USDC" config (18 decimals).
    *   Circle Wallet connects -> gets "USDC-TESTNET" -> maps to "USDC" symbol -> matches config.
    *   **Transaction**: Sends 18-decimal value.

**DO NOT revert the decimal fix. 18 decimals is correct for Arc Native USDC.**

