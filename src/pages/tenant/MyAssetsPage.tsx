// This file now serves as a thin wrapper that renders the full AssetMaster component
// in a read‑only mode for tenant users. All data fetching and UI logic lives in
// `src/pages/assets/AssetMaster.tsx`. We only determine the current tenant ID
// and pass it along with a `readOnly` flag.

import AssetMaster from '@/pages/assets/AssetMaster';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function MyAssetsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const tenantId = user?.appUser?.tenantId ?? null;

  if (!tenantId) {
    // If tenant information is missing, inform the user and avoid rendering assets.
    toast({
      title: 'Tenant context missing',
      description: 'Unable to determine your tenant. Please log in again.',
      variant: 'destructive',
    });
    return <p className="text-center mt-8 text-gray-600">Tenant context not available.</p>;
  }

  // Render the AssetMaster component in read‑only mode for the current tenant.
  return <AssetMaster readOnly tenantId={tenantId} />;
}

/* Legacy tenant asset page logic removed – wrapper now renders AssetMaster in read‑only mode */
