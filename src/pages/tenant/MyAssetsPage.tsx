// This file now serves as a thin wrapper that renders the full AssetMaster component
// in a read‑only mode for tenant users. All data fetching and UI logic lives in
// `src/pages/assets/AssetMaster.tsx`. We only determine the current tenant ID
// and pass it along with a `readOnly` flag.

import AssetMaster from '@/pages/assets/AssetMaster';
import { useToast } from '@/hooks/use-toast';

export default function MyAssetsPage() {
  // Render the AssetMaster component in read‑only mode without tenant filtering.
  // The tenant selection logic has been removed as requested.
  const { toast } = useToast();
  // toast can be used for future messages; currently no async logic.
  return <AssetMaster readOnly />;
}

/* Legacy tenant asset page logic removed – wrapper now renders AssetMaster in read‑only mode */
