'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

interface PaymentRequest {
  id: string;
  amount: string;
  currency: string;
  status: string;
  createdAt: string;
}

export function DemoRequests() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/demo/requests');
      const data = await res.json();
      if (data.requests) {
        setRequests(data.requests);
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await fetch('/api/demo/seed', { method: 'POST' });
      await fetchRequests();
    } catch (error) {
      console.error('Failed to seed:', error);
    } finally {
      setIsSeeding(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Poll every 5 seconds to see updates (e.g. if agent pays)
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card title="Demo Payment Requests">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-zinc-500">
            Generate small requests (0.01 USDC) for the Agent to pay.
          </p>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleSeed}
            isLoading={isSeeding}
          >
            Generate Requests
          </Button>
        </div>

        <div className="border border-zinc-100 rounded-lg overflow-hidden">
          {requests.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No pending requests. Click "Generate" to start.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-500 font-medium border-b border-zinc-100">
                <tr>
                  <th className="px-4 py-2">ID</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {requests.map((req) => (
                  <tr key={req.id} className="bg-white">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                      {req.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-2 font-medium">
                      ${parseFloat(req.amount).toFixed(2)} {req.currency}
                    </td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Card>
  );
}
