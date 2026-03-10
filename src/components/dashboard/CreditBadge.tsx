import { useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';

export function CreditBadge() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Initial fetch
    const fetchCredits = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (data) setCredits(data.available_credits);
    };
    fetchCredits();

    // Realtime subscription
    const channel = supabase
      .channel('credits-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newCredits = (payload.new as any).available_credits;
          if (typeof newCredits === 'number') {
            setCredits(newCredits);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (credits === null) return null;

  return (
    <Link
      to="/dashboard/credits"
      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
      title="Créditos disponibles"
    >
      <Coins className="h-3.5 w-3.5" />
      <span className="tabular-nums">{credits}</span>
    </Link>
  );
}
