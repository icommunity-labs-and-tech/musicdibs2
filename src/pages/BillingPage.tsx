import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Receipt, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setPlan(data?.subscription_plan ?? 'Free');
      });
  }, [user]);

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
              <p className="font-semibold">{plan ?? '...'}</p>
              <p className="text-sm text-muted-foreground">
                {plan === 'Free' ? 'Sin suscripción activa' : 'Renovación mensual'}
              </p>
            </div>
            <Badge
              className={plan === 'Free'
                ? 'bg-muted text-muted-foreground border-border'
                : 'bg-primary/10 text-primary border-primary/20'}
              variant="outline"
            >
              {plan === 'Free' ? 'Free' : 'Activo'}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
              Cambiar plan <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
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
          <div className="text-sm text-muted-foreground text-center py-6">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Las facturas estarán disponibles próximamente.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
