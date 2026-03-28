import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { CertificateButton } from '@/components/dashboard/CertificateButton';
import { DistributeButton } from '@/components/dashboard/DistributeButton';

const STATUS_LABELS: Record<string, string> = { processing: 'Procesando', registered: 'Registrada', certified: 'Registrada', failed: 'Fallida' };
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = { processing: 'secondary', registered: 'default', certified: 'default', failed: 'destructive' };

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'processing', label: 'Procesando' },
  { value: 'registered', label: 'Registrada' },
  { value: 'failed', label: 'Fallida' },
];

export default function ManagerWorks() {
  const { user } = useAuth();
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (!user) return;
    supabase.from('managed_works')
      .select('*, managed_artists(artist_name, artist_email), works(id, title, status, created_at, blockchain_hash, blockchain_network, certificate_url, checker_url, ibs_evidence_id, certified_at, type, description, distributed_at, distribution_clicks)')
      .eq('manager_user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setWorks(data || []); setLoading(false); });
  }, [user]);

  const filteredWorks = statusFilter === 'all'
    ? works
    : works.filter((w) => {
        const s = w.works?.status;
        if (statusFilter === 'registered') return s === 'registered' || s === 'certified';
        return s === statusFilter;
      });

  const exportCsv = () => {
    const rows = [['Artista', 'Título', 'Fecha', 'Estado', 'Hash Blockchain']];
    filteredWorks.forEach((w: any) => {
      rows.push([
        w.managed_artists?.artist_name || '',
        w.works?.title || '',
        w.works?.created_at ? format(new Date(w.works.created_at), 'dd/MM/yyyy') : '',
        STATUS_LABELS[w.works?.status] || w.works?.status || '',
        w.works?.blockchain_hash || '',
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'obras-manager.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Obras Registradas</h1>
        <div className="flex items-center gap-2">
          {works.length > 0 && (
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" /> Exportar CSV</Button>
          )}
        </div>
      </div>

      {works.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className="text-xs"
            >
              {f.label}
              {f.value !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  {works.filter((w) => {
                    const s = w.works?.status;
                    if (f.value === 'registered') return s === 'registered' || s === 'certified';
                    return s === f.value;
                  }).length}
                </span>
              )}
            </Button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {filteredWorks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              {works.length === 0 ? 'No hay obras registradas aún.' : 'No hay obras con este estado.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Artista</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Hash blockchain</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWorks.map((w: any) => (
                    <TableRow key={w.id}>
                      <TableCell className="font-medium">{w.managed_artists?.artist_name || '—'}</TableCell>
                      <TableCell>{w.works?.title || '—'}</TableCell>
                      <TableCell>{w.works?.created_at ? format(new Date(w.works.created_at), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[w.works?.status] || 'outline'}>
                          {STATUS_LABELS[w.works?.status] || w.works?.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">{w.works?.blockchain_hash || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {w.works?.status === 'registered' && w.works?.blockchain_hash && w.works?.ibs_evidence_id && (
                            <CertificateButton
                              work={{
                                id: w.works.id,
                                title: w.works.title,
                                type: w.works.type || 'Audio',
                                blockchain_hash: w.works.blockchain_hash,
                                blockchain_network: w.works.blockchain_network || 'Polygon',
                                checker_url: w.works.checker_url || undefined,
                                ibs_evidence_id: w.works.ibs_evidence_id,
                                certified_at: w.works.certified_at || undefined,
                                created_at: w.works.created_at,
                              }}
                              authorName={w.managed_artists?.artist_name || 'Autor'}
                            />
                          )}
                          {w.works?.status === 'registered' && (
                            <DistributeButton
                              workId={w.works.id}
                              distributedAt={w.works.distributed_at || null}
                              currentClicks={w.works.distribution_clicks || 0}
                              onDistributed={() => {
                                supabase.from('managed_works')
                                  .select('*, managed_artists(artist_name, artist_email), works(id, title, status, created_at, blockchain_hash, blockchain_network, certificate_url, checker_url, ibs_evidence_id, certified_at, type, description, distributed_at, distribution_clicks)')
                                  .eq('manager_user_id', user!.id)
                                  .order('created_at', { ascending: false })
                                  .then(({ data }) => { setWorks(data || []); });
                              }}
                            />
                          )}
                        </div>
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
