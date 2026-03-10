import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, CheckCircle2, Sparkles, Calendar, Clock, FileText, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'annual',
    name: 'Anual',
    credits: 120,
    price: '59,90 €',
    period: '/año',
    popular: true,
    icon: Calendar,
    description: '120 créd/año',
    perCredit: '0,50 €/créd',
    rank: 2, // higher = better plan
  },
  {
    id: 'monthly',
    name: 'Mensual',
    credits: 3,
    price: '6,90 €',
    period: '/mes',
    icon: Clock,
    description: '3 créd/mes',
    perCredit: '2,30 €/créd',
    rank: 1,
  },
  {
    id: 'individual',
    name: 'Individual',
    credits: 1,
    price: '11,90 €',
    period: '',
    icon: FileText,
    description: '1 crédito',
    perCredit: '11,90 €/créd',
    rank: 0,
  },
];

const PROFILE_PLAN_TO_ID: Record<string, string> = {
  Annual: 'annual',
  Monthly: 'monthly',
  Free: '',
};

function getButtonConfig(planId: string, currentPlanId: string | null) {
  if (planId === 'individual') {
    return { label: 'Comprar', variant: 'outline' as const, icon: null, disabled: false };
  }

  if (!currentPlanId || currentPlanId === '') {
    // No subscription — show subscribe
    return { label: 'Suscribirse', variant: planId === 'annual' ? 'default' as const : 'outline' as const, icon: null, disabled: false };
  }

  if (currentPlanId === planId) {
    return { label: 'Tu plan', variant: 'secondary' as const, icon: null, disabled: true };
  }

  const currentRank = PLANS.find(p => p.id === currentPlanId)?.rank ?? 0;
  const targetRank = PLANS.find(p => p.id === planId)?.rank ?? 0;

  if (targetRank > currentRank) {
    return { label: 'Upgrade', variant: 'default' as const, icon: ArrowUp, disabled: false };
  } else {
    return { label: 'Downgrade', variant: 'outline' as const, icon: ArrowDown, disabled: false };
  }
}

export function CreditStore({ compact }: { compact?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const { user } = useAuth();
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  // Verify and fulfill payment when returning from Stripe checkout
  useEffect(() => {
    if (paymentStatus !== 'success' || !sessionId || !user) return;
    supabase.functions.invoke('verify-payment', {
      body: { sessionId },
    }).then(({ data, error }) => {
      if (error) console.error('Verify payment error:', error);
      else if (data?.fulfilled && !data?.already) {
        toast.success(`¡${data.credits} crédito(s) añadido(s)!`);
      }
    });
  }, [paymentStatus, sessionId, user]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        const plan = data?.subscription_plan ?? 'Free';
        setCurrentPlanId(PROFILE_PLAN_TO_ID[plan] ?? '');
      });
  }, [user]);

  // Listen for realtime profile changes to update current plan
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('credit-store-plan')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const plan = payload.new?.subscription_plan ?? 'Free';
        setCurrentPlanId(PROFILE_PLAN_TO_ID[plan] ?? '');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-credit-checkout', {
        body: { planId },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      // If plan was switched server-side (upgrade/downgrade)
      if (data?.switched) {
        toast.success(data.message || 'Plan cambiado correctamente');
        setCurrentPlanId(planId);
        setLoading(null);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      const msg = err?.message || 'Error al procesar la compra';
      setError(msg);
      console.error('Checkout error:', err);
    }
    setLoading(null);
  };

  if (compact) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" /> Créditos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentStatus === 'success' && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs">
              <CheckCircle2 className="h-4 w-4" /> ¡Pago completado! Créditos en camino.
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
          <div className="space-y-2">
            {PLANS.map((plan) => {
              const Icon = plan.icon;
              const btn = getButtonConfig(plan.id, currentPlanId);
              const BtnIcon = btn.icon;
              return (
                <div
                  key={plan.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${
                    currentPlanId === plan.id
                      ? 'border-primary bg-primary/10'
                      : plan.popular
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/40'
                  }`}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plan.name}</span>
                      {currentPlanId === plan.id && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5 bg-primary">
                          Activo
                        </Badge>
                      )}
                      {plan.popular && currentPlanId !== plan.id && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> Top
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{plan.description} · {plan.perCredit}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold">{plan.price}<span className="text-xs font-normal text-muted-foreground">{plan.period}</span></div>
                    <Button
                      variant={btn.variant}
                      size="sm"
                      className="h-7 text-xs mt-1"
                      onClick={() => handleBuy(plan.id)}
                      disabled={loading !== null || btn.disabled}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          {BtnIcon && <BtnIcon className="h-3 w-3 mr-1" />}
                          {btn.label}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Pagos seguros con Stripe. Créditos no consumidos se pierden al finalizar el periodo.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Full layout (used in dedicated credits page)
  return (
    <div className="space-y-4">
      {paymentStatus === 'success' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">¡Pago completado!</p>
              <p className="text-xs text-muted-foreground">Tus créditos se añadirán en unos momentos.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const btn = getButtonConfig(plan.id, currentPlanId);
          const BtnIcon = btn.icon;
          const isActive = currentPlanId === plan.id;
          return (
            <Card
              key={plan.id}
              className={`border-border/40 shadow-sm relative ${
                isActive
                  ? 'ring-2 ring-primary bg-primary/5'
                  : plan.popular
                    ? 'ring-1 ring-primary/40'
                    : ''
              }`}
            >
              {isActive && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary">
                  <CheckCircle2 className="h-3 w-3" /> Tu plan
                </Badge>
              )}
              {plan.popular && !isActive && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" /> Mejor valor
                </Badge>
              )}
              <CardHeader className="pb-1 pt-5">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-2xl font-bold">{plan.credits}</span>
                  <span className="text-sm text-muted-foreground ml-1">créditos</span>
                </div>
                <p className="text-lg font-semibold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
                <p className="text-xs text-muted-foreground">{plan.perCredit}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{plan.description}</p>
                <Button
                  className="w-full"
                  variant={btn.variant}
                  size="sm"
                  onClick={() => handleBuy(plan.id)}
                  disabled={loading !== null || btn.disabled}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {BtnIcon && <BtnIcon className="h-3.5 w-3.5 mr-1" />}
                      {btn.label}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground text-center">
            <ShoppingBag className="h-3.5 w-3.5 inline mr-1" />
            Los pagos se procesan de forma segura con Stripe. Los créditos de suscripciones se renuevan automáticamente y los no consumidos se pierden al finalizar el periodo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
