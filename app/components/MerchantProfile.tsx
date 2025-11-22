'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { upsertMerchant } from '../lib/actions';
import { useCircleWallet } from '../context/CircleWalletContext';

interface MerchantProfileProps {
  merchant: any; // Pass initial merchant data if available
}

export function MerchantProfile({ merchant }: MerchantProfileProps) {
  const { walletAddress } = useCircleWallet();
  const [isEditing, setIsEditing] = useState(!merchant);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: merchant?.name || '',
    description: merchant?.description || '',
    logoUrl: merchant?.logoUrl || '',
  });

  useEffect(() => {
    if (merchant) {
      setFormData({
        name: merchant.name,
        description: merchant.description || '',
        logoUrl: merchant.logoUrl || '',
      });
      setIsEditing(false);
    } else {
        setIsEditing(true);
    }
  }, [merchant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;

    setIsLoading(true);
    try {
      await upsertMerchant({
        ...formData,
        walletAddress,
      });
      setIsEditing(false);
      // Optionally trigger a refresh or callback to parent
      window.location.reload(); // Simple way to refresh state for now
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!walletAddress) {
    return (
      <Card>
        <div className="text-center py-8 text-zinc-500">
          Please connect your Circle Wallet to view or create your merchant profile.
        </div>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card title={merchant ? "Edit Profile" : "Create Merchant Profile"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Merchant Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Starbucks"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Description</label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Coffee and beverages"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Logo URL (Optional)</label>
            <Input
              value={formData.logoUrl}
              onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button type="submit" isLoading={isLoading}>
              Save Profile
            </Button>
            {merchant && (
              <Button type="button" variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card title="Merchant Profile">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-zinc-500">Merchant Name</label>
              <div className="font-medium text-zinc-900 text-lg">{merchant.name}</div>
            </div>
            {merchant.description && (
              <div>
                <label className="block text-sm font-medium text-zinc-500">Description</label>
                <div className="text-zinc-700">{merchant.description}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-zinc-500">Wallet Address</label>
              <div className="font-mono text-sm text-zinc-900 break-all bg-zinc-50 p-2 rounded border border-zinc-100">
                {merchant.walletAddress}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500">Slug</label>
              <div className="text-sm text-zinc-700">@{merchant.slug}</div>
            </div>
          </div>
          
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
            Edit
          </Button>
        </div>
      </div>
    </Card>
  );
}

