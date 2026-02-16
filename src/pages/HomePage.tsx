import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Settings, 
  DollarSign, 
  Users, 
  Building, 
  Wrench,
  ArrowRight,
  Home
} from "lucide-react";

const roles = [
  {
    id: "super-admin",
    name: "Super Admin",
    description: "System-wide administration and user management",
    icon: Shield,
    route: "/super-admin/dashboard",
    color: "bg-red-50 hover:bg-red-100 border-red-200",
    iconColor: "text-red-600"
  },
  {
    id: "admin",
    name: "Admin",
    description: "College IT Park Manager - oversee operations",
    icon: Settings,
    route: "/admin/dashboard",
    color: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    iconColor: "text-blue-600"
  },
  {
    id: "finance",
    name: "Finance Team",
    description: "Billing, payments, and financial reporting",
    icon: DollarSign,
    route: "/finance/dashboard",
    color: "bg-green-50 hover:bg-green-100 border-green-200",
    iconColor: "text-green-600"
  },
  {
    id: "crm",
    name: "CRM/Sales Team",
    description: "Tenant relations and sales management",
    icon: Users,
    route: "/crm/dashboard",
    color: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    iconColor: "text-purple-600"
  },
  {
    id: "tenant",
    name: "Tenant",
    description: "Company representative portal and services",
    icon: Building,
    route: "/tenant/dashboard",
    color: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200",
    iconColor: "text-yellow-600"
  },
  {
    id: "maintenance",
    name: "Maintenance Staff",
    description: "Facility maintenance and service requests",
    icon: Wrench,
    route: "/maintenance/dashboard",
    color: "bg-orange-50 hover:bg-orange-100 border-orange-200",
    iconColor: "text-orange-600"
  }
];

export default function HomePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to their dashboard
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleRoleClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Home className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl font-bold text-gray-900">Rathinam Techpark</h1>
              <p className="text-sm text-gray-600">Tenant Management SaaS - Prototype Dashboard</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Welcome to Rathinam College Tech Park
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select your role to access the corresponding dashboard and explore the tenant management system
          </p>
        </div>

        {/* Role Navigation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {roles.map((role) => (
            <Card 
              key={role.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${role.color}`}
              onClick={() => handleRoleClick(role.route)}
            >
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <role.icon className={`h-8 w-8 ${role.iconColor}`} />
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                </div>
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                  {role.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {role.description}
                </CardDescription>
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 justify-between"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRoleClick(role.route);
                  }}
                >
                  Access Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Prototype Environment
          </h3>
          <p className="text-gray-600 max-w-3xl mx-auto">
            This is a prototype interface for the Rathinam College Tenant Management System. 
            Each role provides access to specific features and dashboards tailored to different user types. 
            Click on any role card above to explore the corresponding dashboard and functionality.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-gray-600">
              <p>&copy; 2024 Rathinam College. All rights reserved.</p>
            </div>
            <div className="text-sm text-gray-600 mt-4 md:mt-0">
              <p>Version 1.0.0 | Contact: tech-support@rathinam.edu</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}