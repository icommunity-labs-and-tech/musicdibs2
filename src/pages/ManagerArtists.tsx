import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { toast } from 'sonner';

const REP_LABELS: Record<string, string> = { full: 'Completa', registration: 'Solo registro', distribution: 'Solo distribución' };
const REP_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = { full: 'default', registration: 'secondary', distribution: 'outline' };

export default function ManagerArtists() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [artists, setArtists] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [repFilter, setRepFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchArtists = async () => {
    if (!user) return;
    const { data } = await supabase.from('managed_artists').select('*').eq('manager_user_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
    setArtists(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchArtists(); }, [user]);

  const handleDeactivate = async (id: string) => {
    await supabase.from('managed_artists').update({ status: 'inactive' } as any).eq('id', id);
    toast.success('Artista eliminado de la cartera');
    fetchArtists();
  };

  const filtered = artists.filter((a: any) => {
    const matchesSearch = a.artist_name.toLowerCase().includes(search.toLowerCase());
    const matchesRep = repFilter === 'all' || a.representation_type === repFilter;
    return matchesSearch && matchesRep;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Artistas</h1>
        <Button onClick={() => navigate('/dashboard/manager/artists/new')}><Plus className="h-4 w-4 mr-2" /> Añadir artista</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={repFilter} onValueChange={setRepFilter}>
          <SelectTrigger className="sm:max-w-[200px]"><SelectValue placeholder="Tipo representación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="full">Completa</SelectItem>
            <SelectItem value="registration">Solo registro</SelectItem>
            <SelectItem value="distribution">Solo distribución</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No se encontraron artistas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>País</TableHead>
                    <TableHead>Representación</TableHead>
                    <TableHead>Fecha alta</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.artist_name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.artist_email || '—'}</TableCell>
                      <TableCell>{a.artist_country || '—'}</TableCell>
                      <TableCell><Badge variant={REP_VARIANTS[a.representation_type] || 'outline'}>{REP_LABELS[a.representation_type] || a.representation_type}</Badge></TableCell>
                      <TableCell>{format(new Date(a.created_at), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/dashboard/manager/artists/${a.id}`)}><Eye className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeactivate(a.id)}><Trash2 className="h-4 w-4" /></Button>
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
