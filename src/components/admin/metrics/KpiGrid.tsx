import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, Users, UserPlus, Activity, ShieldCheck,
  Music, ShoppingBag, Zap, Calendar, CalendarRange, DollarSign, BarChart3, Target,
} from 'lucide-react';

interface KpiGridProps {
  metrics: any;
}

function KpiCard({ label, value, icon: Icon, sub, subColor }: {
  label: string; value: string | number; icon: any; sub?: string; subColor?: string;
}) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs flex items-center gap-1">
          <Icon className="w-3 h-3" />
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && (
          <div className={`text-xs flex items-center gap-1 ${subColor || 'text-muted-foreground'}`}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendKpi({ label, value, icon: Icon, change, suffix, invertColor }: {
  label: string; value: string | number; icon: any; change: number; suffix?: string; invertColor?: boolean;
}) {
  const isPositive = invertColor ? change <= 0 : change >= 0;
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-xs flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {change >= 0 ? '+' : ''}{change}% {suffix || 'MoM'}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiGrid({ metrics }: KpiGridProps) {
  const m = metrics;
  const stickiness = m.mau > 0 ? ((m.dau / m.mau) * 100).toFixed(1) : '0';
  const creditUsage = m.creditsSold > 0 ? ((m.creditsConsumed / m.creditsSold) * 100).toFixed(1) : '0';
  const mauPercent = m.totalUsers > 0 ? ((m.activeUsers30d / m.totalUsers) * 100).toFixed(1) : '0';
  const verifiedPercent = m.totalUsers > 0 ? ((m.verifiedUsers / m.totalUsers) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-4">
      {/* Row 1: SaaS KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <TrendKpi label="MRR" value={`€${m.mrr.toLocaleString()}`} icon={DollarSign} change={m.mrrChange} />
        <TrendKpi label="ARR" value={`€${m.arr.toLocaleString()}`} icon={DollarSign} change={m.arrChange} suffix="YoY" />
        <TrendKpi label="Churn Rate" value={`${m.churnRate}%`} icon={BarChart3} change={m.churnChange} invertColor />
        <KpiCard label="LTV" value={`€${m.ltv}`} icon={Target} sub="Customer Lifetime Value" />
        <KpiCard
          label="LTV:CAC"
          value={`${m.ltvCacRatio}x`}
          icon={Target}
          sub={m.ltvCacRatio >= 3 ? '✓ Healthy' : '⚠ Watch'}
          subColor={m.ltvCacRatio >= 3 ? 'text-green-600' : 'text-orange-600'}
        />
      </div>

      {/* Row 2: User Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Usuarios Totales" value={m.totalUsers} icon={Users} sub={`+${m.newUsersThisMonth} este mes`} />
        <TrendKpi label="Nuevos" value={m.newUsersThisMonth} icon={UserPlus} change={m.newUsersChange} suffix="vs mes anterior" />
        <KpiCard label="Activos (30d)" value={m.activeUsers30d} icon={Activity} sub={`MAU: ${mauPercent}%`} />
        <KpiCard label="Verificados" value={m.verifiedUsers} icon={ShieldCheck} sub={`${verifiedPercent}% del total`} />
        <KpiCard label="Conversión" value={`${m.conversionRate}%`} icon={TrendingUp} sub="Free → Paid" />
      </div>

      {/* Row 3: Product Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Obras Registradas" value={m.totalWorks} icon={Music} sub={`+${m.worksThisMonth} este mes`} />
        <KpiCard label="Créditos Vendidos" value={m.creditsSold.toLocaleString()} icon={ShoppingBag} sub={`€${m.creditsRevenue.toLocaleString()} revenue`} />
        <KpiCard label="Créditos Consumidos" value={m.creditsConsumed.toLocaleString()} icon={Zap} sub={`${creditUsage}% de uso`} />
        <KpiCard label="DAU" value={m.dau} icon={Calendar} sub="Daily Active Users" />
        <KpiCard label="MAU" value={m.mau} icon={CalendarRange} sub={`Stickiness: ${stickiness}%`} />
      </div>
    </div>
  );
}
