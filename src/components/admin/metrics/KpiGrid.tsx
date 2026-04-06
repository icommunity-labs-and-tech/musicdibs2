import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import {
  TrendingUp, TrendingDown, Users, UserPlus, Activity, ShieldCheck,
  Music, ShoppingBag, Zap, Calendar, CalendarRange, DollarSign, BarChart3, Target,
  Gauge, Rocket,
} from 'lucide-react';

interface KpiGridProps {
  metrics: any;
}

/* ── Tiny inline sparkline (pure SVG) ── */
function Sparkline({ data, color = 'hsl(var(--primary))' }: { data: number[]; color?: string }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 60;
  const h = 20;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} className="inline-block ml-1 opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KpiCard({ label, value, icon: Icon, sub, subColor, sparkData, sparkColor }: {
  label: string; value: string | number; icon: any; sub?: string; subColor?: string;
  sparkData?: number[]; sparkColor?: string;
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
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
        </div>
        {sub && (
          <div className={`text-xs flex items-center gap-1 ${subColor || 'text-muted-foreground'}`}>
            {sub}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendKpi({ label, value, icon: Icon, change, suffix, invertColor, sparkData, sparkColor }: {
  label: string; value: string | number; icon: any; change: number; suffix?: string; invertColor?: boolean;
  sparkData?: number[]; sparkColor?: string;
}) {
  const isPositive = invertColor ? change <= 0 : change >= 0;
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-1">
          <span className="text-2xl font-bold">{value}</span>
          {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
        </div>
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

  // Extract sparkline series from evolution arrays
  const mrrSpark = m.mrrEvolution?.map((d: any) => d.mrr) ?? [];
  const churnSpark = m.churnEvolution?.map((d: any) => d.churn) ?? [];
  const newUsersSpark = m.userAcquisition?.map((d: any) => d.newUsers) ?? [];
  const activeUsersSpark = m.userAcquisition?.map((d: any) => d.activeUsers) ?? [];

  return (
    <div className="space-y-4">
      {/* Row 1: SaaS Financial KPIs (7 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <TrendKpi label="MRR" value={`€${m.mrr.toLocaleString()}`} icon={DollarSign} change={m.mrrChange} sparkData={mrrSpark} sparkColor="hsl(var(--primary))" />
        <TrendKpi label="ARR" value={`€${m.arr.toLocaleString()}`} icon={DollarSign} change={m.arrChange} suffix="YoY" sparkData={mrrSpark} sparkColor="hsl(var(--primary))" />
        <TrendKpi label="Churn Rate" value={`${m.churnRate}%`} icon={BarChart3} change={m.churnChange} invertColor sparkData={churnSpark} sparkColor="hsl(0, 84%, 60%)" />
        <KpiCard label="LTV" value={`€${m.ltv}`} icon={Target} sub="Lifetime Value" />
        <KpiCard
          label="LTV:CAC"
          value={`${m.ltvCacRatio}x`}
          icon={Target}
          sub={m.ltvCacRatio >= 3 ? '✓ Healthy' : '⚠ Watch'}
          subColor={m.ltvCacRatio >= 3 ? 'text-green-600' : 'text-orange-600'}
        />
        <KpiCard
          label="NRR"
          value={`${m.nrr}%`}
          icon={Gauge}
          sub={m.nrr >= 120 ? '🔥 Best-in-class' : m.nrr >= 100 ? '✓ Good' : '⚠ Risk'}
          subColor={m.nrr >= 120 ? 'text-green-600' : m.nrr >= 100 ? 'text-blue-600' : 'text-red-600'}
        />
        <KpiCard
          label="Quick Ratio"
          value={`${m.quickRatio}x`}
          icon={Rocket}
          sub={m.quickRatio >= 4 ? '✓ Healthy' : '○ Monitor'}
          subColor={m.quickRatio >= 4 ? 'text-green-600' : 'text-orange-600'}
        />
      </div>

      {/* Row 2: User Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Usuarios Totales" value={m.totalUsers} icon={Users} sub={`+${m.newUsersThisMonth} este mes`} />
        <TrendKpi label="Nuevos" value={m.newUsersThisMonth} icon={UserPlus} change={m.newUsersChange} suffix="vs mes anterior" sparkData={newUsersSpark} sparkColor="hsl(142, 76%, 36%)" />
        <KpiCard label="Activos (30d)" value={m.activeUsers30d} icon={Activity} sub={`MAU: ${mauPercent}%`} sparkData={activeUsersSpark} sparkColor="hsl(217, 91%, 60%)" />
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
