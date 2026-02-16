import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Users, Square } from 'lucide-react';
import { buildingsService, type Building, type Floor } from '@/services/buildingsService';
import { useToast } from '@/hooks/use-toast';

export default function BuildingManagePage() {
  const { buildingId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [building, setBuilding] = useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBuildingData = async () => {
      if (!buildingId) return;
      
      try {
        const [buildingData, floorsData] = await Promise.all([
          buildingsService.getBuildingById(buildingId),
          buildingsService.getFloorsByBuilding(buildingId)
        ]);
        
        setBuilding(buildingData);
        setFloors(floorsData);
      } catch (error) {
        console.error('Error loading building data:', error);
        toast({
          title: "Error",
          description: "Failed to load building data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadBuildingData();
  }, [buildingId, toast]);

  if (loading) {
    return (
      <DashboardLayout title="Building Management" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading building data...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!building) {
    return (
      <DashboardLayout title="Building Management" subtitle="Building not found">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">Building not found</p>
          <Button onClick={() => navigate('/admin/buildings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Buildings
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const totalAvailable = floors.reduce((sum, floor) => sum + floor.available_sqft, 0);
  const totalOccupied = floors.reduce((sum, floor) => sum + floor.occupied_sqft, 0);
  const occupancyRate = building.total_sqft > 0 ? Math.round((totalOccupied / building.total_sqft) * 100) : 0;

  return (
    <DashboardLayout title={building.name} subtitle="Building floor and space management">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/admin/buildings')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Buildings
          </Button>
        </div>

        {/* Building Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sqft</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold">{building.total_sqft.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Sqft</CardTitle>
              <Square className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-green-600">{totalAvailable.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupied Sqft</CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-orange-600">{totalOccupied.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
              <Building2 className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-blue-600">{occupancyRate}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Floors */}
        <div>
          <h2 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold mb-4">Floors ({floors.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {floors.map((floor) => {
              const floorOccupancyRate = floor.total_sqft > 0 ? Math.round((floor.occupied_sqft / floor.total_sqft) * 100) : 0;
              
              return (
                <Card key={floor.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <CardTitle className="text-lg">
                        {floor.floor_name || `Floor ${floor.floor_number}`}
                      </CardTitle>
                      <Badge variant={floorOccupancyRate > 80 ? 'destructive' : floorOccupancyRate > 50 ? 'default' : 'secondary'}>
                        {floorOccupancyRate}% occupied
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Sqft</p>
                        <p className="font-medium">{floor.total_sqft.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Rate/Sqft</p>
                        <p className="font-medium">₹{floor.rate_per_sqft}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Available</p>
                        <p className="font-medium text-green-600">{floor.available_sqft.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Occupied</p>
                        <p className="font-medium text-orange-600">{floor.occupied_sqft.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${floorOccupancyRate}%` }}
                      ></div>
                    </div>
                    
                    <Button className="w-full" size="sm">
                      Manage Floor
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}