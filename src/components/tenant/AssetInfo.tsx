import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Package, Loader2 } from 'lucide-react';

interface AssetInfoProps {
  assetId: string;
}

export function AssetInfo({ assetId }: AssetInfoProps) {
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAsset = async () => {
      try {
        const { data } = await supabase
          .from('assets')
          .select('asset_id, asset_name, asset_category, asset_status')
          .eq('id', assetId)
          .single();
        setAsset(data);
      } catch (error) {
        console.error('Error fetching asset:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  if (!asset) {
    return <p className="text-sm text-gray-500">Asset not found</p>;
  }

  return (
    <div className="flex items-start gap-2">
      <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm truncate">{asset.asset_name}</p>
        <p className="text-xs text-gray-500 truncate">{asset.asset_id}</p>
        <p className="text-xs text-gray-500">{asset.asset_category}</p>
      </div>
    </div>
  );
}
