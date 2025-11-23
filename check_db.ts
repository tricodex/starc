
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const merchant = await prisma.merchant.findUnique({
        where: { slug: 'demo-merchant' }
    });

    if (!merchant) {
        console.log('Demo merchant not found');
        return;
    }

    const requests = await prisma.paymentRequest.findMany({
        where: { merchantId: merchant.id },
        orderBy: { createdAt: 'desc' }
    });

    console.log('Merchant ID:', merchant.id);
    console.log('Requests found:', requests.length);
    requests.forEach(r => {
        console.log(`ID: ${r.id} | Amount: ${r.amount} | Status: ${r.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
