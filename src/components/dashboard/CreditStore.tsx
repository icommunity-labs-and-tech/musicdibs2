import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Loader2, CheckCircle2, Sparkles, Calendar, Clock, FileText, AlertCircle, Zap, ChevronDown, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { CancellationSurveyModal } from './CancellationSurveyModal';

const ANNUAL_OPTIONS = [
  { planId: 'annual_100',  credits: 100,  price: '59,90 €',  pricePerCredit: '0,60 €' },
  { planId: 'annual_200',  credits: 200,  price: '109,90 €', pricePerCredit: '0,55 €' },
  { planId: 'annual_300',  credits: 300,  price: '149,90 €', pricePerCredit: '0,50 €' },
  { planId: 'annual_500',  credits: 500,  price: '229,90 €', pricePerCredit: '0,46 €' },
  { planId: 'annual_1000', credits: 1000, price: '399,90 €', pricePerCredit: '0,40 €' },
];

const TOPUP_OPTIONS = [
  { planId: 'topup_10',  credits: 10,  price: '9 €',   pricePerCredit: '0,90 €' },
  { planId: 'topup_25',  credits: 25,  price: '19 €',  pricePerCredit: '0,76 €' },
  { planId: 'topup_50',  credits: 50,  price: '35 €',  pricePerCredit: '0,70 €' },
  { planId: 'topup_100', credits: 100, price: '65 €',  pricePerCredit: '0,65 €' },
  { planId: 'topup_200', credits: 200, price: '119 €', pricePerCredit: '0,60 €' },
];

