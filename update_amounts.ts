
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

    const updateResult = await prisma.paymentRequest.updateMany({
        where: {
            merchantId: merchant.id,
            status: 'PENDING'
        },
        data: {
            amount: 0.5
        }
    });

    console.log(`Updated ${updateResult.count} requests to 0.5`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
