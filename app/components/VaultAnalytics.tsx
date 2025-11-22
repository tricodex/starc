import { Card } from './ui/Card';
import { Tooltip } from './ui/Tooltip';

export function VaultAnalytics() {
  return (
    <div className="space-y-6">
      <Card title="Protocol Health" description="Real-time risk metrics">
        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="The ratio of assets held in the vault vs. total liabilities.">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Collateralization Ratio</span>
              </Tooltip>
              <span className="text-sm font-bold text-emerald-600">100.1%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '100%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="Percentage of the daily deposit limit currently utilized.">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Daily Limit Usage</span>
              </Tooltip>
              <span className="text-sm font-bold text-indigo-600">45.2%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '45.2%' }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <Tooltip content="Current deviation of the oracle price from the peg (1.00).">
                <span className="text-sm font-medium text-zinc-500 cursor-help border-b border-dotted border-zinc-400">Peg Deviation</span>
              </Tooltip>
              <span className="text-sm font-bold text-zinc-900">0.02%</span>
            </div>
            <div className="w-full bg-zinc-100 rounded-full h-2">
              <div className="bg-zinc-900 h-2 rounded-full" style={{ width: '2%' }}></div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 mb-1">Total Volume (24h)</div>
          <div className="text-xl font-bold text-zinc-900">$2.4M</div>
          <div className="text-xs text-emerald-600 mt-1">+12.5%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-zinc-200">
          <div className="text-xs text-zinc-500 mb-1">Active Merchants</div>
          <div className="text-xl font-bold text-zinc-900">142</div>
          <div className="text-xs text-emerald-600 mt-1">+5 new</div>
        </div>
      </div>
    </div>
  );
}
