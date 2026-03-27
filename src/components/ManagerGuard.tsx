import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function ManagerGuard({ children }: { children: React.ReactNode }) {
  const { isManager, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isManager) {
      toast.error('Acceso solo para managers');
    }
  }, [loading, isManager]);

  if (loading) return null;
  if (!isManager) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
