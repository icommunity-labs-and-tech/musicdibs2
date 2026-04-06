import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface MetricsChartsProps {
  metrics: any;
}

export default function MetricsCharts({ metrics }: MetricsChartsProps) {
  const m = metrics;

  return (
    <div className="space-y-6">
      {/* Charts 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* MRR Evolution */}
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">📈 Revenue Evolution</CardTitle>
              {m._dataSource === "stripe_real" && (
                <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-500">Stripe Live</Badge>
              )}
            </div>
            <CardDescription>Ingresos reales últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={m.mrrEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Churn Rate Evolution */}
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">📉 Churn Rate Evolution</CardTitle>
              {m._dataSource === "stripe_real" && (
                <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-500">Stripe Live</Badge>
              )}
            </div>
            <CardDescription>Evolución de cancelaciones (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={m.churnEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => [`${v}%`, 'Churn']} />
                <Line type="monotone" dataKey="churn" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(0, 84%, 60%)' }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-2">
              Datos reales de Stripe: cancelaciones / (activos + cancelados) por mes
            </p>
          </CardContent>
        </Card>

        {/* User Acquisition */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">👥 User Acquisition</CardTitle>
            <CardDescription>Nuevos vs Activos por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={m.userAcquisition}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="newUsers" fill="hsl(142, 76%, 36%)" name="Nuevos" />
                <Bar dataKey="activeUsers" fill="hsl(217, 91%, 60%)" name="Activos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Feature Usage */}
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="text-base">⚡ Feature Usage</CardTitle>
            <CardDescription>Uso de herramientas AI Studio</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={m.featureUsage} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="feature" type="category" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="uses" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">💳 Revenue by Plan</CardTitle>
          <CardDescription>Distribución de ingresos por tipo de suscripción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <RevenueBar
              label="Annual" variant="default"
              value={m.annualRevenue} percent={m.annualPercentage}
              gradient="from-violet-500 to-purple-600"
            />
            <RevenueBar
              label="Monthly" variant="secondary"
              value={m.monthlyRevenue} percent={m.monthlyPercentage}
              gradient="from-blue-500 to-cyan-600"
            />
            <RevenueBar
              label="Créditos" variant="outline"
              value={m.creditsRevenue}
              percent={m.totalRevenue > 0 ? parseFloat(((m.creditsRevenue / m.totalRevenue) * 100).toFixed(1)) : 0}
              gradient="from-emerald-500 to-teal-600"
              sub="One-time purchases"
            />
          </div>

          <Separator className="my-4" />

          {/* Revenue Concentration */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border/40">
            <p className="text-xs font-medium mb-3">📍 Revenue Concentration</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Plan más usado</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="secondary" className="text-[10px]">{m.topPlanName}</Badge>
                  <span className="font-medium">{m.topPlanPercentage}% usuarios</span>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Suscripciones activas</span>
                <p className="text-lg font-bold mt-0.5">{m.activeSubscriptions}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Canceladas este mes</span>
                <p className={`text-lg font-bold mt-0.5 ${m.cancelledThisMonth > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  {m.cancelledThisMonth}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Top 10 usuarios</span>
                <p className="text-lg font-bold mt-0.5">{m.top10RevenuePercentage}%<span className="text-xs font-normal text-muted-foreground ml-1">del revenue</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RevenueBar({ label, variant, value, percent, gradient, sub }: {
  label: string; variant: "default" | "secondary" | "outline"; value: number; percent: number; gradient: string; sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Badge variant={variant}>{label}</Badge>
          <span className="text-sm font-medium">€{value.toLocaleString()}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {sub || `${percent}% del total`}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`bg-gradient-to-r ${gradient} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
