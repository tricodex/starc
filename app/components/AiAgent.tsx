'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { useCircleWallet } from '../context/CircleWalletContext';
import { SUPPORTED_ASSETS } from '../config/assets';

interface AiAgentProps {
  balance: number;
  vaultBalance: number;
  walletId?: string | null;
  onAction?: (action: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  txId?: string;
}

export function AiAgent({ balance, vaultBalance, walletId, onAction }: AiAgentProps) {
  const { sdk } = useCircleWallet();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am your Starc Agent. I can help you optimize your treasury or manage your Circle Wallet.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenIds, setTokenIds] = useState<Record<string, string>>({});
  const [demoRequests, setDemoRequests] = useState<any[]>([]);
  const [merchantAddress, setMerchantAddress] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch balances to get Token IDs
  useEffect(() => {
    if (walletId) {
        fetch(`/api/circle/wallet/balance?id=${walletId}`)
            .then(res => res.json())
            .then(data => {
                if (data?.data?.tokenBalances) {
                    const ids: Record<string, string> = {};
                    data.data.tokenBalances.forEach((t: any) => {
                        // Store both exact symbol and normalized symbol (without -TESTNET suffix)
                        ids[t.token.symbol] = t.token.id;
                        // Also store normalized version for easier lookup
                        const normalizedSymbol = t.token.symbol.replace('-TESTNET', '');
                        ids[normalizedSymbol] = t.token.id;
                    });
                    console.log('Token IDs loaded:', ids);
                    setTokenIds(ids);
                }
            })
            .catch(err => console.error("Failed to fetch circle balance", err));
    }
  }, [walletId]);

