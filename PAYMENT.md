# Circle Wallet Payment Integration Guide

This document outlines the definitive pattern for integrating Circle Programmable Wallets into the Starc application, ensuring reliable payments, transaction tracking, and database updates.

## Core Principles

1.  **User-Controlled Wallets**: We use Circle's User-Controlled Wallets (PIN authentication).
2.  **Challenge-Based Execution**: Every write operation (Transfer, Contract Execution) requires a Challenge ID.
3.  **Asynchronous Settlement**: Transactions are not instant. We must poll for the transaction hash (`txHash`) after the user completes the challenge.
4.  **Session Persistence**: The `userToken` and `encryptionKey` rotate. We must persist new credentials to `localStorage` after every successful API call to maintain the session.

## Integration Pattern

### 1. Initiating the Transaction (Frontend)

The frontend component (`CircleWallet.tsx` or `AiAgent.tsx`) initiates the request to the backend.

```typescript
// 1. Get User ID (Required for all requests)
const userId = localStorage.getItem('circle_user_id');

// 2. Call Backend API
const response = await fetch('/api/circle/wallet/transfer', {
    method: 'POST',
    body: JSON.stringify({
        walletId,
        userId,
        // ... other params
    })
});

const data = await response.json();
```

### 2. Handling the Response & Challenge (Frontend)

The backend returns a `challengeId` AND fresh credentials. **Crucially**, we must update the SDK authentication immediately.

```typescript
if (data.challengeId) {
    // CRITICAL: Persist new credentials to localStorage
    if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        
        // Update SDK instance
        sdk.setAuthentication({
            userToken: data.userToken,
            encryptionKey: data.encryptionKey
        });
    }

    // Execute Challenge (Prompt User for PIN)
    sdk.execute(data.challengeId, (error, result) => {
        if (error) {
            // Handle Error
            return;
        }
        
        if (result) {
            // Challenge completed successfully
            // START POLLING FOR TX HASH
        }
    });
}
```

### 3. Polling for Transaction Hash (Frontend)

The `sdk.execute` callback returns `result`, but this does NOT contain the `txHash` immediately. We must poll the Circle API.

**Endpoint**: `/api/circle/wallet/transactions`

**Requirements**:
*   Must provide `userId` query param (for backend validation).
*   Must provide `X-User-Token` header (for Circle API auth).

```typescript
const pollForTxHash = async () => {
    const userId = localStorage.getItem('circle_user_id');
    
    for (let i = 0; i < 15; i++) { // Poll for ~30 seconds
        // Get FRESH token from localStorage (it was just updated!)
        const userToken = localStorage.getItem('circle_user_token');
        
        const headers = {};
        if (userToken) headers['X-User-Token'] = userToken;

        // Call polling endpoint
        const res = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { 
            headers 
        });
        
        const data = await res.json();
        
        // Logic to find the transaction (e.g., latest one)
        if (data?.data?.transactions?.length > 0) {
            const latestTx = data.data.transactions[0];
            if (latestTx.txHash) {
                return latestTx.txHash;
            }
        }
        
        await new Promise(r => setTimeout(r, 2000)); // Wait 2s
    }
    return null;
};
```

### 4. Updating Database & UI (Frontend)

Once the `txHash` is found:

1.  **Update Database**: Call a Server Action (e.g., `updatePaymentStatus`) to save the `txHash` and mark the payment as `COMPLETED`.
2.  **Update UI**: Show the Success screen with the Explorer Link.

## Common Pitfalls & Fixes

*   **Error: "Missing userId"**: Ensure the polling fetch call includes `?userId=${userId}`. Even if the backend doesn't send it to Circle, the Next.js route validates it.
*   **Error: "Unsupported userId" (400)**: Ensure the backend route (`/api/circle/wallet/transactions`) does NOT send `userId` to Circle's API if using a User Token.
*   **Error: "The userToken had expired" (403)**: Ensure you are saving the NEW `userToken` returned from the transfer/execute endpoint to `localStorage` *before* starting the polling loop. The polling loop must use this new token.
*   **No Tx Link**: Ensure the UI waits for the polling to complete before showing the success state.

## Reference Implementation

See `app/components/CircleWallet.tsx` and `app/components/AiAgent.tsx` for the canonical implementation of this pattern.

