import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, UserCheck, Trash2 } from 'lucide-react';

interface TenantManageButtonProps {
  tenantId: string;
}

export function TenantManageButton({ tenantId }: TenantManageButtonProps) {
  const navigate = useNavigate();

  const handleView = () => {
    navigate(`/tenants/manage/${tenantId}`);
  };

  const handleAssignment = () => {
    navigate(`/tenants/assign/${tenantId}`);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      console.log('Delete tenant:', tenantId);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleView}
      >
        <Eye className="w-4 h-4 mr-1" />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleAssignment}
      >
        <UserCheck className="w-4 h-4 mr-1" />
        Assignment
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
      >
        <Trash2 className="w-4 h-4 mr-1" />
        Delete
      </Button>
    </div>
  );
}