import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Eye, UserCheck, Trash2 } from 'lucide-react';

interface Tenant {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: string;
  monthly_rent: number;
}

interface TenantTableProps {
  tenants: Tenant[];
}

export function TenantTable({ tenants }: TenantTableProps) {
  const navigate = useNavigate();

  const handleView = (tenantId: string) => {
    navigate(`/tenants/manage/${tenantId}`);
  };

  const handleAssignment = (tenantId: string) => {
    navigate(`/tenants/assign/${tenantId}`);
  };

  const handleDelete = (tenantId: string) => {
    if (confirm('Are you sure you want to delete this tenant?')) {
      // Delete logic here
      console.log('Delete tenant:', tenantId);
    }
  };

  return (
    <table className="w-full">
      <thead>
        <tr>
          <th>Company</th>
          <th>Contact</th>
          <th>Email</th>
          <th>Status</th>
          <th>Monthly Rent</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {tenants.map((tenant) => (
          <tr key={tenant.id}>
            <td>{tenant.company_name}</td>
            <td>{tenant.contact_person}</td>
            <td>{tenant.email}</td>
            <td>{tenant.status}</td>
            <td>₹{tenant.monthly_rent.toLocaleString()}</td>
            <td className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleView(tenant.id)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssignment(tenant.id)}
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Assignment
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(tenant.id)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}