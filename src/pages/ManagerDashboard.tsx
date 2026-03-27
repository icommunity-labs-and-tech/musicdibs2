import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, FileText, Share2, CalendarCheck, Eye, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

  // Build artist summary with work counts
  const artistSummary = artists.map((a: any) => {
    const artistWorks = works.filter((w: any) => w.managed_artist_id === a.id);
    const lastWork = artistWorks.sort((x: any, y: any) => new Date(y.works?.created_at || 0).getTime() - new Date(x.works?.created_at || 0).getTime())[0];
    return { ...a, workCount: artistWorks.length, lastWorkDate: lastWork?.works?.created_at };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Panel Manager</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <p className="text-3xl font-bold">
              {contract?.valid_until ? format(new Date(contract.valid_until), 'dd MMM yyyy', { locale: es }) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Artists table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de artistas</CardTitle>
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
