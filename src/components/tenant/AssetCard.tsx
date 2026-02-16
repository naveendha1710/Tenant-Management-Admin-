import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

interface AssetCardProps {
  asset: {
    id: string;
    asset_id: string;
    asset_name: string;
    asset_category: string;
    asset_type: string;
    serial_number: string;
    room_rack: string;
    asset_status: string;
    created_at: string;
    asset_picture?: string;
  };
}

export function AssetCard({ asset }: AssetCardProps) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      Active: 'bg-green-100 text-green-800 border-green-200',
      Maintenance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      Retired: 'bg-gray-100 text-gray-800 border-gray-200',
      Disposed: 'bg-red-100 text-red-800 border-red-200',
      Scrap: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col">
      {/* Status Badge - Top Right */}
      <div className="absolute top-4 right-4">
        <Badge className={`${getStatusColor(asset.asset_status)} flex-shrink-0 border text-xs`}>
          {asset.asset_status}
        </Badge>
      </div>

      {/* Asset Image/Icon - Centered */}
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
          {asset.asset_picture ? (
            <img src={asset.asset_picture} alt={asset.asset_name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <Package className="w-12 h-12 text-gray-400" />
          )}
        </div>
      </div>

      {/* Asset Details */}
      <div className="flex-1 space-y-3">
        <div>
          <h3 className="font-semibold text-gray-900 text-base leading-tight break-words">{asset.asset_name}</h3>
          <p className="text-sm text-gray-500 mt-1.5 break-words">{asset.asset_id}</p>
        </div>

        <div className="space-y-2 text-sm">
          <div className="text-gray-600 break-words">
            <span className="font-medium">{asset.asset_category}</span>
            <span className="text-gray-400 mx-1.5">•</span>
            <span>{asset.asset_type}</span>
          </div>
          
          {asset.serial_number && (
            <div className="text-gray-600 break-words">
              <span className="text-gray-500">SN:</span> {asset.serial_number}
            </div>
          )}
          
          {asset.room_rack && (
            <div className="text-gray-600 break-words">
              <span className="text-gray-500">Location:</span> {asset.room_rack}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
        Added {new Date(asset.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </div>
    </div>
  );
}
