import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShieldX } from "lucide-react";

export default function NotAuthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4 sm:space-y-6">
        <ShieldX className="h-24 w-24 text-red-500 mx-auto" />
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline">
          Go Back
        </Button>
      </div>
    </div>
  );
}