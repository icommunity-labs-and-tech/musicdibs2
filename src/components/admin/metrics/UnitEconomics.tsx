import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface UnitEconomicsProps {
  metrics: any;
}

export default function UnitEconomics({ metrics }: UnitEconomicsProps) {
  const m = metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Unit Economics */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">💰 Unit Economics</CardTitle>
          <CardDescription>Rentabilidad por usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">ARPU</p>
              <p className="text-xl font-bold">€{m.arpu}</p>
              <p className="text-xs text-muted-foreground">por mes</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">CAC</p>
              <p className="text-xl font-bold">€{m.cac}</p>
              <p className="text-xs text-muted-foreground">adquisición</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Gross Margin</p>
              <p className="text-xl font-bold">{m.grossMargin}%</p>
              <p className={`text-xs ${m.grossMargin >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                {m.grossMargin >= 80 ? '✓ SaaS target' : '○ Below target'}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Payback Period</p>
              <p className="text-xl font-bold">{m.paybackPeriod}m</p>
              <p className={`text-xs ${m.paybackPeriod <= 12 ? 'text-green-600' : 'text-orange-600'}`}>
                {m.paybackPeriod <= 12 ? '✓ Excellent' : '○ OK'}
              </p>
            </div>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Magic Number</span>
            <span className="text-lg font-bold">{m.magicNumber}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">S&M efficiency (MRR growth / S&M spend)</p>
        </CardContent>
      </Card>

      {/* Cash & Runway */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">💵 Cash & Runway</CardTitle>
          <CardDescription>Situación financiera</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cash disponible</span>
              <span className="text-xl font-bold">€{m.cashBalance.toLocaleString()}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm text-muted-foreground">Monthly Burn Rate</span>
                <p className="text-xs text-muted-foreground">Gastos - Ingresos</p>
              </div>
              <span className="text-xl font-bold text-red-500">
                -€{Math.abs(m.burnRate).toLocaleString()}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Runway</span>
              <div className="text-right">
                <span className="text-xl font-bold">{m.runway} meses</span>
                <p className={`text-xs ${
                  m.runway >= 18 ? 'text-green-600' :
                  m.runway >= 12 ? 'text-orange-600' :
                  'text-red-600'
                }`}>
                  {m.runway >= 18 ? '✓ Comfortable' :
                   m.runway >= 12 ? '⚠ Monitor' :
                   '🚨 Critical'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
