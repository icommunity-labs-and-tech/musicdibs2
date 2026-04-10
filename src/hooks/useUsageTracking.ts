import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type UsageEventType =
  | 'login_after_purchase'
  | 'dashboard_access'
  | 'ai_song_generated'
  | 'credits_used'
  | 'asset_created'
  | 'download_attempt'
  | 'distribution_started'
  | 'promotion_created';

export function useUsageTracking() {
  const { user } = useAuth();
  const tracked = useRef<Set<string>>(new Set());

  const trackUsage = useCallback(async (
    eventType: UsageEventType,
    metadata?: Record<string, any>
  ) => {
    if (!user) return;

    // Deduplicate per-session for login/dashboard events
    const dedupeEvents = ['login_after_purchase', 'dashboard_access'];
    if (dedupeEvents.includes(eventType)) {
      const key = `usage_${eventType}_${user.id}`;
      if (tracked.current.has(key) || sessionStorage.getItem(key)) return;
      tracked.current.add(key);
      sessionStorage.setItem(key, '1');
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const sessionId = sessionStorage.getItem('md_session') || '';

      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-usage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            event_type: eventType,
            metadata: metadata || {},
            session_id: sessionId,
          }),
        }
      ).catch(() => {});
    } catch {
      // silent
    }
  }, [user]);

  // Auto-track login after purchase on mount
  useEffect(() => {
    if (user) {
      trackUsage('login_after_purchase');
    }
  }, [user, trackUsage]);

  return { trackUsage };
}
