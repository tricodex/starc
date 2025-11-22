import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clear existing data (optional - comment out for production)
  await prisma.merchant.deleteMany({});
  console.log('Cleared existing merchants');

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
