'use client';

import { useState, useEffect } from 'react';
import { useCircleWallet } from '../context/CircleWalletContext';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { SUPPORTED_ASSETS } from '../config/assets';

interface CircleWalletProps {
  onPay?: (txHash?: string) => void;
  amount?: string;
  symbol?: string;
  
  // Legacy Transfer (Pass recipientAddress)
  recipientAddress?: string;
  
  // Contract Execution (Pass contractAddress + callData)
  contractAddress?: string;
  callData?: string;
}

export function CircleWallet({ onPay, amount, symbol, recipientAddress, contractAddress, callData }: CircleWalletProps) {
  const { walletId, isConnected, isLoading, createWallet, sdk } = useCircleWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    if (walletId) {
        fetch(`/api/circle/wallet/balance?id=${walletId}`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.tokenBalances) {
                    // Find balance matching the requested symbol
                    const token = data.data.tokenBalances.find((t: any) => 
                        t.token.symbol === symbol || (symbol === 'USDC' && t.token.symbol === 'USDC')
                    );
                    
                    if (token) {
                        setBalance(token.amount);
                        setTokenId(token.token.id);
                    } else {
                        setBalance('0.00');
                    }
                }
            })
            .catch(err => console.error("Failed to fetch circle balance", err));
    }
  }, [walletId, symbol]);

  const handleTransfer = async () => {
    const hasTransferTarget = recipientAddress;
    const hasContractTarget = contractAddress && callData;

    if (!sdk || !walletId || !amount || (!hasTransferTarget && !hasContractTarget)) {
        console.error("Missing transfer requirements", { sdk: !!sdk, walletId, amount, hasTransferTarget, hasContractTarget });
        alert("Payment configuration is incomplete.");
        return;
    }

    setIsTransferring(true);
    try {
        // 1. Get User ID from localStorage (needed for backend)
        const userId = localStorage.getItem('circle_user_id');
        if (!userId) throw new Error("User ID not found");

        let response;
        
        if (hasContractTarget) {
            // CONTRACT EXECUTION (Router/Vault)
            response = await fetch('/api/circle/wallet/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId,
                    contractAddress,
                    callData,
                    userId,
                    amount: '0' // No native token sent usually for stablecoin payments
                })
            });
        } else {
            // LEGACY TOKEN TRANSFER
            if (!tokenId) throw new Error("Token ID not found for transfer");
            
            response = await fetch('/api/circle/wallet/transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletId,
                    destinationAddress: recipientAddress,
                    amount,
                    tokenId,
                    userId
                })
            });
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Transaction failed");

        const challengeId = data.challengeId;
        if (!challengeId) throw new Error("No challenge ID returned");

        // Update SDK authentication with the new token used for the request
        if (data.userToken && data.encryptionKey) {
            localStorage.setItem('circle_user_token', data.userToken);
            localStorage.setItem('circle_encryption_key', data.encryptionKey);
            
            sdk.setAuthentication({
                userToken: data.userToken,
                encryptionKey: data.encryptionKey
            });
        }

        // 3. Execute Challenge (PIN)
        sdk.execute(challengeId, (error, result) => {
            setIsTransferring(false);
            if (error) {
                console.error("Challenge Error:", error);
                alert(`Transaction failed: ${error.message}`);
                return;
            }

            if (result) {
                console.log("Transaction Initiated:", result);
                
                // Poll for transaction hash
                const pollForTxHash = async () => {
                    try {
                        const userId = localStorage.getItem('circle_user_id');
                        if (!userId) return null;

                        // Poll for a few times
                        for (let i = 0; i < 15; i++) { // Increased attempts
                            const userToken = localStorage.getItem('circle_user_token');
                            const headers: Record<string, string> = {};
                            if (userToken) headers['X-User-Token'] = userToken;

                            // Pass userId query param as expected by the backend
                            const txRes = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });
                            
                            if (!txRes.ok) {
                                console.error("Failed to fetch transactions", await txRes.text());
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                continue;
                            }

                            const txData = await txRes.json();
                            
                            if (txData?.data?.transactions?.length > 0) {
                                // Ideally we match by challengeId if available in tx data, or just take latest
                                const latestTx = txData.data.transactions[0];
                                if (latestTx.txHash) {
                                    return latestTx.txHash;
                                }
                            }
                            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
                        }
                    } catch (e) {
                        console.error("Polling error", e);
                    }
                    return null;
                };

                // 4. Notify Parent with Hash (if found)
                if (onPay) {
                    setIsTransferring(true); // Keep showing processing while polling
                    pollForTxHash().then(txHash => {
                        setIsTransferring(false);
                        onPay(txHash || undefined);
                    });
                }
            }
        });

    } catch (error) {
        console.error("Transaction Error:", error);
        alert("Failed to initiate transaction. See console for details.");
        setIsTransferring(false);
    }
  };

  if (isConnected && walletId) {
    return (
      <Card className="bg-zinc-900 text-white border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-sm">Circle Wallet</h3>
              <p className="text-xs text-zinc-400 font-mono">{walletId}</p>
            </div>
          </div>
          <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
            Active
          </span>
        </div>
        
        <div className="bg-zinc-800/50 p-3 rounded-lg mb-4">
          <div className="text-xs text-zinc-400 mb-1">{symbol || 'USDC'} Balance</div>
          <div className="font-mono text-lg">{balance !== null ? balance : 'Loading...'}</div>
        </div>

        {onPay && (
            <Button 
                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={handleTransfer}
                isLoading={isTransferring}
                disabled={!tokenId || !balance || parseFloat(balance) < parseFloat(amount || '0')}
            >
                {isTransferring ? 'Processing...' : 'Pay Now'}
            </Button>
        )}
        {(!tokenId || (balance && parseFloat(balance) < parseFloat(amount || '0'))) && (
            <p className="text-xs text-red-400 text-center mt-2">
                Insufficient funds or token not found.
            </p>
        )}
      </Card>
    );
  }

  return (
    <Card title="Connect Wallet" description="Initialize your Circle Programmable Wallet to get started.">
      <div className="space-y-6 text-center py-4">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-zinc-900 mb-2">Secure & Programmable</h3>
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">
            Create a user-controlled wallet with PIN recovery. No seed phrases required.
          </p>
        </div>

        <Button 
          className="w-full" 
          size="lg" 
          onClick={createWallet}
          isLoading={isLoading}
        >
          {isLoading ? 'Initializing SDK...' : 'Create Circle Wallet'}
        </Button>
        
        <p className="text-xs text-zinc-400">
          Powered by Circle Web3 Services
        </p>
      </div>
    </Card>
  );
}
