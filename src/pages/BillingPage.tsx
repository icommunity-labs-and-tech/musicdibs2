import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, Receipt, ArrowRight, ExternalLink, Loader2, Download, Eye, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

const PLAN_LABELS: Record<string, string> = {
  Free: 'Free',
  Monthly: 'Mensual',
  Annual: 'Anual',
};

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
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid: { label: 'Pagada', className: 'bg-green-500/10 text-green-600 border-green-500/20' },
  open: { label: 'Pendiente', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  draft: { label: 'Borrador', className: 'bg-muted text-muted-foreground border-border' },
  void: { label: 'Anulada', className: 'bg-muted text-muted-foreground border-border' },
  uncollectible: { label: 'Incobrable', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Listen for realtime changes
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

  // Load invoices
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
      toast.error('Error al cargar más facturas');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('No se pudo obtener el enlace del portal');
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al abrir el portal de gestión';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const planLabel = plan ? (PLAN_LABELS[plan] || plan) : '...';

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">Facturación</h2>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Plan actual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">{planLabel}</p>
              <p className="text-sm text-muted-foreground">
                {cancelAtPeriodEnd
                  ? `Cancelada — acceso hasta ${subscriptionEnd ? new Date(subscriptionEnd).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' }) : 'fin del período'}`
                  : plan === 'Free' ? 'Sin suscripción activa' : plan === 'Annual' ? 'Renovación anual' : 'Renovación mensual'}
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
              {cancelAtPeriodEnd ? 'Cancelada' : plan === 'Free' ? 'Free' : 'Activo'}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/credits')}>
              {plan === 'Free' ? 'Ver planes' : 'Cambiar plan'} <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
            {plan && plan !== 'Free' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                )}
                Gestionar suscripción
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> Historial de facturas
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
              No hay facturas todavía.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Importe</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const st = STATUS_MAP[inv.status ?? ''] ?? { label: inv.status ?? '—', className: 'bg-muted text-muted-foreground border-border' };
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium text-xs">
                          {inv.number || inv.id.slice(0, 12)}
                          {inv.description && (
                            <span className="block text-muted-foreground font-normal truncate max-w-[180px]">
                              {inv.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(inv.created)}
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
                                title="Ver factura"
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
                                title="Descargar PDF"
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
                    Cargar más
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
