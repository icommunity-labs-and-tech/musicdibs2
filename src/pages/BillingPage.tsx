import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CreditCard, Receipt, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function BillingPage() {
  const navigate = useNavigate();

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
              <p className="font-semibold">Plan Plus</p>
              <p className="text-sm text-muted-foreground">Renovación mensual</p>
            </div>
            <Badge className="bg-primary/10 text-primary border-primary/20" variant="outline">Activo</Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/pricing')}>
              Cambiar plan <ArrowRight className="h-3.5 w-3.5 ml-1" />
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
