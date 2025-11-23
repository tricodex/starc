'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { LIQUIDITY_MANAGER_ADDRESS } from '../config/assets';
import { LIQUIDITY_MANAGER_ABI } from '../config/abis';
import { Card } from './ui/Card';

export function LiquidityWidget() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<'provide' | 'positions' | 'swap'>('provide');

  // Form State
  const [usdcAmount, setUsdcAmount] = useState('');
  const [eurcAmount, setEurcAmount] = useState('');
  const [swapAmount, setSwapAmount] = useState('');
  const [isUsdcToEurc, setIsUsdcToEurc] = useState(true);

  // Write Hooks
  const { writeContract: writeProvide, data: provideHash, isPending: isProvidePending } = useWriteContract();
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawPending } = useWriteContract();
  const { writeContract: writeSwap, data: swapHash, isPending: isSwapPending } = useWriteContract();

  // Wait Hooks
  const { isLoading: isProvideConfirming } = useWaitForTransactionReceipt({ hash: provideHash });
  const { isLoading: isWithdrawConfirming } = useWaitForTransactionReceipt({ hash: withdrawHash });
  const { isLoading: isSwapConfirming } = useWaitForTransactionReceipt({ hash: swapHash });

  // Read Hooks
  const { data: providerPositions } = useReadContract({
    address: LIQUIDITY_MANAGER_ADDRESS,
    abi: LIQUIDITY_MANAGER_ABI,
    functionName: 'getProviderPositions',
    args: [address as `0x${string}`],
    query: { enabled: !!address && activeTab === 'positions' },
  });

  const { data: totalLiquidity } = useReadContract({
    address: LIQUIDITY_MANAGER_ADDRESS,
    abi: LIQUIDITY_MANAGER_ABI,
    functionName: 'getTotalLiquidity',
  });

  const handleProvide = () => {
    if (!usdcAmount || !eurcAmount) return;
    writeProvide({
      address: LIQUIDITY_MANAGER_ADDRESS,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'provideLiquidity',
      args: [parseUnits(usdcAmount, 6), parseUnits(eurcAmount, 6)],
    });
  };

  const handleWithdraw = (positionId: bigint) => {
    writeWithdraw({
      address: LIQUIDITY_MANAGER_ADDRESS,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'withdrawLiquidity',
      args: [positionId],
    });
  };

  const handleSwap = () => {
    if (!swapAmount) return;
    writeSwap({
      address: LIQUIDITY_MANAGER_ADDRESS,
      abi: LIQUIDITY_MANAGER_ABI,
      functionName: 'executeTrade',
      args: [isUsdcToEurc, parseUnits(swapAmount, 6), BigInt(0)], // 0 minAmountOut for simulation
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('provide')}
          className={`pb-2 px-1 ${activeTab === 'provide' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          Provide Liquidity
        </button>
        <button
          onClick={() => setActiveTab('positions')}
          className={`pb-2 px-1 ${activeTab === 'positions' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          My Positions
        </button>
        <button
          onClick={() => setActiveTab('swap')}
          className={`pb-2 px-1 ${activeTab === 'swap' ? 'border-b-2 border-indigo-600 text-indigo-600 font-medium' : 'text-zinc-500'}`}
        >
          Swap (Sim)
        </button>
      </div>

      {activeTab === 'provide' && (
        <Card className="p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Provide Liquidity (Simulation)</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">USDC Amount</label>
                <input
                  type="number"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">EURC Amount</label>
                <input
                  type="number"
                  value={eurcAmount}
                  onChange={(e) => setEurcAmount(e.target.value)}
                  className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="1000"
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button
                onClick={handleProvide}
                disabled={isProvidePending || isProvideConfirming}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isProvidePending || isProvideConfirming ? 'Providing...' : 'Provide Liquidity'}
              </button>
            </div>
            <p className="text-xs text-zinc-500 text-center mt-2">
              Note: This is a simulation contract. No actual tokens are transferred.
            </p>
          </div>
        </Card>
      )}

      {activeTab === 'positions' && (
        <div className="space-y-4">
          {providerPositions && providerPositions.length > 0 ? (
            providerPositions.map((positionId) => (
              <PositionCard key={positionId.toString()} positionId={positionId} onWithdraw={() => handleWithdraw(positionId)} />
            ))
          ) : (
            <div className="text-center py-8 text-zinc-500">No active positions found.</div>
          )}
        </div>
      )}

      {activeTab === 'swap' && (
        <Card className="p-6 max-w-xl mx-auto">
          <h3 className="text-lg font-bold text-zinc-900 mb-4">Swap Simulation</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Amount In</label>
              <input
                type="number"
                value={swapAmount}
                onChange={(e) => setSwapAmount(e.target.value)}
                className="w-full rounded-lg border-zinc-300 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="100"
              />
            </div>
            
            <div className="flex items-center justify-between bg-zinc-50 p-3 rounded-lg">
              <span className={`font-medium ${isUsdcToEurc ? 'text-indigo-600' : 'text-zinc-500'}`}>USDC</span>
              <button
                onClick={() => setIsUsdcToEurc(!isUsdcToEurc)}
                className="p-2 rounded-full hover:bg-zinc-200"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
              <span className={`font-medium ${!isUsdcToEurc ? 'text-indigo-600' : 'text-zinc-500'}`}>EURC</span>
            </div>

            <div className="pt-4">
              <button
                onClick={handleSwap}
                disabled={isSwapPending || isSwapConfirming}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSwapPending || isSwapConfirming ? 'Swapping...' : `Swap ${isUsdcToEurc ? 'USDC to EURC' : 'EURC to USDC'}`}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function PositionCard({ positionId, onWithdraw }: { positionId: bigint, onWithdraw: () => void }) {
  const { data: position } = useReadContract({
    address: LIQUIDITY_MANAGER_ADDRESS,
    abi: LIQUIDITY_MANAGER_ABI,
    functionName: 'getPosition',
    args: [positionId],
  });

  if (!position) return <Card className="p-4 animate-pulse"><div className="h-20 bg-zinc-100 rounded"></div></Card>;

  const [provider, usdcAmount, eurcAmount, timestamp, active, rewards] = position;

  if (!active) return null;

  return (
    <Card className="p-6 flex justify-between items-center">
      <div>
        <div className="text-sm text-zinc-500 mb-1">Position #{positionId.toString()}</div>
        <div className="font-medium text-zinc-900">
          Liquidity Provided
        </div>
        <div className="text-sm text-zinc-500 mt-1">
          {formatUnits(usdcAmount, 6)} USDC + {formatUnits(eurcAmount, 6)} EURC
        </div>
        <div className="text-xs text-green-600 mt-2">
          Rewards: {formatUnits(rewards, 6)}
        </div>
      </div>
      
      <div>
        <button
          onClick={onWithdraw}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Withdraw
        </button>
      </div>
    </Card>
  );
}
