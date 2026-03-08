import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, MousePointerClick, Eye, TrendingUp, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ABStats {
  test_id: string;
  variant_index: number;
  variant_text: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

const AdminABTests = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin"); return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) { navigate("/admin"); return; }
      setIsAdmin(true);
      setLoading(false);
    };
    checkAdmin();
  }, [navigate]);

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ["ab-test-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ab_test_events")
        .select("test_id, variant_index, variant_text, event_type");

      if (error) throw error;

      // Aggregate client-side
      const map = new Map<string, { impressions: number; clicks: number; variant_text: string }>();
      for (const row of data || []) {
        const key = `${row.test_id}::${row.variant_index}`;
        if (!map.has(key)) {
          map.set(key, { impressions: 0, clicks: 0, variant_text: row.variant_text });
        }
        const entry = map.get(key)!;
        if (row.event_type === "impression") entry.impressions++;
        else if (row.event_type === "click") entry.clicks++;
      }

      const results: ABStats[] = [];
      for (const [key, val] of map) {
        const [test_id, vi] = key.split("::");
        results.push({
          test_id,
          variant_index: parseInt(vi),
          variant_text: val.variant_text,
          impressions: val.impressions,
          clicks: val.clicks,
          ctr: val.impressions > 0 ? (val.clicks / val.impressions) * 100 : 0,
        });
      }
      return results.sort((a, b) => a.test_id.localeCompare(b.test_id) || a.variant_index - b.variant_index);
    },
    enabled: isAdmin,
    refetchInterval: 30000,
  });

  // Group by test_id
  const groupedTests = (stats || []).reduce<Record<string, ABStats[]>>((acc, s) => {
    if (!acc[s.test_id]) acc[s.test_id] = [];
    acc[s.test_id].push(s);
    return acc;
  }, {});

  const testLabels: Record<string, string> = {
    "hero_primary_cta": "Hero — CTA Principal",
    "hero_secondary_cta": "Hero — CTA Secundario",
    "artists_join_cta": "Banner Artistas — Únete",
    "artists_testimonials_cta": "Banner Artistas — Testimonios",
    "pricing_buy_cta": "Pricing — Comprar",
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-muted-foreground">Verificando acceso...</div>
      </div>
    );
  }

  const totalImpressions = (stats || []).reduce((s, r) => s + r.impressions, 0);
  const totalClicks = (stats || []).reduce((s, r) => s + r.clicks, 0);

  return (
    <div className="min-h-screen page-bg text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-primary" />
                Pruebas A/B
              </h1>
              <p className="text-sm text-muted-foreground">Estadísticas de CTAs en tiempo real</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Eye className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Impresiones</span>
            </div>
            <p className="text-3xl font-bold">{totalImpressions.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <MousePointerClick className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Total Clics</span>
            </div>
            <p className="text-3xl font-bold">{totalClicks.toLocaleString()}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">CTR Global</span>
            </div>
            <p className="text-3xl font-bold">
              {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0"}%
            </p>
          </div>
        </div>

        {/* Per-test tables */}
        {statsLoading ? (
          <div className="text-center text-muted-foreground py-12">Cargando estadísticas...</div>
        ) : Object.keys(groupedTests).length === 0 ? (
          <div className="text-center text-muted-foreground py-12 bg-card border border-border rounded-xl">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Sin datos todavía</p>
            <p className="text-sm mt-1">Los datos aparecerán cuando los visitantes interactúen con los CTAs.</p>
          </div>
        ) : (
          Object.entries(groupedTests).map(([testId, variants]) => {
            const bestCtr = Math.max(...variants.map((v) => v.ctr));
            return (
              <div key={testId} className="mb-6 bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-lg">{testLabels[testId] || testId}</h2>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variante</TableHead>
                      <TableHead>Texto</TableHead>
                      <TableHead className="text-right">Impresiones</TableHead>
                      <TableHead className="text-right">Clics</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants.map((v) => (
                      <TableRow key={v.variant_index}>
                        <TableCell className="font-mono text-sm">V{v.variant_index}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{v.variant_text}</TableCell>
                        <TableCell className="text-right">{v.impressions.toLocaleString()}</TableCell>
                        <TableCell className="text-right">{v.clicks.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{v.ctr.toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          {v.ctr === bestCtr && v.impressions > 0 ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                              <TrendingUp className="w-3 h-3" /> Líder
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminABTests;
