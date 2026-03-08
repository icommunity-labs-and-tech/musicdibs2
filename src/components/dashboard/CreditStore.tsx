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
    name: 'Suscripción Anual',
    credits: 120,
    price: '59,90 €',
    period: '/año',
    popular: true,
    icon: Calendar,
    description: '120 créditos al año · Los créditos no consumidos se pierden al finalizar el periodo',
    perCredit: '0,50 €',
  },
  {
    id: 'monthly',
    name: 'Suscripción Mensual',
    credits: 3,
    price: '6,90 €',
    period: '/mes',
    icon: Clock,
    description: '3 créditos al mes · Cuota de alta: 6,90 € · Los créditos no consumidos se pierden al finalizar el mes',
    perCredit: '2,30 €',
  },
  {
    id: 'individual',
    name: 'Registro Individual',
    credits: 1,
    price: '11,90 €',
    period: '',
    icon: FileText,
    description: '1 crédito por registro · Sin compromiso · Compra tantos como necesites',
    perCredit: '11,90 €',
  },
];

export function CreditStore() {
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
                <p className="text-xs text-muted-foreground">{plan.perCredit} / crédito</p>
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
