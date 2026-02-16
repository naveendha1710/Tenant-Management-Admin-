import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AssetService, Asset } from '@/services/assetService';
import { buildingService, Building } from '@/services/buildingService';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Search, Edit, Trash2, Eye, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pagination } from '@/components/ui/pagination';
import { QRCodeSVG } from 'qrcode.react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface AssetListProps {
  onCreateNew?: () => void;
  onEdit?: (asset: Asset) => void;
  onView?: (asset: Asset) => void;
}

export default function AssetList({ onCreateNew, onEdit, onView }: AssetListProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const navigate = useNavigate();

  useEffect(() => {
    loadAssets();
    loadBuildings();
    loadUsers();
  }, []);

  const loadAssets = async () => {
    try {
      const data = await AssetService.getAssets();
      setAssets(data);
    } catch (error) {
      console.error('Failed to load assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    const data = await buildingService.getAllBuildings();
    setBuildings(data);
  };

  const loadUsers = async () => {
    const { data } = await supabase.from('users').select('id, name');
    if (data) {
      const userMap = data.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});
      setUsers(userMap);
    }
  };

  const getBuildingName = (buildingId?: string) => {
    if (!buildingId) return 'N/A';
    const building = buildings.find(b => b.id === buildingId);
    return building?.name || buildingId;
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this asset?')) {
      try {
        await AssetService.deleteAsset(id);
        loadAssets();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };

  const printQRCodes = async () => {
    const selectedAssetData = assets.filter(a => selectedAssets.includes(a.id));
    if (selectedAssetData.length === 0) return;

    const printContainer = document.createElement('div');
    printContainer.id = 'print-qr-container';
    printContainer.innerHTML = `
      <style>
        @media print {
          body * { visibility: hidden; }
          #print-qr-container, #print-qr-container * { visibility: visible; }
          #print-qr-container { position: absolute; left: 0; top: 0; width: 100%; }
        }
        .qr-item { page-break-inside: avoid; margin: 20px; display: inline-block; text-align: center; border: 1px solid #ddd; padding: 15px; width: 180px; }
        .qr-canvas { width: 120px; height: 120px; margin: 0 auto; }
        .qr-id { margin: 10px 0 5px; font-weight: bold; font-size: 14px; }
        .qr-name { margin: 0; font-size: 12px; color: #666; }
      </style>
      ${selectedAssetData.map(asset => `
        <div class="qr-item">
          <div id="qr-${asset.id}" class="qr-canvas"></div>
          <p class="qr-id">${asset.asset_id}</p>
          <p class="qr-name">${asset.asset_name}</p>
        </div>
      `).join('')}
    `;
    
    document.body.appendChild(printContainer);

    const logo = new Image();
    logo.src = '/Logo/Rathinam Logo (No name).png';
    logo.crossOrigin = 'anonymous';
    
    await new Promise(resolve => {
      logo.onload = resolve;
      logo.onerror = resolve;
    });

    for (const asset of selectedAssetData) {
      const qrElement = document.getElementById(`qr-${asset.id}`);
      if (qrElement) {
        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 120;
        
        await QRCode.toCanvas(canvas, asset.asset_id, { 
          width: 120, 
          margin: 0,
          errorCorrectionLevel: 'H'
        });
        
        const ctx = canvas.getContext('2d');
        if (ctx && logo.complete) {
          const logoSize = 30;
          const logoX = (120 - logoSize) / 2;
          const logoY = (120 - logoSize) / 2;
          
          ctx.fillStyle = 'white';
          ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);
          ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
        }
        
        qrElement.appendChild(canvas);
      }
    }

    setTimeout(() => {
      window.print();
      document.body.removeChild(printContainer);
    }, 500);
  };





  const filteredAssets = assets.filter(a =>
    a.asset_name.toLowerCase().includes(search.toLowerCase()) ||
    a.asset_id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'Idle': return 'bg-red-500/20 text-red-500 border-red-500/30';
      case 'Repair': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Asset Master</h1>
          <Button onClick={onCreateNew || (() => navigate('/assets/create'))}>
            <Plus className="mr-2 h-4 w-4" /> Create Asset
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedAssets.length > 0 && (
            <Button onClick={printQRCodes} variant="outline">
              <Printer className="mr-2 h-4 w-4" /> Print QR ({selectedAssets.length})
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden bg-white shadow-md border border-gray-200">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-200 hover:bg-transparent bg-gray-50">
                  <TableHead className="w-12 text-gray-600 font-semibold uppercase text-xs">
                    <Checkbox 
                      checked={selectedAssets.length === paginatedAssets.length && paginatedAssets.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Asset ID</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Name</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Category</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Status</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Location</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs">Value</TableHead>
                  <TableHead className="text-gray-600 font-semibold uppercase text-xs text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedAssets.map((asset) => (
                  <TableRow key={asset.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <TableCell>
                      <Checkbox 
                        checked={selectedAssets.includes(asset.id)}
                        onCheckedChange={() => toggleAssetSelection(asset.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{asset.asset_id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {asset.asset_picture && (
                          <img src={asset.asset_picture} alt={asset.asset_name} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{asset.asset_name}</p>
                          <p className="text-sm text-gray-500">{asset.serial_number || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{asset.asset_category}</p>
                        <p className="text-sm text-gray-500">{asset.asset_type || 'N/A'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(asset.asset_status || 'Active')}`}>
                        {asset.asset_status || 'Active'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-700">{getBuildingName(asset.building)}</TableCell>
                    <TableCell className="text-gray-700">₹{(asset.asset_value || asset.asset_cost || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button size="sm" variant="ghost" onClick={() => onView ? onView(asset) : navigate(`/assets/view/${asset.id}`)} title="View" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => onEdit ? onEdit(asset) : navigate(`/assets/edit/${asset.id}`)} title="Edit" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(asset.id)} title="Delete" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAssets.length)} of {filteredAssets.length} assets
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  showControls
                />
              </div>
            )}
          </div>
        )}
    </div>
  );
}
