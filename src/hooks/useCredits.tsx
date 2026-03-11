import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useCredits() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const prevCreditsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCredits(data.available_credits);
        prevCreditsRef.current = data.available_credits;
      }
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
        if (typeof c === 'number') {
          const prev = prevCreditsRef.current;
          setCredits(c);
          prevCreditsRef.current = c;

          // Toast when credits reach 0 after a deduction
          if (c === 0 && prev !== null && prev > 0) {
            toast.warning('Te has quedado sin créditos', {
              description: 'Compra más créditos para seguir usando las herramientas.',
              action: {
                label: 'Comprar',
                onClick: () => { window.location.href = '/dashboard/credits'; },
              },
              duration: 8000,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const hasEnough = (cost: number) => credits !== null && credits >= cost;

  return { credits, hasEnough };
}
