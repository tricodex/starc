import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data (optional - comment out for production)
  await prisma.payrollReceipt.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.paymentRequest.deleteMany({});
  await prisma.merchant.deleteMany({});
  console.log('Cleared existing data');

  // Seed merchants
  const merchants = [
    {
      slug: 'demo',
      name: 'Demo Merchant',
      description: 'Demo merchant for testing purposes',
      walletAddress: '0x1234567890123456789012345678901234567890',
      logoUrl: '/logo.png',
    },
    {
      slug: 'starbucks',
      name: 'Starbucks',
      description: 'Coffee and beverages',
      walletAddress: '0x2222222222222222222222222222222222222222',
      logoUrl: null,
    },
    {
      slug: 'tesla',
      name: 'Tesla',
      description: 'Electric vehicles and energy',
      walletAddress: '0x3333333333333333333333333333333333333333',
      logoUrl: null,
    },
    {
      slug: 'apple',
      name: 'Apple Store',
      description: 'Technology products and services',
      walletAddress: '0x4444444444444444444444444444444444444444',
      logoUrl: null,
    },
  ];

  for (const merchant of merchants) {
    const created = await prisma.merchant.create({
      data: merchant,
    });
    console.log(`Created merchant: ${created.name} (${created.slug})`);
  }

  // Seed employees from environment variables
  const employees = [
    {
      name: 'Alice Thompson',
      walletAddress: process.env.PAYROLL_ADDRESS_1 || '0x669F3037BAd636503dEA4f64F79c9c48bf7aE6a7',
      position: 'Senior Developer',
      payrollAmount: 0.25,
      active: true,
    },
    {
      name: 'Bob Martinez',
      walletAddress: process.env.PAYROLL_ADDRESS_2 || '0x114dE47191D16297E4b1b42BF4A8098622e9b28b',
      position: 'Product Manager',
      payrollAmount: 0.25,
      active: true,
    },
    {
      name: 'Carol Chen',
      walletAddress: process.env.PAYROLL_ADDRESS_3 || '0x2C7992e7B97b97940366c2Bb88DbF2AB0724aA95',
      position: 'UX Designer',
      payrollAmount: 0.25,
      active: true,
    },
    {
      name: 'David Kumar',
      walletAddress: process.env.PAYROLL_ADDRESS_4 || '0x9a410B25Eb625ec349E985CF4ED684e949287f5d',
      position: 'Marketing Lead',
      payrollAmount: 0.25,
      active: true,
    },
    {
      name: 'Emma Wilson',
      walletAddress: process.env.PAYROLL_ADDRESS_5 || '0x3B99C02B4Fd96df308983CB7F8880659C9d8b022',
      position: 'Operations Manager',
      payrollAmount: 0.25,
      active: true,
    },
  ];

  for (const employee of employees) {
    const created = await prisma.employee.create({
      data: employee,
    });
    console.log(`Created employee: ${created.name} (${created.position}) - ${created.walletAddress}`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
