import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CreditCard, X, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

type AlertType = 'payment_failed' | 'subscription_issue';

interface PaymentAlert {
  id: string;
  type: AlertType;
  description: string;
  created_at: string;
}

export function PaymentAlertBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const fetchAlerts = async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('credit_transactions')
        .select('id, type, description, created_at')
        .eq('user_id', user.id)
        .in('type', ['payment_failed', 'subscription_issue'])
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false })
        .limit(3);

      if (data) setAlerts(data as PaymentAlert[]);
    };

    fetchAlerts();

    // Listen for new alerts in realtime
    const channel = supabase
      .channel('payment-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'credit_transactions',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const row = payload.new as any;
        if (row.type === 'payment_failed' || row.type === 'subscription_issue') {
          setAlerts(prev => [row as PaymentAlert, ...prev].slice(0, 3));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map(alert => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            alert.type === 'payment_failed'
              ? 'border-destructive/40 bg-destructive/5 text-destructive'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
          }`}
        >
          {alert.type === 'payment_failed' ? (
            <CreditCard className="h-4 w-4 mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span>{alert.description}</span>
            <button
              onClick={() => navigate('/dashboard/billing')}
              className="inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 hover:opacity-80 transition-opacity whitespace-nowrap"
            >
              {t('dashboard.paymentAlert.managePayment')} <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(alert.id))}
            className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
