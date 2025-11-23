'use server';

import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createUserToken, CIRCLE_API_KEY } from '@/app/lib/circle';
import { db } from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, userId, employeeId } = body;

    if (!walletId || !userId) {
      return NextResponse.json({ message: 'Missing walletId or userId' }, { status: 400 });
    }

    // Get active employees from database
    let employees;
    if (employeeId) {
      // Pay single employee
      const employee = await db.employee.findFirst({
        where: { id: employeeId, active: true }
      });
      if (!employee) {
        return NextResponse.json({ message: 'Employee not found or inactive' }, { status: 404 });
      }
      employees = [employee];
    } else {
      // Pay all active employees
      employees = await db.employee.findMany({
        where: { active: true }
      });
    }

    if (employees.length === 0) {
      return NextResponse.json({ message: 'No active employees found' }, { status: 400 });
    }

    // 1. Get User Token
    const { userToken, encryptionKey } = await createUserToken(userId);

    // 2. Get Wallet Balance to find USDC
    const balanceRes = await fetch(`https://api.circle.com/v1/w3s/wallets/${walletId}/balances`, {
        headers: {
            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!balanceRes.ok) {
        throw new Error("Failed to fetch wallet balance");
    }

    const balanceData = await balanceRes.json();
    const tokens = balanceData.data?.tokenBalances || [];
    const usdcToken = tokens.find((t: any) => t.token.symbol === 'USDC' || t.token.symbol === 'USDC-TESTNET');

    if (!usdcToken) {
        return NextResponse.json({ message: 'No USDC found in wallet' }, { status: 400 });
    }

    // Calculate total needed
    const totalNeeded = employees.reduce((sum, emp) => sum + parseFloat(emp.payrollAmount.toString()), 0);

    if (parseFloat(usdcToken.amount) < totalNeeded) {
        return NextResponse.json({
            message: `Insufficient funds. Need ${totalNeeded.toFixed(2)} USDC for ${employees.length} employee${employees.length > 1 ? 's' : ''}.`
        }, { status: 400 });
    }

    const tokenId = usdcToken.token.id;

    // 3. For single employee, initiate transfer directly
    // For multiple employees, we pick the first (UI will call this in a loop for each)
    const employee = employees[0];
    const amount = employee.payrollAmount.toString();

    // Create payroll receipt in database
    const receipt = await db.payrollReceipt.create({
      data: {
        employeeId: employee.id,
        amount: employee.payrollAmount,
        currency: 'USDC',
        status: 'PENDING'
      }
    });

    const payload = {
        idempotencyKey: uuidv4(),
        userId: userId,
        destinationAddress: employee.walletAddress,
        amounts: [amount],
        tokenId: tokenId,
        walletId: walletId,
        feeLevel: "MEDIUM"
    };

    console.log(`Distributing ${amount} USDC Payroll to ${employee.name} (${employee.walletAddress})`);

    const transferRes = await fetch('https://api.circle.com/v1/w3s/user/transactions/transfer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CIRCLE_API_KEY}`,
            'X-User-Token': userToken
        },
        body: JSON.stringify(payload)
    });

    if (!transferRes.ok) {
        const errorText = await transferRes.text();
        console.error("Circle Payroll Transfer Failed:", errorText);

        // Update receipt status to FAILED
        await db.payrollReceipt.update({
          where: { id: receipt.id },
          data: { status: 'FAILED' }
        });

        throw new Error(`Payroll Failed: ${errorText}`);
    }

    const transferData = await transferRes.json();

    return NextResponse.json({
        challengeId: transferData.data.challengeId,
        userToken,
        encryptionKey,
        amount,
        recipient: employee.walletAddress,
        employeeName: employee.name,
        receiptId: receipt.id,
        totalEmployees: employees.length,
        message: employees.length > 1 ? `Paying ${employee.name} (1 of ${employees.length})` : `Paying ${employee.name}`
    });

  } catch (error: any) {
    console.error('Treasury Payroll Error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

