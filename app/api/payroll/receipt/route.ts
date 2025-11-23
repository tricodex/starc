'use server';

import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { receiptId, txHash, status } = body;

    if (!receiptId) {
      return NextResponse.json({ message: 'Missing receiptId' }, { status: 400 });
    }

    const updatedReceipt = await db.payrollReceipt.update({
      where: { id: receiptId },
      data: {
        txHash,
        status: status || 'COMPLETED',
        paidAt: new Date()
      },
      include: {
        employee: true
      }
    });

    return NextResponse.json({ receipt: updatedReceipt });
  } catch (error: any) {
    console.error('Update receipt error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const limit = parseInt(searchParams.get('limit') || '10');

    const where = employeeId ? { employeeId } : {};

    const receipts = await db.payrollReceipt.findMany({
      where,
      include: {
        employee: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    // Convert Decimal to string for client components
    const serializedReceipts = receipts.map(receipt => ({
      ...receipt,
      amount: receipt.amount.toString(),
      employee: {
        ...receipt.employee,
        payrollAmount: receipt.employee.payrollAmount.toString()
      }
    }));

    return NextResponse.json({ receipts: serializedReceipts });
  } catch (error: any) {
    console.error('Get receipts error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
