import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchRecentRegistrations } from '@/services/dashboardApi';
import type { RecentRegistration } from '@/types/dashboard';
import { DistributeButton } from '@/components/dashboard/DistributeButton';

const statusConfig: Record<string, { label: string; className: string }> = {
  processing: { label: 'En proceso', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  registered: { label: 'Registrado', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  failed: { label: 'Fallido', className: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export function RecentRegistrations() {
  const [data, setData] = useState<RecentRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData(await fetchRecentRegistrations()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> Registros recientes
        </CardTitle>
        <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="px-2">
        {loading ? (
          <div className="space-y-3 px-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            Aún no tienes registros
          </div>
        ) : (
          <ScrollArea className="h-[240px]">
            <div className="space-y-1 px-2">
              {data.map(reg => {
                const sc = statusConfig[reg.status] || statusConfig.processing;
                return (
                  <div key={reg.id} className="flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors group">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm font-medium truncate">{reg.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.className}`}>
                          {sc.label}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(reg.date).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                      {reg.certificateUrl && (
                        <a
                          href={reg.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" /> Certificado
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
