import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Users, DollarSign, Target } from 'lucide-react';
import { normalizeAttribution } from '@/components/admin/HistoricalDataNotice';

interface MarketingSummaryProps {
  metrics: any;
}

export default function MarketingSummary({ metrics }: MarketingSummaryProps) {
  const m = metrics;

  // Use campaign summary data if available, otherwise fall back to legacy fields
  const attributedRegistered = m.marketingSummary?.attributed_registered ?? 0;
  const attributedCustomers = m.marketingSummary?.attributed_customers ?? 0;
  const adSpend = m.marketingSummary?.ad_spend ?? m.adSpend ?? 0;
  const cac = m.marketingSummary?.cac ?? m.cac ?? 0;
  const topCampaigns: { name: string; revenue: number }[] = m.marketingSummary?.top_campaigns ?? [];

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Marketing Summary</CardTitle>
          <CardDescription className="ml-2 text-xs">Resumen del periodo</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Users className="w-3 h-3" /> Registros atribuidos
            </div>
            <p className="text-xl font-bold">{attributedRegistered}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Users className="w-3 h-3" /> Clientes atribuidos
            </div>
            <p className="text-xl font-bold">{attributedCustomers}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <DollarSign className="w-3 h-3" /> Ad Spend
            </div>
            <p className="text-xl font-bold">€{adSpend.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
              <Target className="w-3 h-3" /> CAC medio
            </div>
            <p className="text-xl font-bold">€{cac}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1 text-center">Top 3 campañas</p>
            {topCampaigns.length > 0 ? (
              <div className="space-y-1">
                {topCampaigns.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className="text-[10px] truncate max-w-[100px]">{normalizeAttribution(c.name)}</Badge>
                    <span className="font-medium">€{c.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center">Sin datos</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
