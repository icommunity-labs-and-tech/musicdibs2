import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Share2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface DistributeButtonProps {
  workId: string;
  distributedAt: string | null;
  currentClicks?: number;
  variant?: 'default' | 'banner';
  onDistributed?: () => void;
}

export function DistributeButton({ workId, distributedAt, currentClicks = 0, variant = 'default', onDistributed }: DistributeButtonProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [distributed, setDistributed] = useState(!!distributedAt);

  const handleClick = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase
        .from('works')
        .update({
          distributed_at: distributedAt ?? new Date().toISOString(),
          distribution_clicks: currentClicks + 1,
        })
        .eq('id', workId)
        .eq('user_id', user.id);

      setDistributed(true);
      onDistributed?.();
    } catch (e) {
      console.error('Error tracking distribution click:', e);
    }
    setLoading(false);
    window.open('https://dist.musicdibs.com', '_blank', 'noopener');
  };

  const formattedDate = distributedAt
    ? new Date(distributedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  if (variant === 'banner') {
    return (
      <Button variant="blue" size="sm" onClick={handleClick} disabled={loading} className="gap-1.5">
        <Share2 className="h-3.5 w-3.5" />
        Distribuir ahora
      </Button>
    );
  }

  if (distributed || distributedAt) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 w-full gap-1 border-emerald-500/30 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
              onClick={handleClick}
              disabled={loading}
            >
              <CheckCircle2 className="h-3 w-3" />
              Distribuido
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Distribuido el {formattedDate}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button variant="blue" size="sm" className="text-xs h-7 w-full gap-1" onClick={handleClick} disabled={loading}>
      <Share2 className="h-3 w-3" />
      Distribuir
    </Button>
  );
}
