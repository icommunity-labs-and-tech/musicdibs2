import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Receipt, ArrowRight, Loader2, Download, Eye, FileText, RefreshCw, Coins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { CancellationSurveyModal } from '@/components/dashboard/CancellationSurveyModal';

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  period_start: number;
  period_end: number;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
  payment_type?: 'subscription' | 'one_time';
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(ts: number, lang: string) {
  return new Date(ts * 1000).toLocaleDateString(lang, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const lang = i18n.resolvedLanguage || 'es';

  const STATUS_MAP: Record<string, { label: string; className: string }> = {
    paid: { label: t('dashboard.billing.statusPaid'), className: 'bg-green-500/10 text-green-600 border-green-500/20' },
    open: { label: t('dashboard.billing.statusOpen'), className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    draft: { label: t('dashboard.billing.statusDraft'), className: 'bg-muted text-muted-foreground border-border' },
    void: { label: t('dashboard.billing.statusVoid'), className: 'bg-muted text-muted-foreground border-border' },
    uncollectible: { label: t('dashboard.billing.statusUncollectible'), className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  const PLAN_LABELS: Record<string, string> = {
    Free: t('dashboard.billing.planFree'),
    Monthly: t('dashboard.billing.planMonthly'),
    Annual: t('dashboard.billing.planAnnual'),
  };

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadBillingState = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_plan')
        .eq('user_id', user.id)
        .single();

      if (mounted) {
        setPlan(profile?.subscription_plan ?? 'Free');
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error || !mounted) return;

      setPlan(data?.plan ?? profile?.subscription_plan ?? 'Free');
      setCancelAtPeriodEnd(data?.cancel_at_period_end ?? false);
      setSubscriptionEnd(data?.subscription_end ?? null);
    };

    loadBillingState();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('billing-plan')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        setPlan(payload.new?.subscription_plan ?? 'Free');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadInvoices = async () => {
      setInvoicesLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('list-invoices', {
          body: { limit: 20 },
        });
        if (error) throw error;
        if (mounted) {
          setInvoices(data?.invoices ?? []);
          setHasMore(data?.has_more ?? false);
        }
      } catch (err: any) {
        console.error('Error loading invoices:', err);
      } finally {
        if (mounted) setInvoicesLoading(false);
      }
    };

    loadInvoices();
    return () => { mounted = false; };
  }, [user]);

  const loadMoreInvoices = async () => {
    if (!invoices.length || loadingMore) return;
    setLoadingMore(true);
    try {
      const lastId = invoices[invoices.length - 1].id;
      const { data, error } = await supabase.functions.invoke('list-invoices', {
        body: { limit: 20, starting_after: lastId },
      });
      if (error) throw error;
      setInvoices((prev) => [...prev, ...(data?.invoices ?? [])]);
      setHasMore(data?.has_more ?? false);
    } catch (err: any) {
      toast.error(t('dashboard.billing.loadMoreError'));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleConfirmCancel = async (reason: string) => {
    setCancelling(true);
    try {
      const { data } = await supabase.functions.invoke('create-credit-checkout', {
        body: { action: 'cancel_renewal', cancellation_reason: reason },
      });
      toast.success(data?.message || t('dashboard.billing.renewalCancelled', 'Renovación cancelada'));
      setCancelAtPeriodEnd(true);
    } catch {
      toast.error(t('dashboard.billing.cancelError', 'Error al cancelar'));
      throw new Error('cancel failed');
    } finally {
      setCancelling(false);
    }
  };

  const planLabel = plan ? (PLAN_LABELS[plan] || plan) : '...';
  const hasActiveSubscription = plan && plan !== 'Free' && !cancelAtPeriodEnd;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">{t('dashboard.billing.title')}</h2>




      {/* Historial de facturas */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> {t('dashboard.billing.invoiceHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {t('dashboard.billing.noInvoices')}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('dashboard.billing.invoice')}</TableHead>
                    <TableHead>{t('dashboard.billing.date')}</TableHead>
                    <TableHead>{t('dashboard.billing.amount')}</TableHead>
                    <TableHead>{t('dashboard.billing.status')}</TableHead>
                    <TableHead className="text-right">{t('dashboard.billing.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const st = STATUS_MAP[inv.status ?? ''] ?? { label: inv.status ?? '—', className: 'bg-muted text-muted-foreground border-border' };
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-xs">
                          <div className="flex items-center gap-1.5">
                            {inv.payment_type === 'one_time' ? (
                              <Coins className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                            <div>
                              {inv.number || inv.id.slice(0, 12)}
                              {inv.description && (
                                <span className="block text-muted-foreground font-normal truncate max-w-[180px]">
                                  {inv.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(inv.created, lang)}
                        </TableCell>
                        <TableCell className="text-xs font-medium whitespace-nowrap">
                          {formatCurrency(inv.amount_paid || inv.amount_due, inv.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${st.className}`}>
                            {st.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.hosted_invoice_url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(inv.hosted_invoice_url!, '_blank')}
                                title={t('dashboard.billing.viewInvoice')}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {inv.invoice_pdf && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => window.open(inv.invoice_pdf!, '_blank')}
                                title={t('dashboard.billing.downloadPdf')}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMoreInvoices}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : null}
                    {t('dashboard.billing.loadMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Plan actual — al final */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> {t('dashboard.billing.currentPlan')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{planLabel}</p>
              <p className="text-sm text-muted-foreground">
                {cancelAtPeriodEnd
                  ? t('dashboard.billing.cancelledAccess', { date: subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString(lang, { day: '2-digit', month: 'long', year: 'numeric' }) : '' })
                  : plan === 'Free' ? t('dashboard.billing.noSubscription') : plan === 'Annual' ? t('dashboard.billing.renewalAnnual') : t('dashboard.billing.renewalMonthly')}
              </p>
            </div>
            <Badge
              className={cancelAtPeriodEnd
                ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                : plan === 'Free'
                  ? 'bg-muted text-muted-foreground border-border'
                  : 'bg-primary/10 text-primary border-primary/20'}
              variant="outline"
            >
              {cancelAtPeriodEnd ? t('dashboard.billing.cancelled') : plan === 'Free' ? 'Free' : t('dashboard.billing.active')}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/credits')}>
            {plan === 'Free' ? t('dashboard.billing.viewPlans') : t('dashboard.billing.changePlan')} <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          {hasActiveSubscription && (
            <span
              className="block mt-3 text-sm text-muted-foreground cursor-pointer hover:underline hover:text-foreground transition-colors"
              onClick={() => setCancelModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setCancelModalOpen(true)}
            >
              {t('dashboard.billing.cancelSubscription', 'Cancelar suscripción')}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Modal de cancelación */}
      <CancellationSurveyModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirmCancel={handleConfirmCancel}
        planType={plan === 'Annual' ? 'annual' : plan === 'Monthly' ? 'monthly' : undefined}
      />
    </div>
  );
}
