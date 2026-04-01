import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, FileText, ExternalLink, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchRecentRegistrations } from '@/services/dashboardApi';
import type { RecentRegistration } from '@/types/dashboard';
import { DistributeButton } from '@/components/dashboard/DistributeButton';
import { CertificateButton } from '@/components/dashboard/CertificateButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 3;

export function RecentRegistrations() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<RecentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.display_name) setDisplayName(data.display_name); });
  }, [user]);

  const load = async () => {
    setLoading(true);
    try { setData(await fetchRecentRegistrations()); } catch {}
    setLoading(false);
    setPage(0);
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const pageData = data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const statusConfig: Record<string, { label: string; className: string }> = {
    processing: { label: t('dashboard.recentReg.processing'), className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    registered: { label: t('dashboard.recentReg.registered'), className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    failed: { label: t('dashboard.recentReg.failed'), className: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold tracking-tight flex items-center gap-2">
          <History className="h-4 w-4 text-primary" /> {t('dashboard.recentReg.title')}
        </CardTitle>
        <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {loading ? (
          <div className="space-y-3 px-6 pb-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            {t('dashboard.recentReg.noRegistrations')}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Header */}
              <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_1fr] gap-4 items-center px-6 py-2 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>{t('dashboard.recentReg.work')}</span>
                <span>{t('dashboard.recentReg.status')}</span>
                <span>{t('dashboard.recentReg.date')}</span>
                <span>{t('dashboard.recentReg.actions')}</span>
              </div>
              <div className="divide-y divide-border/20">
                {pageData.map(reg => {
                  const sc = statusConfig[reg.status] || statusConfig.processing;
                  return (
                    <div key={reg.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_1fr] gap-2 sm:gap-4 items-center px-6 py-3 hover:bg-muted/50 transition-colors">
                      {/* Title */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm font-medium truncate">{reg.title}</p>
                      </div>

                      {/* Status */}
                      <div>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sc.className}`}>
                          {sc.label}
                        </Badge>
                      </div>

                      {/* Date */}
                      <span className="text-xs text-muted-foreground">
                        {new Date(reg.date).toLocaleDateString(i18n.resolvedLanguage)}
                      </span>

                      {/* Actions — aligned left */}
                      <div className="flex items-center gap-2">
                        {reg.certificateUrl && (
                          <a
                            href={reg.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline whitespace-nowrap"
                          >
                            <ExternalLink className="h-3 w-3" /> {t('dashboard.recentReg.certificate')}
                          </a>
                        )}
                        {reg.status === 'registered' && reg.blockchain_hash && reg.ibs_evidence_id && (
                          <CertificateButton
                            work={{
                              id: reg.id,
                              title: reg.title,
                              type: reg.type,
                              blockchain_hash: reg.blockchain_hash,
                              blockchain_network: reg.blockchain_network || 'Polygon',
                              checker_url: reg.checker_url || undefined,
                              ibs_evidence_id: reg.ibs_evidence_id,
                              certified_at: reg.certified_at || undefined,
                              created_at: reg.date,
                            }}
                            authorName={displayName || user?.email || 'Autor'}
                          />
                        )}
                        {reg.status === 'registered' && (
                          <DistributeButton
                            workId={reg.id}
                            distributedAt={reg.distributedAt || null}
                            currentClicks={reg.distributionClicks || 0}
                            onDistributed={load}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-border/30">
                <span className="text-xs text-muted-foreground">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data.length)} {t('dashboard.recentReg.of')} {data.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <Button
                      key={i}
                      variant={i === page ? 'default' : 'ghost'}
                      size="icon"
                      className="h-8 w-8 text-xs"
                      onClick={() => setPage(i)}
                    >
                      {i + 1}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page === totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
