import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';

const PLANS = [
  { id: 'basic', name: 'Básico', credits: 10, price: '9,99 €' },
  { id: 'plus', name: 'Plus', credits: 50, price: '29,99 €', popular: true },
  { id: 'pro', name: 'Pro', credits: 200, price: '79,99 €' },
];

export function CreditStore() {
  const [loading, setLoading] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const paymentStatus = searchParams.get('payment');

  const handleBuy = async (planId: string) => {
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        body: { planId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
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

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.id}
            className={`border-border/40 shadow-sm relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}
          >
            {plan.popular && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 gap-1">
                <Sparkles className="h-3 w-3" /> Popular
              </Badge>
            )}
            <CardHeader className="pb-1 pt-5">
              <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-2xl font-bold">{plan.credits}</span>
                <span className="text-sm text-muted-foreground ml-1">créditos</span>
              </div>
              <p className="text-lg font-semibold">{plan.price}</p>
              <p className="text-xs text-muted-foreground">
                {(parseFloat(plan.price.replace(',', '.').replace(' €', '')) / plan.credits).toFixed(2).replace('.', ',')} € / crédito
              </p>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleBuy(plan.id)}
                disabled={loading !== null}
              >
                {loading === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Comprar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/40 shadow-sm">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground text-center">
            <ShoppingBag className="h-3.5 w-3.5 inline mr-1" />
            Los pagos se procesan de forma segura con Stripe. Los créditos se añaden automáticamente tras el pago.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
