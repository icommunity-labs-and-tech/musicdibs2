import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, CheckCircle2, Sparkles, Calendar, Clock, FileText, AlertCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const PROFILE_PLAN_TO_ID: Record<string, string> = {
  Annual: 'annual',
  Monthly: 'monthly',
  Free: '',
};

function getButtonConfig(
  planId: string,
  currentPlanId: string | null,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (planId === 'individual') {
    if (currentPlanId && currentPlanId !== '') {
      return { label: t('dashboard.creditStore.cancelRenewal'), variant: 'outline' as const, icon: null, disabled: false };
    }
    return { label: t('dashboard.creditStore.buy'), variant: 'outline' as const, icon: null, disabled: false };
  }

  if (!currentPlanId || currentPlanId === '') {
    return { label: t('dashboard.creditStore.subscribe'), variant: planId === 'annual' ? 'default' as const : 'outline' as const, icon: null, disabled: false };
  }

  if (currentPlanId === planId) {
    return { label: t('dashboard.creditStore.yourPlan'), variant: 'secondary' as const, icon: null, disabled: true };
  }

  const currentRank = currentPlanId === 'annual' ? 2 : currentPlanId === 'monthly' ? 1 : 0;
  const targetRank = planId === 'annual' ? 2 : planId === 'monthly' ? 1 : 0;

  if (targetRank > currentRank) {
    return { label: t('dashboard.creditStore.upgrade'), variant: 'default' as const, icon: ArrowUp, disabled: false };
  } else {
    return { label: t('dashboard.creditStore.downgrade'), variant: 'outline' as const, icon: ArrowDown, disabled: false };
  }
}

export function CreditStore({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const { user } = useAuth();
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');
  const plans = useMemo(() => ([
    {
      id: 'annual',
      name: t('dashboard.creditStore.annual'),
      credits: 120,
      price: '59,90 €',
      period: t('dashboard.creditStore.perYear'),
      popular: true,
      icon: Calendar,
      description: t('dashboard.creditStore.creditsPerYear'),
      rank: 2,
    },
    {
      id: 'monthly',
      name: t('dashboard.creditStore.monthly'),
      credits: 3,
      price: '6,90 €',
      period: t('dashboard.creditStore.perMonth'),
      icon: Clock,
      description: t('dashboard.creditStore.creditsPerMonth'),
      rank: 1,
    },
    {
      id: 'individual',
      name: t('dashboard.creditStore.individual'),
      credits: 1,
      price: '11,90 €',
      period: '',
      icon: FileText,
      description: t('dashboard.creditStore.oneCredit'),
      rank: 0,
    },
  ]), [t]);

  // Verify and fulfill payment when returning from Stripe checkout
  useEffect(() => {
    if (paymentStatus !== 'success' || !sessionId || !user) return;
    supabase.functions.invoke('verify-payment', {
      body: { sessionId },
    }).then(({ data, error }) => {
      if (error) console.error('Verify payment error:', error);
      else if (data?.fulfilled && !data?.already) {
        toast.success(t('dashboard.creditStore.nCredits', { n: data.credits }));
      }
    });
  }, [paymentStatus, sessionId, t, user]);

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

      // If already on this plan
      if (data?.already_subscribed) {
        toast.info(data.message || t('dashboard.creditStore.alreadySubscribed'));
        setLoading(null);
        return;
      }

      // If renewal cancellation was requested (annual/monthly -> individual)
      if (data?.cancelled_to_individual) {
        toast.success(data.message || t('dashboard.creditStore.renewalCancelled'));
        if (data?.plan) {
          setCurrentPlanId(PROFILE_PLAN_TO_ID[data.plan] ?? currentPlanId);
        }
        setLoading(null);
        return;
      }

      // If plan was switched/reactivated server-side
      if (data?.switched) {
        toast.success(data.message || t('dashboard.creditStore.planChanged'));
        const resolvedPlanId = data?.plan ? (PROFILE_PLAN_TO_ID[data.plan] ?? planId) : planId;
        setCurrentPlanId(resolvedPlanId);
        setLoading(null);
        return;
      }

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      const msg = err?.message || t('dashboard.creditStore.purchaseError');
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
            <ShoppingBag className="h-4 w-4 text-primary" /> {t('dashboard.creditStore.credits')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentStatus === 'success' && (
            <div className="flex items-center gap-2 text-emerald-600 text-xs">
              <CheckCircle2 className="h-4 w-4" /> {t('dashboard.creditStore.paymentSuccess')}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
          <div className="space-y-2">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const btn = getButtonConfig(plan.id, currentPlanId, t);
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
                          {t('dashboard.creditStore.active')}
                        </Badge>
                      )}
                      {plan.popular && currentPlanId !== plan.id && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" /> {t('dashboard.creditStore.top')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{plan.description}</span>
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
            {t('dashboard.creditStore.stripeNote')}
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
                <p className="text-sm font-medium">{t('dashboard.creditStore.paymentSuccessFull')}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.creditStore.creditsAdding')}</p>
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
        {plans.map((plan) => {
          const Icon = plan.icon;
          const btn = getButtonConfig(plan.id, currentPlanId, t);
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
                  <CheckCircle2 className="h-3 w-3" /> {t('dashboard.creditStore.yourPlan')}
                </Badge>
              )}
              {plan.popular && !isActive && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1">
                  <Sparkles className="h-3 w-3" /> {t('dashboard.creditStore.bestValue')}
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
                  <span className="text-sm text-muted-foreground ml-1">{t('dashboard.creditChart.credits')}</span>
                </div>
                <p className="text-lg font-semibold">
                  {plan.price}
                  <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                </p>
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
            {t('dashboard.creditStore.stripeNoteFull')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
