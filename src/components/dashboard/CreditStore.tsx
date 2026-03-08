import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, CheckCircle2, Sparkles, Calendar, Clock, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  },
];

export function CreditStore({ compact }: { compact?: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('payment');

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-credit-checkout', {
        body: { planId },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
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
              return (
                <div
                  key={plan.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${plan.popular ? 'border-primary bg-primary/5' : 'border-border/40'}`}
                >
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{plan.name}</span>
                      {plan.popular && (
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
                      variant={plan.popular ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs mt-1"
                      onClick={() => handleBuy(plan.id)}
                      disabled={loading !== null}
                    >
                      {loading === plan.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : plan.id === 'individual' ? 'Comprar' : 'Suscribirse'}
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
          return (
            <Card
              key={plan.id}
              className={`border-border/40 shadow-sm relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
            >
              {plan.popular && (
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
                  variant={plan.popular ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleBuy(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : plan.id === 'individual' ? (
                    'Comprar'
                  ) : (
                    'Suscribirse'
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
