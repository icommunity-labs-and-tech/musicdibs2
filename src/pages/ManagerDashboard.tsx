import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Users, FileText, Share2, CalendarCheck, Eye, Upload, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, subMonths, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';

const REP_LABELS: Record<string, string> = {
  full: 'Completa',
  registration: 'Solo registro',
  distribution: 'Solo distribución',
};

const REP_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  full: 'default',
  registration: 'secondary',
  distribution: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  processing: 'Procesando',
  registered: 'Registrada',
  distributed: 'Distribuida',
  failed: 'Fallida',
};

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--secondary))',
  'hsl(var(--muted))',
];

export default function ManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [artistsRes, worksRes, contractRes] = await Promise.all([
        supabase.from('managed_artists').select('*').eq('manager_user_id', user.id).eq('status', 'active'),
        supabase.from('managed_works').select('*, managed_artists(artist_name), works(title, status, created_at, blockchain_hash)').eq('manager_user_id', user.id),
        supabase.from('manager_contracts').select('*').eq('manager_user_id', user.id).limit(1).maybeSingle(),
      ]);
      setArtists(artistsRes.data || []);
      setWorks(worksRes.data || []);
      setContract(contractRes.data);
      setLoading(false);
    };
    load();
  }, [user]);

  const totalDistributed = works.filter((w: any) => w.works?.status === 'distributed').length;

  // Monthly works data (last 6 months)
  const monthlyData = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(startOfMonth(d), 'yyyy-MM');
      const label = format(d, 'MMM yy', { locale: es });
      const count = works.filter((w: any) => {
        const created = w.works?.created_at;
        return created && format(new Date(created), 'yyyy-MM') === key;
      }).length;
      months.push({ month: label, count });
    }
    return months;
  }, [works]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    works.forEach((w: any) => {
      const s = w.works?.status || 'processing';
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
    }));
  }, [works]);

  // Works per artist
  const artistWorksData = useMemo(() => {
    const map: Record<string, number> = {};
    works.forEach((w: any) => {
      const name = w.managed_artists?.artist_name || 'Sin artista';
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([artist, count]) => ({ artist: artist.length > 12 ? artist.slice(0, 12) + '…' : artist, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [works]);

  const artistSummary = artists.map((a: any) => {
    const artistWorks = works.filter((w: any) => w.managed_artist_id === a.id);
    const lastWork = artistWorks.sort((x: any, y: any) => new Date(y.works?.created_at || 0).getTime() - new Date(x.works?.created_at || 0).getTime())[0];
    return { ...a, workCount: artistWorks.length, lastWorkDate: lastWork?.works?.created_at };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  const monthlyChartConfig = { count: { label: 'Obras', color: 'hsl(var(--primary))' } };
  const artistChartConfig = { count: { label: 'Obras', color: 'hsl(var(--accent))' } };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Panel Manager</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="h-4 w-4" />
          <span>Últimos 6 meses</span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Artistas activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{artists.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Obras registradas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{works.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Obras distribuidas</CardTitle>
            <Share2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{totalDistributed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contrato válido hasta</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold">
              {contract?.valid_until ? format(new Date(contract.valid_until), 'dd MMM yyyy', { locale: es }) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Obras registradas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            {works.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <ChartContainer config={monthlyChartConfig} className="h-[220px] w-full">
                <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="url(#fillCount)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado de obras</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sin datos aún</p>
            ) : (
              <ChartContainer config={{}} className="h-[220px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1 text-xs">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{s.name} ({s.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Works per artist */}
      {artistWorksData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Obras por artista</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={artistChartConfig} className="h-[200px] w-full">
              <BarChart data={artistWorksData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="artist" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Artists table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen de artistas</CardTitle>
        </CardHeader>
        <CardContent>
          {artistSummary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tienes artistas en tu cartera.</p>
              <Button className="mt-4" onClick={() => navigate('/dashboard/manager/artists/new')}>Añadir artista</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Representación</TableHead>
                    <TableHead className="text-center">Obras</TableHead>
                    <TableHead>Última obra</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {artistSummary.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.artist_name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.artist_email || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={REP_VARIANTS[a.representation_type] || 'outline'}>
                          {REP_LABELS[a.representation_type] || a.representation_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{a.workCount}</TableCell>
                      <TableCell>{a.lastWorkDate ? format(new Date(a.lastWorkDate), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/manager/artists/${a.id}`)}><Eye className="h-4 w-4 mr-1" /> Ver</Button>
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/manager/register?artist=${a.id}`)}><Upload className="h-4 w-4 mr-1" /> Registrar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
