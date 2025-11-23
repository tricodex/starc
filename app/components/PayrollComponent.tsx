'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useCircleWallet } from '../context/CircleWalletContext';

interface Employee {
  id: string;
  name: string;
  walletAddress: string;
  position: string | null;
  payrollAmount: string;
  active: boolean;
}

interface PayrollReceipt {
  id: string;
  employeeId: string;
  amount: string;
  currency: string;
  status: string;
  txHash: string | null;
  paidAt: string | null;
  employee: Employee;
}

export function PayrollComponent() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [receipts, setReceipts] = useState<PayrollReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingAll, setPayingAll] = useState(false);
  const [payingEmployeeId, setPayingEmployeeId] = useState<string | null>(null);
  const { walletId, sdk } = useCircleWallet();

  useEffect(() => {
    fetchEmployees();
    fetchReceipts();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/payroll/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    try {
      const res = await fetch('/api/payroll/receipt?limit=20');
      const data = await res.json();
      setReceipts(data.receipts || []);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    }
  };

  const payEmployee = async (employeeId: string) => {
    if (!walletId || !sdk) return;
    setPayingEmployeeId(employeeId);

    try {
      const userId = localStorage.getItem('circle_user_id');
      const res = await fetch('/api/treasury/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletId, userId, employeeId })
      });
      const data = await res.json();

      if (data.challengeId) {
        if (data.userToken && data.encryptionKey) {
          localStorage.setItem('circle_user_token', data.userToken);
          localStorage.setItem('circle_encryption_key', data.encryptionKey);
          sdk.setAuthentication({ userToken: data.userToken, encryptionKey: data.encryptionKey });
        }

        sdk.execute(data.challengeId, async (error, result) => {
          if (error) {
            setPayingEmployeeId(null);
            console.error("Payroll Error:", error);
            alert(`Payment failed: ${error.message}`);
            return;
          }

          if (result) {
            console.log("Payment Initiated:", result);

            // Poll for transaction hash
            const txHash = await pollForTxHash();

            // Update receipt with txHash
            if (txHash && data.receiptId) {
              await fetch('/api/payroll/receipt', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiptId: data.receiptId, txHash, status: 'COMPLETED' })
              });
            }

            setPayingEmployeeId(null);
            await fetchReceipts();
            alert(`✅ Payment sent to ${data.employeeName}!\n${txHash ? `Tx: ${txHash}` : ''}`);
          }
        });
      } else {
        setPayingEmployeeId(null);
        alert(data.message || "Payment failed");
      }
    } catch (error: any) {
      setPayingEmployeeId(null);
      console.error("Payment error:", error);
      alert(`Payment error: ${error.message}`);
    }
  };

  const payAllEmployees = async () => {
    if (!walletId || !sdk || employees.length === 0) return;
    setPayingAll(true);

    try {
      for (const employee of employees) {
        await payEmployee(employee.id);
        // Wait a bit between payments
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      alert(`✅ All ${employees.length} employees paid!`);
    } catch (error: any) {
      console.error("Batch payment error:", error);
      alert(`Batch payment error: ${error.message}`);
    } finally {
      setPayingAll(false);
    }
  };

  const pollForTxHash = async (): Promise<string | null> => {
    try {
      const userId = localStorage.getItem('circle_user_id');
      if (!userId) return null;

      for (let i = 0; i < 20; i++) {
        const userToken = localStorage.getItem('circle_user_token');
        const headers: Record<string, string> = {};
        if (userToken) headers['X-User-Token'] = userToken;

        const txRes = await fetch(`/api/circle/wallet/transactions?userId=${userId}&pageSize=10`, { headers });

        if (!txRes.ok) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        const txData = await txRes.json();
        if (txData?.data?.transactions?.length > 0) {
          const latestTx = txData.data.transactions[0];
          if (latestTx.txHash) {
            return latestTx.txHash;
          }
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error("Polling error", e);
    }
    return null;
  };

  const totalPayroll = employees.reduce((sum, emp) => sum + parseFloat(emp.payrollAmount), 0);

  if (loading) {
    return <Card className="p-8 text-center"><div className="text-zinc-500">Loading employees...</div></Card>;
  }

  return (
    <div className="space-y-6">
      <Card className="border-zinc-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 font-display">Payroll Management</h3>
            <p className="text-sm text-zinc-500">Total: ${totalPayroll.toFixed(2)} USDC for {employees.length} employees</p>
          </div>
          <Button
            onClick={payAllEmployees}
            isLoading={payingAll}
            disabled={!walletId || employees.length === 0 || payingAll}
          >
            {payingAll ? 'Processing...' : `Pay All (${employees.length})`}
          </Button>
        </div>

        <div className="space-y-3">
          {employees.map((employee) => {
            const isPaying = payingEmployeeId === employee.id;
            const latestReceipt = receipts.find(r => r.employeeId === employee.id);

            return (
              <div
                key={employee.id}
                className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold">
                    {employee.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-zinc-900">{employee.name}</div>
                    <div className="text-xs text-zinc-500">{employee.position || 'Team Member'}</div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="font-mono font-bold text-zinc-900">${parseFloat(employee.payrollAmount).toFixed(2)}</div>
                    {latestReceipt && (
                      <div className={`text-xs ${latestReceipt.status === 'COMPLETED' ? 'text-emerald-600' : 'text-zinc-500'}`}>
                        {latestReceipt.status === 'COMPLETED' ? '✓ Paid' : latestReceipt.status}
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => payEmployee(employee.id)}
                  isLoading={isPaying}
                  disabled={!walletId || isPaying || payingAll}
                >
                  {isPaying ? 'Sending...' : 'Pay'}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {receipts.length > 0 && (
        <Card className="border-zinc-200">
          <h3 className="text-lg font-bold text-zinc-900 font-display mb-4">Recent Payroll History</h3>
          <div className="space-y-2">
            {receipts.slice(0, 10).map((receipt) => (
              <div key={receipt.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg text-sm">
                <div className="flex items-center gap-3 flex-1">
                  <div className="font-medium text-zinc-900">{receipt.employee.name}</div>
                  <div className="text-zinc-500">${parseFloat(receipt.amount).toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-3">
                  {receipt.txHash && (
                    <a
                      href={`https://testnet.arcscan.app/tx/${receipt.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-mono"
                    >
                      {receipt.txHash.slice(0, 8)}...{receipt.txHash.slice(-6)}
                    </a>
                  )}
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    receipt.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : receipt.status === 'PENDING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {receipt.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
