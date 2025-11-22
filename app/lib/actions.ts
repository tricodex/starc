'use server';

import { db } from '@/app/lib/db';
import { revalidatePath } from 'next/cache';

// Fetch merchant by wallet address
export async function getMerchantByAddress(walletAddress: string) {
  return await db.merchant.findFirst({
    where: { walletAddress },
  });
}

// Create or update merchant profile
export async function upsertMerchant(data: {
  name: string;
  description?: string;
  walletAddress: string;
  logoUrl?: string;
}) {
  const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') + '-' + Date.now().toString().slice(-4);
  
  // Check if exists by wallet address
  const existing = await db.merchant.findFirst({
    where: { walletAddress: data.walletAddress },
  });

  if (existing) {
    return await db.merchant.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl,
      },
    });
  } else {
    return await db.merchant.create({
      data: {
        slug, // Generate a slug
        name: data.name,
        description: data.description,
        walletAddress: data.walletAddress,
        logoUrl: data.logoUrl,
      },
    });
  }
}

// Fetch payment requests for a merchant (by ID or Wallet Address lookup)
export async function getMerchantPayments(walletAddress: string) {
  const merchant = await db.merchant.findFirst({
    where: { walletAddress },
    include: {
      paymentRequests: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!merchant) return [];

  // Serialize for client
  return merchant.paymentRequests.map(req => ({
    ...req,
    amount: req.amount.toString(),
    createdAt: req.createdAt.toISOString(),
    updatedAt: req.updatedAt.toISOString(),
  }));
}

