import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

/**
 * Returns a function `guardRegister` that checks KYC status before allowing
 * navigation to the registration page. If KYC is not verified, it redirects
 * to /dashboard/verify-identity and shows a toast.
 *
 * Also exposes `kycStatus` and `kycLoading` for inline checks.
 */
export function useKycGuard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('kyc_status')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setKycStatus(data?.kyc_status || 'unverified');
        setKycLoading(false);
      });

    const channel = supabase
      .channel('kyc-guard')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.kyc_status) setKycStatus(payload.new.kyc_status);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isVerified = kycStatus === 'verified';

  /** Call this instead of navigate('/dashboard/register'). Returns true if allowed. */
  const guardRegister = useCallback((targetPath = '/dashboard/register') => {
    if (kycLoading) return false;
    if (!isVerified) {
      toast.error('Debes verificar tu identidad antes de registrar una obra.');
      navigate('/dashboard/verify-identity');
      return false;
    }
    navigate(targetPath);
    return true;
  }, [kycLoading, isVerified, navigate]);

  return { guardRegister, isVerified, kycStatus, kycLoading };
}
