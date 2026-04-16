import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type EventName =
  | 'ai_studio_entered'
  | 'generation_started'
  | 'generation_completed'
  | 'generation_failed'
  | 'audio_downloaded'
  | 'work_registered'
  | 'work_registered_after_generation'
  | 'cover_generated'
  | 'video_generated'
  | 'social_video_generated'
  | 'voice_cloned'
  | 'vocal_track_generated'
  | 'lyrics_generated'
  | 'press_release_generated'
  | 'promotion_generated'
  | 'premium_promotion_submitted'
  | 'enhance_audio_started'
  | 'enhance_audio_completed'
  | 'enhance_audio_failed'
  | 'distribution_clicked'
  | 'ai_studio_tab_changed';

type Feature =
  | 'create_music' | 'lyrics' | 'vocal' | 'cover' | 'video'
  | 'social_video' | 'promotion' | 'press' | 'register' | 'voice_cloning'
  | 'premium_promotion' | 'enhance_audio' | 'distribution' | 'inspire' | 'edit_audio';

interface TrackOptions {
  feature: Feature;
  metadata?: Record<string, any>;
}

export function useProductTracking() {
  const { user } = useAuth();
  const sessionId = useRef<string>(
    typeof window !== 'undefined'
      ? (sessionStorage.getItem('md_session') || (() => {
          const id = crypto.randomUUID();
          sessionStorage.setItem('md_session', id);
          return id;
        })())
      : ''
  );

  const track = useCallback(async (eventName: EventName, options: TrackOptions) => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/track-event`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            event_name: eventName,
            feature: options.feature,
            metadata: options.metadata || {},
            session_id: sessionId.current,
          }),
        }
      ).catch(() => {});
    } catch {
      // silent
    }
  }, [user]);

  return { track };
}
