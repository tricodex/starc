'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { STREAMING_PAYMENTS_ADDRESS, USDC_ADDRESS } from '../config/assets';
import { STREAMING_PAYMENTS_ABI } from '../config/abis';
import { Card } from './ui/Card';
import { erc20Abi } from 'viem';

export function StreamingWidget() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'create' | 'incoming' | 'outgoing'>('create');

  // Form State
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('30'); // Days
  const [isSubscription, setIsSubscription] = useState(false);

  // Write Hooks
  const { writeContract: writeStream, data: streamHash, isPending: isStreamPending } = useWriteContract();
  const { writeContract: writeApprove, data: approveHash, isPending: isApprovePending } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
  const { writeContract: writeCancel, data: cancelHash, isPending: isCancelPending } = useWriteContract();

  // Wait Hooks
  const { isLoading: isStreamConfirming, isSuccess: isStreamSuccess } = useWaitForTransactionReceipt({ hash: streamHash });
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Read Hooks
  const { data: incomingStreams } = useReadContract({
    address: STREAMING_PAYMENTS_ADDRESS,
    abi: STREAMING_PAYMENTS_ABI,
    functionName: 'getRecipientStreams',
    args: [address as `0x${string}`],
    query: { enabled: !!address && activeTab === 'incoming' },
  });

  const { data: outgoingStreams } = useReadContract({
    address: STREAMING_PAYMENTS_ADDRESS,
    abi: STREAMING_PAYMENTS_ABI,
    functionName: 'getPayerStreams',
    args: [address as `0x${string}`],
    query: { enabled: !!address && activeTab === 'outgoing' },
  });

  // Helper to calculate rate
  const calculateRate = () => {
    if (!amount || !duration) return BigInt(0);
    const totalAmount = parseUnits(amount, 6); // USDC has 6 decimals
    const durationSeconds = BigInt(duration) * BigInt(24 * 60 * 60);
    return totalAmount / durationSeconds;
  };

  const handleCreateStream = async () => {
    if (!address || !recipient || !amount) return;
    
    const rate = calculateRate();
    const durationSeconds = BigInt(duration) * BigInt(24 * 60 * 60);
    const totalAmount = rate * durationSeconds;

    // First Approve
    if (!isApproveSuccess) {
      writeApprove({
        address: USDC_ADDRESS,
        abi: erc20Abi,
        functionName: 'approve',
        args: [STREAMING_PAYMENTS_ADDRESS, totalAmount],
      });
      return;
    }

    // Then Create
    writeStream({
      address: STREAMING_PAYMENTS_ADDRESS,
      abi: STREAMING_PAYMENTS_ABI,
      functionName: 'createStream',
      args: [recipient as `0x${string}`, rate, durationSeconds, isSubscription],
    });
  };

  const handleWithdraw = (streamId: bigint) => {
    writeWithdraw({
      address: STREAMING_PAYMENTS_ADDRESS,
      abi: STREAMING_PAYMENTS_ABI,
      functionName: 'withdrawFromStream',
      args: [streamId, BigInt(0)], // 0 means withdraw all available
    });
  };

  const handleCancel = (streamId: bigint) => {
    writeCancel({
      address: STREAMING_PAYMENTS_ADDRESS,
      abi: STREAMING_PAYMENTS_ABI,
      functionName: 'cancelStream',
      args: [streamId],
    });
  };

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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Recipient Address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="0x..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Total Amount (USDC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Duration (Days)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="30"
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isSubscription}
                onChange={(e) => setIsSubscription(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-zinc-900">
                Auto-renewable Subscription
              </label>
            </div>

            <div className="pt-4">
              {!isApproveSuccess ? (
                <button
                  onClick={handleCreateStream}
                  disabled={isApprovePending || isApproveConfirming}
                  className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isApprovePending || isApproveConfirming ? 'Approving USDC...' : 'Approve USDC'}
                </button>
              ) : (
                <button
                  onClick={handleCreateStream}
                  disabled={isStreamPending || isStreamConfirming}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {isStreamPending || isStreamConfirming ? 'Creating Stream...' : 'Create Stream'}
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'incoming' && (
        <div className="space-y-4">
          {incomingStreams && incomingStreams.length > 0 ? (
            incomingStreams.map((streamId) => (
              <StreamCard key={streamId.toString()} streamId={streamId} type="incoming" onWithdraw={() => handleWithdraw(streamId)} />
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500">No incoming streams found.</div>
          )}
        </div>
      )}

      {activeTab === 'outgoing' && (
        <div className="space-y-4">
          {outgoingStreams && outgoingStreams.length > 0 ? (
            outgoingStreams.map((streamId) => (
              <StreamCard key={streamId.toString()} streamId={streamId} type="outgoing" onCancel={() => handleCancel(streamId)} />
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500">No outgoing streams found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function StreamCard({ streamId, type, onWithdraw, onCancel }: { streamId: bigint, type: 'incoming' | 'outgoing', onWithdraw?: () => void, onCancel?: () => void }) {
  const { data: stream } = useReadContract({
    address: STREAMING_PAYMENTS_ADDRESS,
    abi: STREAMING_PAYMENTS_ABI,
    functionName: 'getStream',
    args: [streamId],
  });

  const { data: balance } = useReadContract({
    address: STREAMING_PAYMENTS_ADDRESS,
    abi: STREAMING_PAYMENTS_ABI,
    functionName: 'balanceOf',
    args: [streamId],
    query: { refetchInterval: 1000 }, // Refresh every second for live effect
  });

  if (!stream) return <Card className="p-4 animate-pulse"><div className="h-20 bg-zinc-100 rounded"></div></Card>;

  const [payer, recipient, rate, start, stop, withdrawn, active] = stream;
  const isEnded = BigInt(Date.now() / 1000) > stop;

  return (
    <Card className="p-6 flex justify-between items-center">
      <div>
        <div className="text-sm text-zinc-500 mb-1">Stream #{streamId.toString()}</div>
        <div className="font-medium text-zinc-900">
          {type === 'incoming' ? `From: ${payer.slice(0,6)}...${payer.slice(-4)}` : `To: ${recipient.slice(0,6)}...${recipient.slice(-4)}`}
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          Rate: {formatUnits(rate, 6)} USDC/sec
        </div>
        <div className="text-xs text-zinc-400 mt-2">
          {active ? (isEnded ? 'Completed' : 'Streaming...') : 'Cancelled'}
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-2xl font-bold text-indigo-600 font-mono">
          {balance ? formatUnits(balance, 6) : '0.00'} USDC
        </div>
        <div className="text-xs text-zinc-500 mb-3">Available to Withdraw</div>
        
        {type === 'incoming' && (
          <button
            onClick={onWithdraw}
            disabled={!balance || balance === BigInt(0)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
        
        {type === 'outgoing' && active && (
          <button
            onClick={onCancel}
            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100"
          >
            Cancel Stream
          </button>
        )}
      </div>
    </Card>
  );
}