export function CreditStore({ compact, cancelAtPeriodEnd: externalCancel }: { compact?: boolean; cancelAtPeriodEnd?: boolean }) {
  const { t } = useTranslation();
  const cs = 'dashboard.creditStore';
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(externalCancel ?? false);
  const [selectedAnnual, setSelectedAnnual] = useState('annual_100');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const { user } = useAuth();

  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (externalCancel !== undefined) setCancelAtPeriodEnd(externalCancel);
  }, [externalCancel]);

  useEffect(() => {
    if (paymentStatus !== 'success' || !sessionId || !user) return;
    supabase.functions.invoke('verify-payment', { body: { sessionId } }).then(({ data }) => {
      if (data?.fulfilled && !data?.already) toast.success(t(`${cs}.creditsAdded`, { n: data.credits }));
    });
  }, [paymentStatus, sessionId, user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('subscription_plan').eq('user_id', user.id).single()
      .then(({ data }) => {
        const plan = data?.subscription_plan ?? 'Free';
        if (plan === 'Annual') setCurrentPlanId('annual_100');
        else if (plan === 'Monthly') setCurrentPlanId('monthly');
        else setCurrentPlanId('');
      });
    supabase.functions.invoke('check-subscription').then(({ data }) => {
      if (data?.cancel_at_period_end) setCancelAtPeriodEnd(true);
    });
  }, [user]);

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    setError(null);
    try {
      // Include attribution data from localStorage
      let attribution: Record<string, string> = {};
      try {
        const raw = localStorage.getItem('md_attribution');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.utm_source) attribution.utm_source = parsed.utm_source;
          if (parsed.utm_medium) attribution.utm_medium = parsed.utm_medium;
          if (parsed.utm_campaign) attribution.utm_campaign = parsed.utm_campaign;
          if (parsed.utm_content) attribution.utm_content = parsed.utm_content;
          if (parsed.utm_term) attribution.utm_term = parsed.utm_term;
          if (parsed.coupon) attribution.coupon_code = parsed.coupon;
          if (parsed.ref) attribution.referrer_code = parsed.ref;
          if (parsed.referrer) attribution.referrer = parsed.referrer;
          if (parsed.landing_path) attribution.landing_path = parsed.landing_path;
          if (parsed.utm_campaign) attribution.attributed_campaign_name = parsed.utm_campaign;
        }
      } catch { /* ignore */ }
      const { data, error: fnError } = await supabase.functions.invoke('create-credit-checkout', { body: { planId, attribution } });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      if (data?.already_subscribed) { toast.info(data.message); return; }
      if (data?.switched || data?.reactivated) { toast.success(data.message); if (data.reactivated) setCancelAtPeriodEnd(false); return; }
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      setError(err?.message || t(`${cs}.paymentError`));
    } finally {
      setLoading(null);
    }
  };




  const handleConfirmCancel = async (reason: string) => {
    setLoading('cancel');
    try {
      const { data } = await supabase.functions.invoke('create-credit-checkout', {
        body: { action: 'cancel_renewal', cancellation_reason: reason },
      });
      toast.success(data?.message || t(`${cs}.renewalCancelled`));
      setCancelAtPeriodEnd(true);
    } catch {
      setError(t(`${cs}.purchaseError`));
      throw new Error('cancel failed');
    } finally {
      setLoading(null);
    }
  };

  const selectedAnnualOption = ANNUAL_OPTIONS.find(o => o.planId === selectedAnnual)!;
  const isAnnualActive = currentPlanId?.startsWith('annual');
  const isMonthlyActive = currentPlanId === 'monthly';
  const hasActiveSubscription = (isAnnualActive || isMonthlyActive) && !cancelAtPeriodEnd;

  return (
    <div className="space-y-6">
      {paymentStatus === 'success' && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">{t(`${cs}.paymentSuccessFull`)}</p>
              <p className="text-xs text-muted-foreground">{t(`${cs}.creditsAdding`)}</p>
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

      {/* SUSCRIPCIONES */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">{t(`${cs}.subscriptions`)}</h3>
        <div className="grid gap-4 sm:grid-cols-2">

          {/* PLAN ANUAL con selector */}
          <Card className={`border-border/40 shadow-sm relative ${isAnnualActive && !cancelAtPeriodEnd ? 'ring-2 ring-primary bg-primary/5' : 'ring-1 ring-primary/40'}`}>
            {isAnnualActive && !cancelAtPeriodEnd && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary">
                <CheckCircle2 className="h-3 w-3" /> {t(`${cs}.yourPlan`)}
              </Badge>
            )}
            {!isAnnualActive && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1">
                <Sparkles className="h-3 w-3" /> {t(`${cs}.bestValue`)}
              </Badge>
            )}
            <CardHeader className="pb-1 pt-5">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">{t(`${cs}.annualPlan`)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t(`${cs}.selectCapacity`)}</p>
                <Select value={selectedAnnual} onValueChange={setSelectedAnnual}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ANNUAL_OPTIONS.map(o => (
                      <SelectItem key={o.planId} value={o.planId}>
                        {t(`${cs}.nCredits`, { n: o.credits })} — {o.price}{t(`${cs}.perYear`)} ({o.pricePerCredit}/cr.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <span className="text-2xl font-bold">{selectedAnnualOption.credits}</span>
                <span className="text-sm text-muted-foreground ml-1">{t(`${cs}.creditsPerYear`)}</span>
              </div>
              <p className="text-lg font-semibold">{selectedAnnualOption.price}<span className="text-sm font-normal text-muted-foreground">{t(`${cs}.perYear`)}</span></p>
              <p className="text-xs text-muted-foreground">{selectedAnnualOption.pricePerCredit} {t(`${cs}.perCredit`)} · {t(`${cs}.autoRenewalAnnual`)}</p>
              <Button className="w-full" onClick={() => handleBuy(selectedAnnual)} disabled={loading !== null}>
                {loading === selectedAnnual ? <Loader2 className="h-4 w-4 animate-spin" /> : isAnnualActive ? t(`${cs}.changeCapacity`) : t(`${cs}.subscribe`)}
              </Button>
            </CardContent>
          </Card>

          {/* PLAN MENSUAL */}
          <Card className={`border-border/40 shadow-sm relative ${isMonthlyActive && !cancelAtPeriodEnd ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
            {isMonthlyActive && !cancelAtPeriodEnd && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1 bg-primary">
                <CheckCircle2 className="h-3 w-3" /> {t(`${cs}.yourPlan`)}
              </Badge>
            )}
            <CardHeader className="pb-1 pt-5">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">{t(`${cs}.monthlyPlan`)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-2xl font-bold">8</span>
                <span className="text-sm text-muted-foreground ml-1">{t(`${cs}.creditsPerMonth`)}</span>
              </div>
              <p className="text-lg font-semibold">6,90 €<span className="text-sm font-normal text-muted-foreground">{t(`${cs}.perMonth`)}</span></p>
              <p className="text-xs text-muted-foreground">0,86 € {t(`${cs}.perCredit`)} · {t(`${cs}.noSignupFee`)}</p>
              <Button className="w-full" variant="outline" onClick={() => handleBuy('monthly')} disabled={loading !== null || (isMonthlyActive && !cancelAtPeriodEnd)}>
                {loading === 'monthly' ? <Loader2 className="h-4 w-4 animate-spin" /> : isMonthlyActive && !cancelAtPeriodEnd ? t(`${cs}.currentPlan`) : t(`${cs}.subscribe`)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* PAGO ÚNICO */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between rounded-lg border border-border/40 bg-card px-4 py-3 text-left shadow-sm hover:bg-muted/50 transition-colors">
            <h3 className="text-sm font-semibold">{t(`${cs}.oneTimePayment`)}</h3>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {/* INDIVIDUAL */}
          <Card className="border-border/40 shadow-sm">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-medium">{t(`${cs}.oneCredit`)}</p>
                  <p className="text-xs text-muted-foreground">{t(`${cs}.punctualRegistration`)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm font-bold">7 €</p>
                <Button size="sm" variant="outline" onClick={() => handleBuy('individual')} disabled={loading !== null}>
                  {loading === 'individual' ? <Loader2 className="h-3 w-3 animate-spin" /> : t(`${cs}.buy`)}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TOP-UPS — solo con suscripción activa */}
          {hasActiveSubscription ? (
            TOPUP_OPTIONS.map(topup => (
              <Card key={topup.planId} className="border-border/40 shadow-sm">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{t(`${cs}.topup`)} {t(`${cs}.nCredits`, { n: topup.credits })}</p>
                      <p className="text-xs text-muted-foreground">{topup.pricePerCredit} {t(`${cs}.perCredit`)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold">{topup.price}</p>
                    <Button size="sm" variant="outline" onClick={() => handleBuy(topup.planId)} disabled={loading !== null}>
                      {loading === topup.planId ? <Loader2 className="h-3 w-3 animate-spin" /> : t(`${cs}.buy`)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="border-dashed border-primary/30 bg-primary/5 shadow-none">
              <CardContent className="flex flex-col items-center gap-2 py-4 text-center">
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 cursor-help">
                        <Lock className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="border-primary/40 text-primary text-xs">
                          {t(`${cs}.subscribersOnly`)}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px] text-center text-xs">
                      {t(`${cs}.subscribersBenefits`)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground max-w-xs">{t(`${cs}.topupRequiresSubscription`)}</p>
                <Button size="sm" variant="default" className="mt-1" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  <Sparkles className="h-3 w-3 mr-1" /> {t(`${cs}.seeSubscriptions`)}
                </Button>
              </CardContent>
            </Card>
          )}
        </CollapsibleContent>
      </Collapsible>


      <CancellationSurveyModal
        open={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        onConfirmCancel={handleConfirmCancel}
        planType={isAnnualActive ? 'annual' : isMonthlyActive ? 'monthly' : undefined}
      />

      <Card className="border-border/40 shadow-sm">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground text-center">
            <ShoppingBag className="h-3.5 w-3.5 inline mr-1" />
            {t(`${cs}.stripeNote`)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
