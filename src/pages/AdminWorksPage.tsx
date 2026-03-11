import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminApi } from '@/services/adminApi';
import { toast } from 'sonner';
import { Music, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export default function AdminWorksPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAllWorks(offset, statusFilter, search);
      setWorks(res.works || []);
    } catch (e: any) { toast.error(e.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [offset, statusFilter]);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      registered: 'bg-green-500/20 text-green-400',
      processing: 'bg-yellow-500/20 text-yellow-400',
      failed: 'bg-destructive/20 text-destructive',
    };
    return <Badge className={map[status] || 'bg-muted text-muted-foreground'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Music className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Obras</h1>
        <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Admin</Badge>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setOffset(0); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="registered">Registrado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={load} variant="secondary">Buscar</Button>
      </div>

      <div className="rounded-lg border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Usuario</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Checker</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            ) : works.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin resultados</TableCell></TableRow>
            ) : works.map(w => (
              <TableRow key={w.id}>
                <TableCell>
                  <div>
                    <p className="text-sm">{w.user_email}</p>
                    <p className="text-xs text-muted-foreground">{w.user_display_name}</p>
                  </div>
                </TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{w.title}</TableCell>
                <TableCell><Badge variant="outline">{w.type}</Badge></TableCell>
                <TableCell>{statusBadge(w.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleDateString()}</TableCell>
                <TableCell>
                  {w.checker_url ? (
                    <a href={w.checker_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <Button variant="outline" size="sm" disabled={works.length < 50} onClick={() => setOffset(offset + 50)}>
          Siguiente <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
