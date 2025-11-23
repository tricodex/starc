'use client';

import { useState, useEffect } from 'react';
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { STREAMING_PAYMENTS_ADDRESS, USDC_ADDRESS } from '../config/assets';
import { STREAMING_PAYMENTS_ABI } from '../config/abis';
import { Card } from './ui/Card';
import { erc20Abi } from 'viem';
import { W3SSdk } from '@circle-fin/w3s-pw-web-sdk';

export function StreamingWidget() {
  const [activeTab, setActiveTab] = useState<'create' | 'incoming' | 'outgoing'>('create');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [sdk, setSdk] = useState<W3SSdk | null>(null);

  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30'); // Days
  const [isSubscription, setIsSubscription] = useState(false);

  // Transaction State
  const [isProcessing, setIsProcessing] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'creating' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(true);

  // Stream Data
  const [incomingStreams, setIncomingStreams] = useState<bigint[]>([]);
  const [outgoingStreams, setOutgoingStreams] = useState<bigint[]>([]);

  // Initialize Circle SDK and restore wallet
  useEffect(() => {
    // Initialize SDK
    const w3s = new W3SSdk();
    w3s.setAppSettings({
      appId: process.env.NEXT_PUBLIC_CIRCLE_APP_ID || '',
    });
    setSdk(w3s);

    // Restore wallet from localStorage
    const storedWalletId = localStorage.getItem('circle_wallet_id');
    const storedWalletAddress = localStorage.getItem('circle_wallet_address');
    
    if (storedWalletId && storedWalletAddress) {
      setWalletId(storedWalletId);
      setWalletAddress(storedWalletAddress);
      console.log('Restored wallet from localStorage:', { walletId: storedWalletId, walletAddress: storedWalletAddress });
    }
  }, []);

  // Fetch streams when tab changes
  useEffect(() => {
    if (!walletAddress) return;

    const fetchStreams = async () => {
      try {
        if (activeTab === 'incoming') {
          // Fetch incoming streams via RPC
          const response = await fetch('/api/rpc/read-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: STREAMING_PAYMENTS_ADDRESS,
              abi: STREAMING_PAYMENTS_ABI,
              functionName: 'getRecipientStreams',
              args: [walletAddress],
            }),
          });
          const data = await response.json();
          if (data.result) setIncomingStreams(data.result.map((id: string) => BigInt(id)));
        } else if (activeTab === 'outgoing') {
          // Fetch outgoing streams via RPC
          const response = await fetch('/api/rpc/read-contract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: STREAMING_PAYMENTS_ADDRESS,
              abi: STREAMING_PAYMENTS_ABI,
              functionName: 'getPayerStreams',
              args: [walletAddress],
            }),
          });
          const data = await response.json();
          if (data.result) setOutgoingStreams(data.result.map((id: string) => BigInt(id)));
        }
      } catch (error) {
        console.error('Error fetching streams:', error);
      }
    };

    fetchStreams();
  }, [activeTab, walletAddress]);

  // Helper to calculate rate
  const calculateRate = () => {
    if (!amount || !duration) return BigInt(0);
    const totalAmount = parseUnits(amount, 6); // USDC has 6 decimals
    const durationSeconds = BigInt(duration) * BigInt(24 * 60 * 60);
    return totalAmount / durationSeconds;
  };

  const handleApprove = async () => {
    if (!walletId || !sdk) return;

    setIsProcessing(true);
    setTxStatus('approving');
    setErrorMessage(null);

    try {
      const rate = calculateRate();
      const durationSeconds = BigInt(duration) * BigInt(24 * 60 * 60);
      const totalAmount = rate * durationSeconds;

      // Encode approve function call
      const callData = encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [STREAMING_PAYMENTS_ADDRESS, totalAmount],
      });

      // Get userId for backend call
      const userId = localStorage.getItem('circle_user_id');

      // Call backend to initiate contract execution
      const response = await fetch('/api/circle/wallet/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          userId,
          contractAddress: USDC_ADDRESS,
          callData,
          feeLevel: 'MEDIUM',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate approval');
      }

      // Update SDK authentication with new credentials
      if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        sdk.setAuthentication({
          userToken: data.userToken,
          encryptionKey: data.encryptionKey,
        });
      }

      // Execute challenge (PIN prompt)
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error('Challenge execution error:', error);
          setErrorMessage(error.message || 'Failed to execute challenge');
          setTxStatus('error');
          setIsProcessing(false);
          return;
        }

        if (result) {
          // Poll for transaction hash
          const hash = await pollForTxHash(userId!);
          if (hash) {
            setTxHash(hash);
            setNeedsApproval(false);
            setTxStatus('idle');
          }
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      console.error('Approval error:', error);
      setErrorMessage(error.message || 'Approval failed');
      setTxStatus('error');
      setIsProcessing(false);
    }
  };

  const handleCreateStream = async () => {
    if (!walletId || !sdk || !recipient || !amount) return;

    setIsProcessing(true);
    setTxStatus('creating');
    setErrorMessage(null);

    try {
      const rate = calculateRate();
      const durationSeconds = BigInt(duration) * BigInt(24 * 60 * 60);

      // Encode createStream function call
      const callData = encodeFunctionData({
        abi: STREAMING_PAYMENTS_ABI,
        functionName: 'createStream',
        args: [recipient as `0x${string}`, rate, durationSeconds, isSubscription],
      });

      // Get userId for backend call
      const userId = localStorage.getItem('circle_user_id');

      // Call backend to initiate contract execution
      const response = await fetch('/api/circle/wallet/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          userId,
          contractAddress: STREAMING_PAYMENTS_ADDRESS,
          callData,
          feeLevel: 'MEDIUM',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate stream creation');
      }

      // Update SDK authentication with new credentials
      if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        sdk.setAuthentication({
          userToken: data.userToken,
          encryptionKey: data.encryptionKey,
        });
      }

      // Execute challenge (PIN prompt)
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error('Challenge execution error:', error);
          setErrorMessage(error.message || 'Failed to execute challenge');
          setTxStatus('error');
          setIsProcessing(false);
          return;
        }

        if (result) {
          // Poll for transaction hash
          const hash = await pollForTxHash(userId!);
          if (hash) {
            setTxHash(hash);
            setTxStatus('success');
            // Reset form
            setRecipient('');
            setAmount('');
            setDuration('30');
            setIsSubscription(false);
            setNeedsApproval(true);
          }
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      console.error('Stream creation error:', error);
      setErrorMessage(error.message || 'Stream creation failed');
      setTxStatus('error');
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (streamId: bigint) => {
    if (!walletId || !sdk) return;

    setIsProcessing(true);

    try {
      // Encode withdrawFromStream function call
      const callData = encodeFunctionData({
        abi: STREAMING_PAYMENTS_ABI,
        functionName: 'withdrawFromStream',
        args: [streamId, BigInt(0)], // 0 means withdraw all available
      });

      const userId = localStorage.getItem('circle_user_id');

      const response = await fetch('/api/circle/wallet/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          userId,
          contractAddress: STREAMING_PAYMENTS_ADDRESS,
          callData,
          feeLevel: 'MEDIUM',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate withdrawal');
      }

      // Update SDK authentication
      if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        sdk.setAuthentication({
          userToken: data.userToken,
          encryptionKey: data.encryptionKey,
        });
      }

      // Execute challenge
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error('Withdrawal error:', error);
          alert('Withdrawal failed: ' + (error.message || 'Unknown error'));
          setIsProcessing(false);
          return;
        }

        if (result) {
          const hash = await pollForTxHash(userId!);
          if (hash) {
            alert('Withdrawal successful! Tx: ' + hash);
          }
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      alert('Withdrawal failed: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    }
  };

  const handleCancel = async (streamId: bigint) => {
    if (!walletId || !sdk) return;

    setIsProcessing(true);

    try {
      // Encode cancelStream function call
      const callData = encodeFunctionData({
        abi: STREAMING_PAYMENTS_ABI,
        functionName: 'cancelStream',
        args: [streamId],
      });

      const userId = localStorage.getItem('circle_user_id');

      const response = await fetch('/api/circle/wallet/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletId,
          userId,
          contractAddress: STREAMING_PAYMENTS_ADDRESS,
          callData,
          feeLevel: 'MEDIUM',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate cancellation');
      }

      // Update SDK authentication
      if (data.userToken && data.encryptionKey) {
        localStorage.setItem('circle_user_token', data.userToken);
        localStorage.setItem('circle_encryption_key', data.encryptionKey);
        sdk.setAuthentication({
          userToken: data.userToken,
          encryptionKey: data.encryptionKey,
        });
      }

      // Execute challenge
      sdk.execute(data.challengeId, async (error: any, result: any) => {
        if (error) {
          console.error('Cancellation error:', error);
          alert('Cancellation failed: ' + (error.message || 'Unknown error'));
          setIsProcessing(false);
          return;
        }

        if (result) {
          const hash = await pollForTxHash(userId!);
          if (hash) {
            alert('Stream cancelled! Tx: ' + hash);
          }
          setIsProcessing(false);
        }
      });
    } catch (error: any) {
      console.error('Cancellation error:', error);
      alert('Cancellation failed: ' + (error.message || 'Unknown error'));
      setIsProcessing(false);
    }
  };

  // Poll for transaction hash after challenge execution
  const pollForTxHash = async (userId: string): Promise<string | null> => {
    const userToken = localStorage.getItem('circle_user_token');
    
    for (let i = 0; i < 15; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      try {
        const headers: Record<string, string> = {};
        if (userToken) headers['X-User-Token'] = userToken;

        const res = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { 
          headers 
        });
        
        const data = await res.json();
        
        if (data?.data?.transactions?.length > 0) {
          const latestTx = data.data.transactions[0];
          if (latestTx.txHash) {
            return latestTx.txHash;
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }
    
    return null;
  };

  if (!walletAddress) {
    return (
      <Card className="p-8 text-center">
        <div className="text-zinc-500 mb-4">Please connect your Circle Wallet to use Streaming Payments</div>
        <div className="text-sm text-zinc-400">Go to the Profile tab to create or restore a wallet</div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`pb-2 px-1 ${activeTab === 'create' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          Create Stream
        </button>
        <button
          onClick={() => setActiveTab('incoming')}
          className={`pb-2 px-1 ${activeTab === 'incoming' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          Incoming
        </button>
        <button
          onClick={() => setActiveTab('outgoing')}
          className={`pb-2 px-1 ${activeTab === 'outgoing' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          Outgoing
        </button>
      </div>

      {activeTab === 'create' && (
        <Card className="p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Create Payment Stream</h3>
          
          {txStatus === 'success' && txHash && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800 font-medium mb-2">✓ Stream Created Successfully!</div>
              <a
                href={`https://testnet.arcscan.app/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green-600 hover:underline"
              >
                View on Explorer →
              </a>
            </div>
          )}

          {txStatus === 'error' && errorMessage && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800 font-medium">Error: {errorMessage}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border"
                placeholder="0x..."
                disabled={isProcessing}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Total Amount (USDC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border"
                  placeholder="1000"
                  disabled={isProcessing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500 px-3 py-2 border"
                  placeholder="30"
                  disabled={isProcessing}
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSubscription}
                onChange={(e) => setIsSubscription(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isProcessing}
              />
              <label className="ml-2 block text-sm text-zinc-900">
                Auto-renewable Subscription
              </label>
            </div>

            <div className="pt-4">
              {needsApproval ? (
                <button
                  onClick={handleApprove}
                  disabled={isProcessing || !recipient || !amount}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txStatus === 'approving' ? 'Approving USDC...' : 'Approve USDC'}
                </button>
              ) : (
                <button
                  onClick={handleCreateStream}
                  disabled={isProcessing || !recipient || !amount}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {txStatus === 'creating' ? 'Creating Stream...' : 'Create Stream'}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {incomingStreams.length > 0 ? (
            incomingStreams.map((streamId) => (
              <StreamCard 
                key={streamId.toString()} 
                streamId={streamId} 
                type="incoming" 
                onWithdraw={() => handleWithdraw(streamId)}
                isProcessing={isProcessing}
              />
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500">No incoming streams found.</div>
          )}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          {outgoingStreams.length > 0 ? (
            outgoingStreams.map((streamId) => (
              <StreamCard 
                key={streamId.toString()} 
                streamId={streamId} 
                type="outgoing" 
                onCancel={() => handleCancel(streamId)}
                isProcessing={isProcessing}
              />
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500">No outgoing streams found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StreamCard({ 
  streamId, 
  type, 
  onWithdraw, 
  onCancel,
  isProcessing 
}: { 
  streamId: bigint;
  type: 'incoming' | 'outgoing';
  onWithdraw?: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
}) {
  const [stream, setStream] = useState<any>(null);
  const [balance, setBalance] = useState<bigint>(BigInt(0));
  const [loading, setLoading] = useState(true);

  // Fetch stream details
  useEffect(() => {
    const fetchStream = async () => {
      try {
        const response = await fetch('/api/rpc/read-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: STREAMING_PAYMENTS_ADDRESS,
            abi: STREAMING_PAYMENTS_ABI,
            functionName: 'getStream',
            args: [streamId],
          }),
        });
        const data = await response.json();
        if (data.result) {
          setStream(data.result);
        }
      } catch (error) {
        console.error('Error fetching stream:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStream();
  }, [streamId]);

  // Fetch balance every second for live effect
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch('/api/rpc/read-contract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: STREAMING_PAYMENTS_ADDRESS,
            abi: STREAMING_PAYMENTS_ABI,
            functionName: 'balanceOf',
            args: [streamId],
          }),
        });
        const data = await response.json();
        if (data.result) {
          setBalance(BigInt(data.result));
        }
      } catch (error) {
        console.error('Error fetching balance:', error);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 1000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (loading || !stream) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-zinc-100 rounded"></div>
      </Card>
    );
  }

  const [payer, recipient, rate, start, stop, withdrawn, active] = stream;
  const isEnded = BigInt(Date.now() / 1000) > BigInt(stop);

  return (
    <Card className="p-6 flex justify-between items-center">
      <div>
        <div className="text-sm text-zinc-500 mb-1">Stream #{streamId.toString()}</div>
        <div className="font-medium text-zinc-900">
          {type === 'incoming' ? `From: ${payer.slice(0,6)}...${payer.slice(-4)}` : `To: ${recipient.slice(0,6)}...${recipient.slice(-4)}`}
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          Rate: {formatUnits(BigInt(rate), 6)} USDC/sec
        </div>
        <div className="text-xs text-zinc-400 mt-2">
          {active ? (isEnded ? 'Completed' : 'Streaming...') : 'Cancelled'}
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-2xl font-bold text-indigo-600 font-mono">
          {formatUnits(balance, 6)} USDC
        </div>
        <div className="text-xs text-zinc-500 mb-3">Available to Withdraw</div>
        
        {type === 'incoming' && (
          <button
            onClick={onWithdraw}
            disabled={isProcessing || balance === BigInt(0)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Withdraw'}
          </button>
        )}
        
        {type === 'outgoing' && active && (
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Processing...' : 'Cancel Stream'}
          </button>
        )}
      </div>
    </Card>
  );
}
