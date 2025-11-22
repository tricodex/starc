'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

interface CircleWalletContextType {
  sdk: W3SSdk | null;
  walletId: string | null;
  isConnected: boolean;
  isLoading: boolean;
  createWallet: () => Promise<void>;
  disconnect: () => void;
}

const CircleWalletContext = createContext<CircleWalletContextType | undefined>(undefined);

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const [sdk, setSdk] = useState<W3SSdk | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize SDK
    const w3s = new W3SSdk();
    w3s.setAppSettings({
      appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '',
    });
    setSdk(w3s);
  }, []);

  const createWallet = async () => {
    if (!sdk) return;
    setIsLoading(true);
    try {
      // Generate unique user ID for each wallet creation (for testing)
      const userId = `test_user_qa_${Date.now()}`;

      // 1. Request Challenge from Backend
      const response = await fetch('/api/circle/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_challenge', userId }) // Dynamic User ID
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
        // 2. Set SDK authentication with userToken and encryptionKey
        sdk.setAuthentication({
          userToken,
          encryptionKey
        });

        // 3. Execute Challenge with SDK (User sets PIN)
        sdk.execute(challengeId, (error, result) => {
          if (error) {
            console.error("SDK Error:", error);
            alert("Failed to create wallet: " + error.message);
            setIsLoading(false);
            return;
          }

          if (result) {
            console.log("Wallet Created:", result);
            const resData = result as any;
            setWalletId(resData.data?.walletId);
            setIsLoading(false);
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
    setWalletId(null);
  };

  return (
    <CircleWalletContext.Provider value={{
      sdk,
      walletId,
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
