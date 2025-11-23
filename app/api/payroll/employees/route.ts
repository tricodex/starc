'use server';

import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      where: { active: true },
      orderBy: {
        name: 'asc'
      }
    });

    // Convert Decimal to string for client components
    const serializedEmployees = employees.map(emp => ({
      ...emp,
      payrollAmount: emp.payrollAmount.toString()
    }));

    return NextResponse.json({ employees: serializedEmployees });
  } catch (error: any) {
    console.error('Get employees error:', error);
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
