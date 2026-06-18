import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const authContext = useAuth();
  const navigate = useNavigate();

  // Handle case where auth context is null
  if (!authContext) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1f2e]">
        <div className="text-white">Loading authentication...</div>
      </div>
    );
  }

  const { login, error: authError } = authContext;

  // Show auth initialization error if present
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1f2e]">
        <div className="text-center text-white">
          <div className="text-red-400 mb-4">Authentication Error</div>
          <div className="text-sm">{authError}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Redirect based on role
      if (user.appUser.role === 'Tenant') {
        const permissions = user.appUser.permissions || [];
        const hasPermission = (module: string) => 
          permissions.find((p: any) => p.module === module && p.view === true);
        
        if (hasPermission('Dashboard')) {
          navigate('/tenant/dashboard');
        } else if (hasPermission('My Lease')) {
          navigate('/tenant/lease');
        } else if (hasPermission('Invoices')) {
          navigate('/tenant/invoices');
        } else if (hasPermission('Documents')) {
          navigate('/tenant/documents');
        } else if (hasPermission('Maintenance')) {
          navigate('/tenant/maintenance-requests');
        } else if (hasPermission('My Assets')) {
          navigate('/tenant/my-assets');
        } else if (hasPermission('Profile')) {
          navigate('/tenant/profile');
        } else {
          navigate('/not-authorized');
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1f2e] p-4 md:p-8 relative overflow-hidden">
      {/* Buildings Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <img 
          src="/Logo/Buildings-tenant.png" 
          alt="Buildings" 
          className="w-full h-full object-cover scale-[1.3] -translate-x-32"
        />
      </div>
      

      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-32 relative z-10">
        {/* Logo Card */}
        <div className="w-full max-w-sm lg:max-w-none">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <img 
              src="/Logo/Dual Rathinam Logo Transparent.png" 
              alt="Rathinam Techpark" 
              className="w-full h-auto object-contain"
            />
          </div>
        </div>

        {/* Login Form Card */}
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl p-6 md:p-10 shadow-2xl">
            <h1 className="text-lg sm:text-base sm:text-lg md:text-xl md:text-2xl md:text-3xl font-bold text-[#2c5282] text-center mb-6 md:mb-8">Login</h1>

            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-4 sm:space-y-6">
              {error && (
                <Alert variant="destructive" className="bg-red-50 border border-red-200 rounded-xl">
                  <AlertDescription className="text-red-800">{error}</AlertDescription>
                </Alert>
              )}

              <Input
                type="email"
                placeholder=" Enter Your Mail-ID "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 rounded-full border border-gray-300 px-6 text-gray-600 placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 bg-white"
              />

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Your Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  className="h-14 rounded-full border border-gray-300 px-6 pr-12 text-gray-600 placeholder:text-gray-400 focus:border-gray-400 focus:ring-0 bg-white appearance-none [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-semibold text-lg shadow-lg transition-all"
              >
                {loading ? 'Signing in' : 'Sign in'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <a 
                href="mailto:itsupport@rathinam.in?subject=Account Access Request&body=Hello,%0D%0A%0D%0AI would like to request access to the Rathinam Techpark portal.%0D%0A%0D%0AThank you."
                className="text-[#2563eb] font-medium hover:underline"
              >
              E-mail: itsupport@rathinam.in
                   
              </a>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default Auth;
