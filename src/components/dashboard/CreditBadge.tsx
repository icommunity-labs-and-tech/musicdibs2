import { useEffect, useState } from 'react';
import { Coins, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';

interface RecentTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

export function CreditBadge() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const [credits, setCredits] = useState<number | null>(null);
  const [recent, setRecent] = useState<RecentTransaction[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchCredits = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('available_credits')
        .eq('user_id', user.id)
        .single();
      if (data) setCredits(data.available_credits);
    };

    const fetchRecent = async () => {
      const { data } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (data) setRecent(data);
    };

    fetchCredits();
    fetchRecent();

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
          if (typeof newCredits === 'number') setCredits(newCredits);
          fetchRecent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (credits === null) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        <button
          className={`relative flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            credits < 3
              ? 'bg-destructive/15 text-destructive hover:bg-destructive/25 animate-pulse'
              : 'bg-primary/10 text-primary hover:bg-primary/20'
          }`}
          title={t('dashboard.creditBadge.tooltip')}
        >
          <Coins className="h-3.5 w-3.5" />
          <span className="tabular-nums">{credits}</span>
          {credits < 3 && (
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-72 p-0">
        <div className="p-3 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{t('dashboard.creditBadge.currentBalance')}</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{credits}</span>
          </div>
        </div>

        <div className="p-3 space-y-2">
          <span className="text-xs font-medium text-muted-foreground">{t('dashboard.creditBadge.recentMovements')}</span>
          {recent.length === 0 ? (
            <p className="text-xs text-muted-foreground/70">{t('dashboard.creditBadge.noMovements')}</p>
          ) : (
            <ul className="space-y-1.5">
              {recent.map((tx) => (
                <li key={tx.id} className="flex items-center justify-between text-xs">
                  <span className="truncate max-w-[160px] text-foreground/80">
                    {tx.description || tx.type}
                  </span>
                  <span className={`tabular-nums font-medium ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount} · {formatDate(tx.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-border p-2">
          <Link
            to="/dashboard/credits"
            className="flex items-center justify-center gap-1.5 w-full rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-1.5 transition-colors"
          >
            {t('dashboard.creditBadge.buyCredits')} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
