import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, Coins, RefreshCw } from 'lucide-react';
import { fetchDashboardSummary } from '@/services/dashboardApi';
import type { DashboardSummary } from '@/types/dashboard';

export function AccountSummary({ onSummaryLoaded }: { onSummaryLoaded?: (s: DashboardSummary) => void }) {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const summary = await fetchDashboardSummary();
      setData(summary);
      onSummaryLoaded?.(summary);
    } catch { setError('Error al cargar el resumen'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <Card className="border-border/40">
      <CardHeader><Skeleton className="h-5 w-48" /></CardHeader>
      <CardContent className="flex gap-6">
        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-24" />)}
      </CardContent>
    </Card>
  );

  if (error) return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-6 text-center text-destructive text-sm">{error}</CardContent>
    </Card>
  );

  if (!data) return null;

  const stats = [
    { icon: FileText, value: data.registeredWorks, label: 'Obras registradas', color: 'text-primary' },
    { icon: Clock, value: data.pendingRegistrations, label: 'Registros pendientes', color: 'text-amber-500' },
    { icon: Coins, value: data.availableCredits, label: 'Créditos disponibles', color: 'text-emerald-500' },
  ];

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">Resumen de la cuenta</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{data.subscriptionPlan}</Badge>
          <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col items-center gap-1 rounded-lg bg-muted/50 p-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-2xl font-bold">{s.value}</span>
              <span className="text-xs text-muted-foreground text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
