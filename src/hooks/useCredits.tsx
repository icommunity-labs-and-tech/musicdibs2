import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (data) setCredits(data.available_credits);
    };
    fetch();

    const channel = supabase
      .channel('credits-hook')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const c = (payload.new as any).available_credits;
        if (typeof c === 'number') setCredits(c);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const hasEnough = (cost: number) => credits !== null && credits >= cost;

  return { credits, hasEnough };
}
