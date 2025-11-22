'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

interface CircleWalletContextType {
  sdk: W3SSdk | null;
  walletId: string | null;
  walletAddress: string | null;
  isConnected: boolean;
  isLoading: boolean;
  createWallet: () => Promise<void>;
  disconnect: () => void;
}

const CircleWalletContext = createContext<CircleWalletContextType | undefined>(undefined);

// LocalStorage keys for persistence
const STORAGE_KEYS = {
  USER_ID: 'circle_user_id',
  USER_TOKEN: 'circle_user_token',
  ENCRYPTION_KEY: 'circle_encryption_key',
  WALLET_ID: 'circle_wallet_id',
  WALLET_ADDRESS: 'circle_wallet_address',
};

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const [sdk, setSdk] = useState<W3SSdk | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize SDK
    const w3s = new W3SSdk();
    w3s.setAppSettings({
      appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '',
    });
    setSdk(w3s);

    // Restore wallet state from localStorage if exists
    const storedWalletId = localStorage.getItem(STORAGE_KEYS.WALLET_ID);
    const storedWalletAddress = localStorage.getItem(STORAGE_KEYS.WALLET_ADDRESS);

    if (storedWalletId && storedWalletAddress) {
      setWalletId(storedWalletId);
      setWalletAddress(storedWalletAddress);
      console.log('Restored wallet from localStorage:', { walletId: storedWalletId, walletAddress: storedWalletAddress });
    }
  }, []);

  const createWallet = async () => {
    if (!sdk) return;
    setIsLoading(true);
    try {
      // Check if user already exists in localStorage
      let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
      let isNewUser = false;

      if (!userId) {
        // Generate unique user ID ONLY for first-time users
        userId = `starc_user_${Date.now()}`;
        isNewUser = true;
        console.log('Creating new user:', userId);
      } else {
        console.log('Using existing user:', userId);
      }

      // 1. Request Challenge from Backend (handles both new and existing users)
      const response = await fetch('/api/circle/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_challenge', userId })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("Non-JSON response:", responseText);
        throw new Error("Server returned non-JSON response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to create wallet");
      }

      const challengeId = data.data?.challengeId;
      const userToken = data.userToken;
      const encryptionKey = data.encryptionKey;

      if (challengeId && userToken && encryptionKey) {
        // Persist credentials to localStorage
        localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
        localStorage.setItem(STORAGE_KEYS.USER_TOKEN, userToken);
        localStorage.setItem(STORAGE_KEYS.ENCRYPTION_KEY, encryptionKey);

        // 2. Set SDK authentication with userToken and encryptionKey
        sdk.setAuthentication({
          userToken,
          encryptionKey
        });

        // 3. Execute Challenge with SDK (User sets PIN or enters existing PIN)
        sdk.execute(challengeId, async (error, result) => {
          if (error) {
            console.error("SDK Error:", error);
            alert(`Failed to ${isNewUser ? 'create' : 'access'} wallet: ${error.message}`);
            setIsLoading(false);
            return;
          }

          if (result) {
            console.log("Challenge Completed:", result);
            console.log("Wallet Created:", result);

            // Poll for wallet creation
            let attempts = 0;
            const maxAttempts = 10;

            const pollWallet = async () => {
              try {
                const walletResponse = await fetch(`/api/circle/wallet?userId=${userId}`);
                const walletData = await walletResponse.json();
                const wallets = walletData.data?.wallets;

                if (wallets && wallets.length > 0) {
                  const wallet = wallets[0];
                  console.log("Fetched Wallet:", wallet);

                  // Persist wallet details to localStorage
                  localStorage.setItem(STORAGE_KEYS.WALLET_ID, wallet.id);
                  localStorage.setItem(STORAGE_KEYS.WALLET_ADDRESS, wallet.address);

                  setWalletId(wallet.id);
                  setWalletAddress(wallet.address);
                  setIsLoading(false);
                } else if (attempts < maxAttempts) {
                  attempts++;
                  console.log(`Wallet not ready yet, retrying... (${attempts}/${maxAttempts})`);
                  setTimeout(pollWallet, 2000); // Retry every 2 seconds
                } else {
                  console.warn("Wallet initialized but no wallet ID returned after polling");
                   // Fallback: try to use result data if available
                  const resData = result as any;
                  if (resData.data?.walletId) {
                     const walletId = resData.data.walletId;
                     localStorage.setItem(STORAGE_KEYS.WALLET_ID, walletId);
                     setWalletId(walletId);
                  }
                  setIsLoading(false);
                }
              } catch (err) {
                console.error("Failed to fetch wallet info:", err);
                setIsLoading(false);
              }
            };

            pollWallet();
          }
        });
      } else {
        throw new Error("Failed to get challenge, userToken, or encryptionKey");
      }
    } catch (e) {
      console.error("Wallet Creation Failed:", e);
      alert("Failed to create wallet. Please check your Circle API Keys in .env");
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    // Clear all Circle wallet data from localStorage
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.ENCRYPTION_KEY);
    localStorage.removeItem(STORAGE_KEYS.WALLET_ID);
    localStorage.removeItem(STORAGE_KEYS.WALLET_ADDRESS);

    setWalletId(null);
    setWalletAddress(null);
    console.log('Wallet disconnected and localStorage cleared');
  };

  return (
    <CircleWalletContext.Provider value={{
      sdk,
      walletId,
      walletAddress,
      isConnected: !!walletId,
      isLoading,
      createWallet,
      disconnect
    }}>
      {children}
    </CircleWalletContext.Provider>
  );
}

export function useCircleWallet() {
  const context = useContext(CircleWalletContext);
  if (context === undefined) {
    throw new Error('useCircleWallet must be used within a CircleWalletProvider');
  }
  return context;
}
