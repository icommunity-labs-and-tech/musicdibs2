import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Share2, CheckCircle2, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface DistributeButtonProps {
  workId: string;
  distributedAt: string | null;
  currentClicks?: number;
  variant?: 'default' | 'banner';
  onDistributed?: () => void;
}

export function DistributeButton({ workId, distributedAt, currentClicks = 0, variant = 'default', onDistributed }: DistributeButtonProps) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [distributed, setDistributed] = useState(!!distributedAt);
  const [isAnnual, setIsAnnual] = useState<boolean | null>(null);
  const locale = i18n.resolvedLanguage === 'pt-BR' ? 'pt-BR' : (i18n.resolvedLanguage || i18n.language || 'es');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setIsAnnual(data?.subscription_plan === 'Annual');
      });
  }, [user]);

  const handleClick = () => {
    if (!isAnnual) return;
    // Open link FIRST (synchronous) to avoid popup blocker
    window.open('https://dist.musicdibs.com', '_blank', 'noopener');

    if (!user) return;
    setLoading(true);
    // Track click in background — no toast, no blocking
    supabase
      .from('works')
      .update({
        distributed_at: distributedAt ?? new Date().toISOString(),
        distribution_clicks: currentClicks + 1,
      })
      .eq('id', workId)
      .eq('user_id', user.id)
      .then(() => {
        setDistributed(true);
        onDistributed?.();
        setLoading(false);
      }, (e) => {
        console.error('Error tracking distribution click:', e);
        setLoading(false);
      });
  };

  const formattedDate = distributedAt
    ? new Date(distributedAt).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  const notAnnual = isAnnual === false;

  if (variant === 'banner') {
    if (notAnnual) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60">
                <Lock className="h-3.5 w-3.5" />
                {t('dashboard.distribute.bannerButton')}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('dashboard.distribute.annualOnly', { defaultValue: 'Disponible solo con suscripción anual' })}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return (
      <Button variant="blue" size="sm" onClick={handleClick} disabled={loading} className="gap-1.5">
        <Share2 className="h-3.5 w-3.5" />
        {t('dashboard.distribute.bannerButton')}
      </Button>
    );
  }

  if (distributed || distributedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="inline-flex items-center justify-center text-xs h-7 w-full gap-1 rounded-md border border-emerald-500/30 text-emerald-600 bg-emerald-500/5 px-3 cursor-default"
            >
              <CheckCircle2 className="h-3 w-3" />
              {t('dashboard.distribute.distributed')}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard.distribute.distributedOn', { date: formattedDate })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (notAnnual) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs h-7 w-full gap-1 opacity-60" disabled>
              <Lock className="h-3 w-3" />
              {t('dashboard.distribute.button')}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard.distribute.annualOnly', { defaultValue: 'Disponible solo con suscripción anual' })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button variant="blue" size="sm" className="text-xs h-7 w-full gap-1" onClick={handleClick} disabled={loading}>
      <Share2 className="h-3 w-3" />
      {t('dashboard.distribute.button')}
    </Button>
  );
}
