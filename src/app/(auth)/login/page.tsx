'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/use-auth-store';
import { LoginSchema, LoginFormData } from '@/validators/auth.schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleSelectionModal } from '@/components/common/role-selection-modal';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const setAuthData = useAuthStore((state) => state.setAuthData);
  const [error, setError] = useState('');
  const [rolesToSelect, setRolesToSelect] = useState<any[] | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError('');
      
      // Connect to the real backend
      const res = await authService.login(data);
      
      const { user, token } = res.data || res; // Handle if nested inside data
      const accessToken = token || res.accessToken;
      // The backend now provides user.permissions array directly!
      const perms = user?.permissions || [];
      
      // Determine primary role for display (take first from array, or use single string, or default)
      let primaryRole = 'User';
      if (Array.isArray(user?.roles) && user.roles.length > 0) {
        primaryRole = user.roles[0];
      } else if (user?.role) {
        primaryRole = user.role;
      }

      setAuthData(user, accessToken, perms);
      useAuthStore.getState().setActiveRole(primaryRole);
      router.push('/');

    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFEED]">
      <div className="w-full max-w-md p-8 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">PropNetra</h1>
          <p className="text-gray-500 text-sm">Welcome back! Please enter your details.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Email or Mobile</label>
            <Input
              type="text"
              placeholder="admin@propnetra.com"
              {...register('identifier')}
              className={`h-12 bg-gray-50 border-gray-200 focus-visible:ring-primary ${errors.identifier ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {errors.identifier && (
              <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <Input
              type="password"
              placeholder="••••••"
              {...register('password')}
              className={`h-12 bg-gray-50 border-gray-200 focus-visible:ring-primary ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-semibold transition-all hover:opacity-90 bg-primary text-primary-foreground shadow-lg shadow-primary/30"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>

      {rolesToSelect && (
        <RoleSelectionModal 
          roles={rolesToSelect} 
          onComplete={() => router.push('/')} 
        />
      )}
    </div>
  );
}
