import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export function CreditStore() {
  const navigate = useNavigate();

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" /> Tienda
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Para registrar una obra necesitas créditos. Cada registro consume 1 crédito.
        </p>
        <Button variant="hero" className="w-full" size="sm" onClick={() => navigate('/pricing')}>
          Conseguir créditos
        </Button>
      </CardContent>
    </Card>
  );
}