  // Fetch Demo Requests
  useEffect(() => {
      fetch('/api/demo/requests')
          .then(res => res.json())
          .then(data => {
              if (data.requests) {
                  setDemoRequests(data.requests);
              }
              if (data.merchantAddress) {
                  setMerchantAddress(data.merchantAddress);
                  console.log('Merchant address loaded:', data.merchantAddress);
              }
          })
          .catch(err => console.error("Failed to fetch demo requests", err));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const executeTransfer = async (params: any) => {
    if (!walletId || !sdk) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Wallet not connected or SDK not initialized.' }]);
        return;
    }

    const { amount, token, recipient } = params;
    console.log('Transfer params:', { amount, token, recipient });
    console.log('Available tokenIds:', tokenIds);

    // Try to find token ID - first exact match, then fallback to USDC
    const tokenId = tokenIds[token] || tokenIds['USDC'] || tokenIds['USDC-TESTNET'];

    if (!tokenId) {
        const availableTokens = Object.keys(tokenIds).join(', ');
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Error: Token ID for ${token} not found. Available tokens: ${availableTokens || 'none'}. Please wait for wallet to load.`
        }]);
        return;
    }

    console.log('Using token ID:', tokenId, 'for token:', token);

    try {
        const userId = localStorage.getItem('circle_user_id');
        if (!userId) throw new Error("User ID not found");

        const response = await fetch('/api/circle/wallet/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletId,
                destinationAddress: recipient,
                amount: amount.toString(),
                tokenId,
                userId
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Transfer failed");

        if (data.challengeId) {
            // Update SDK authentication with the new token used for the request
            if (data.userToken && data.encryptionKey) {
                sdk.setAuthentication({
                    userToken: data.userToken,
                    encryptionKey: data.encryptionKey
                });
            }
            
            sdk.execute(data.challengeId, (error, result) => {
                if (error) {
                    console.error("Agent Transfer Error:", error);
                    setMessages(prev => [...prev, { role: 'assistant', content: `Transfer failed: ${error.message}` }]);
                    return;
                }
                if (result) {
                    // Polling for transaction hash
                    const pollForTxHash = async () => {
                        try {
                            const userId = localStorage.getItem('circle_user_id');
                            if (!userId) return null;

                            // Poll for a few times
                            for (let i = 0; i < 10; i++) {
                                // We need to pass the current userToken to the API route so it doesn't generate a new one
                                // and potentially invalidate our session or cause conflicts.
                                // But wait, the API route is server-side.
                                // Let's pass the user token in the headers if we have it.
                                const userToken = localStorage.getItem('circle_user_token');
                                
                                const headers: Record<string, string> = {};
                                if (userToken) {
                                    headers['X-User-Token'] = userToken;
                                }

                                const txRes = await fetch(`/api/circle/wallet/transactions?userId=${userId}`, {
                                    headers
                                });
                                
                                if (!txRes.ok) {
                                    console.error("Failed to fetch transactions", await txRes.text());
                                    await new Promise(resolve => setTimeout(resolve, 2000));
                                    continue;
                                }

                                const txData = await txRes.json();
                                
                                if (txData?.data?.transactions?.length > 0) {
                                    const latestTx = txData.data.transactions[0];
                                    // Check if this transaction matches our amount/recipient or just assume it's the latest
                                    // and check if it has a hash
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

                    pollForTxHash().then(txHash => {
                        setMessages(prev => [...prev, { 
                            role: 'assistant', 
                            content: `Transfer of ${amount} ${token} to ${recipient} initiated successfully!`,
                            txId: txHash || undefined // Only set if we found it
                        }]);
                    });
                    
                    // Refresh requests to see if they update (in a real app we'd mark them paid)
                    fetch('/api/demo/requests').then(res => res.json()).then(d => setDemoRequests(d.requests || []));
                }
            });
        }
    } catch (error: any) {
        console.error("Agent Transfer Exception:", error);
        setMessages(prev => [...prev, { role: 'assistant', content: `Failed to execute transfer: ${error.message}` }]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    const requestPayload = {
      message: userMessage,
      context: {
          balance,
          vaultBalance,
          openRequests: demoRequests, // Pass open requests to AI
          merchantAddress // Pass merchant address for payment recipient
      }
    };

    console.log('Sending chat request:', requestPayload);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      console.log('API Response Status:', response.status);
      console.log('API Response OK:', response.ok);

      const data = await response.json();
      console.log('API Response Data:', data);

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || `API returned status ${response.status}`);
      }

      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);

        // Handle Action
        if (data.action && data.action.action === 'TRANSFER') {
            await executeTransfer(data.action.params);
        }
      } else {
        console.error('No response field in data:', data);
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('Failed to chat:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the Starc network right now. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[600px] flex flex-col border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 flex items-center gap-3 p-6 border-b border-indigo-100 bg-white/50 backdrop-blur-sm">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm border border-zinc-100 overflow-hidden">
           <img src="/logo.png" alt="Starc Agent" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-zinc-900 font-display">Starc Agent</h3>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${walletId ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
            <span className="text-xs text-zinc-500 font-medium">
              {walletId ? 'Wallet Connected' : 'Wallet Disconnected'} • Gemini 2.5 Flash
            </span>
          </div>
        </div>
        {demoRequests.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-zinc-500">Open Requests</div>
            <div className="text-lg font-bold text-indigo-600">{demoRequests.length}</div>
          </div>
        )}
      </div>

      {/* Open Requests Panel - Fixed when present */}
      {demoRequests.length > 0 && (
        <div className="flex-shrink-0 border-b border-indigo-100 bg-indigo-50/50 px-6 py-3">
          <div className="text-xs font-semibold text-indigo-900 uppercase tracking-wider mb-2">
            Pending Payment Requests
          </div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {demoRequests.map((req: any) => (
              <div
                key={req.id}
                className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs border border-indigo-100"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-zinc-500">{req.id.slice(0, 8)}</span>
                  <span className="font-semibold text-zinc-900">${parseFloat(req.amount).toFixed(2)} {req.currency}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                  {req.status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-indigo-600">
            💡 Try asking: "Pay all requests" or "Pay request {demoRequests[0]?.id.slice(0, 8)}"
          </div>
        </div>
      )}

      {/* Chat Area - Flexible, scrollable */}
      <div className="flex-1 overflow-y-auto space-y-4 p-6 custom-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-br-none' 
                : 'bg-white border border-zinc-100 text-zinc-700 rounded-bl-none'}
            `}>
              {msg.content}
            </div>
            {msg.txId && msg.txId !== 'pending' && (
                <a 
                    href={`https://testnet.arcscan.app/tx/${msg.txId}`}  
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline mt-1 ml-2"
                >
                    View Transaction
                </a>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-zinc-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
              <div className="flex gap-1.5">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Sticky to bottom, fixed height */}
      <div className="flex-shrink-0 p-6 bg-white/80 backdrop-blur-md border-t border-indigo-50">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !(!walletId || isLoading) && handleSend()}
            placeholder={walletId ? "Ask about yield, bridging, or automation..." : "Connect Circle Wallet to chat"}
            className="w-full pl-4 pr-12 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed"
            disabled={!walletId || isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!walletId || isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        {!walletId && (
          <div className="text-center mt-2">
            <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
              ⚠️ Wallet Connection Required
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
