import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type LibraryTier = 'active' | 'warning' | 'restricted' | 'pending_deletion';

export interface LibraryAccess {
  tier: LibraryTier;
  canDownload: boolean;
  freeDownloadsUsed: number;
  freeDownloadsRemaining: number;
  daysUntilDeletion: number | null;
  isLoading: boolean;
}

const FREE_DOWNLOADS_LIMIT = 3;

export function useLibraryAccess(): LibraryAccess {
  const { user } = useAuth();
  const [access, setAccess] = useState<LibraryAccess>({
    tier: 'active',
    canDownload: true,
    freeDownloadsUsed: 0,
    freeDownloadsRemaining: FREE_DOWNLOADS_LIMIT,
    daysUntilDeletion: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('subscription_plan, available_credits, library_status, library_status_since, free_downloads_used')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;

        const plan = data.subscription_plan;
        const credits = data.available_credits ?? 0;
        const isActive = plan === 'Annual' || plan === 'Monthly' || credits > 0;
        const tier = ((data as any).library_status || 'active') as LibraryTier;
        const freeUsed = (data as any).free_downloads_used ?? 0;

        let daysUntilDeletion: number | null = null;
        if (tier === 'pending_deletion' && (data as any).library_status_since) {
          const since = new Date((data as any).library_status_since);
          const deletionDate = new Date(since.getTime() + 30 * 86400000);
          daysUntilDeletion = Math.max(0, Math.ceil((deletionDate.getTime() - Date.now()) / 86400000));
        }

        setAccess({
          tier: isActive ? 'active' : tier,
          canDownload: isActive || (tier === 'warning' && freeUsed < FREE_DOWNLOADS_LIMIT),
          freeDownloadsUsed: freeUsed,
          freeDownloadsRemaining: Math.max(0, FREE_DOWNLOADS_LIMIT - freeUsed),
          daysUntilDeletion,
          isLoading: false,
        });
      });
  }, [user]);

  return access;
}

export async function registerFreeDownload(userId: string) {
  try {
    await supabase.rpc('increment_free_downloads' as any, { p_user_id: userId });
  } catch {
    // silent
  }
}
