import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminGuard } from "@/components/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ArrowRight, Star, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const REASON_LABELS: Record<string, string> = {
  probando: "Solo estaba probando",
  terminado: "Ya creé lo que necesitaba",
  no_uso: "No la uso lo suficiente",
  pocos_creditos: "Se queda corto de créditos",
  caro: "Es demasiado caro",
  mal_resultado: "Resultado no esperado",
  otra_herramienta: "Uso otra herramienta",
  otro: "Otro motivo",
};

const REASON_COLORS = [
  "hsl(var(--primary))",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 50%)",
  "hsl(30, 80%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(50, 75%, 50%)",
  "hsl(0, 0%, 55%)",
];

const ACTION_EVENTS_BY_FEATURE: Record<string, string[]> = {
  create_music: ["generation_completed"],
  lyrics: ["lyrics_generated"],
  vocal: ["vocal_track_generated"],
  voice_cloning: ["voice_cloned"],
  cover: ["cover_generated"],
  video: ["video_generated"],
  social_video: ["social_video_generated"],
  promotion: ["promotion_generated"],
  premium_promotion: ["premium_promotion_submitted"],
  press: ["press_release_generated"],
  register: ["work_registered"],
  enhance_audio: ["enhance_audio_completed"],
  distribution: ["distribution_clicked"],
  inspire: ["ai_studio_entered"],
};

interface MetricRow {
  date: string;
  ai_studio_entries: number;
  generations_started: number;
  generations_completed: number;
  audios_downloaded: number;
  works_after_generation: number;
  uses_create_music: number;
  uses_lyrics: number;
  uses_vocal: number;
  uses_cover: number;
  uses_video: number;
  uses_promotion: number;
  uses_press: number;
  uses_register: number;
  uses_voice_cloning: number;
  unique_users: number;
  total_revenue_eur: number;
  revenue_create_music_eur: number;
  revenue_cover_eur: number;
  revenue_video_eur: number;
  revenue_promotion_eur: number;
  revenue_register_eur: number;
}

type Range = "7d" | "30d" | "90d";

export default function AdminProductMetrics() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("30d");
  const [metrics, setMetrics] = useState<MetricRow[]>([]);
  const [liveFeatureCounts, setLiveFeatureCounts] = useState<Record<string, number>>({});
  const [costConfig, setCostConfig] = useState<Record<string, { credit_cost: number; price_per_credit_eur: number }>>({});
  const [cancellationData, setCancellationData] = useState<{ plan_type: string; reason: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, [range]);

  const loadMetrics = async () => {
    setLoading(true);
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const from = new Date();
    from.setDate(from.getDate() - days);
    const fromStr = from.toISOString().split("T")[0];

    // Load aggregated daily metrics
    const { data } = await supabase
      .from("product_metrics_daily")
      .select("*")
      .gte("date", fromStr)
      .order("date", { ascending: true });

    setMetrics((data as MetricRow[]) || []);

    // Load live feature counts from product_events — one count query per feature to avoid 1000-row limit
    const counts: Record<string, number> = {};
    const featureEntries = Object.entries(ACTION_EVENTS_BY_FEATURE);
    const countResults = await Promise.all(
      featureEntries.map(([feature, eventNames]) =>
        supabase
          .from("product_events")
          .select("id", { count: "exact", head: true })
          .eq("feature", feature)
          .in("event_name", eventNames)
          .gte("created_at", `${fromStr}T00:00:00.000Z`)
          .then(({ count }) => ({ feature, count: count || 0 }))
      )
    );
    for (const { feature, count } of countResults) {
      counts[feature] = count;
    }
    setLiveFeatureCounts(counts);

    // Load cost config (credit_cost + price_per_credit) from api_cost_config
    const { data: costs } = await supabase
      .from("api_cost_config")
      .select("feature_key, credit_cost, price_per_credit_eur");

    const costMap: Record<string, { credit_cost: number; price_per_credit_eur: number }> = {};
    for (const c of costs || []) {
      costMap[c.feature_key] = { credit_cost: c.credit_cost, price_per_credit_eur: Number(c.price_per_credit_eur) };
    }
    setCostConfig(costMap);

    // Load cancellation surveys
    const { data: cancellations } = await supabase
      .from("cancellation_surveys")
      .select("reason, plan_type")
      .gte("created_at", `${fromStr}T00:00:00.000Z`);
    setCancellationData(cancellations || []);

    setLoading(false);
  };

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.functions.invoke("product-metrics-cron", {
        body: { date: today },
      });
      if (error) throw error;
      toast.success("Métricas de hoy recalculadas");
      loadMetrics();
    } catch (e: any) {
      toast.error("Error: " + (e?.message || e));
    } finally {
      setRecalculating(false);
    }
  };

  const totals = useMemo(() => {
    return metrics.reduce(
      (acc, d) => ({
        aiStudioEntries: acc.aiStudioEntries + (d.ai_studio_entries || 0),
        generationsStarted: acc.generationsStarted + (d.generations_started || 0),
        generationsCompleted: acc.generationsCompleted + (d.generations_completed || 0),
        audiosDownloaded: acc.audiosDownloaded + (d.audios_downloaded || 0),
        worksAfterGen: acc.worksAfterGen + (d.works_after_generation || 0),
        usesCreateMusic: acc.usesCreateMusic + (d.uses_create_music || 0),
        usesLyrics: acc.usesLyrics + (d.uses_lyrics || 0),
        usesVocal: acc.usesVocal + (d.uses_vocal || 0),
        usesCover: acc.usesCover + (d.uses_cover || 0),
        usesVideo: acc.usesVideo + (d.uses_video || 0),
        usesPromotion: acc.usesPromotion + (d.uses_promotion || 0),
        usesPress: acc.usesPress + (d.uses_press || 0),
        usesRegister: acc.usesRegister + (d.uses_register || 0),
        usesVoiceCloning: acc.usesVoiceCloning + (d.uses_voice_cloning || 0),
        uniqueUsers: Math.max(acc.uniqueUsers, d.unique_users || 0),
        totalRevenue: acc.totalRevenue + Number(d.total_revenue_eur || 0),
        revenueCreateMusic: acc.revenueCreateMusic + Number(d.revenue_create_music_eur || 0),
        revenueCover: acc.revenueCover + Number(d.revenue_cover_eur || 0),
        revenueVideo: acc.revenueVideo + Number(d.revenue_video_eur || 0),
        revenuePromotion: acc.revenuePromotion + Number(d.revenue_promotion_eur || 0),
        revenueRegister: acc.revenueRegister + Number(d.revenue_register_eur || 0),
      }),
      {
        aiStudioEntries: 0, generationsStarted: 0, generationsCompleted: 0,
        audiosDownloaded: 0, worksAfterGen: 0, usesCreateMusic: 0,
        usesLyrics: 0, usesVocal: 0, usesCover: 0, usesVideo: 0,
        usesPromotion: 0, usesPress: 0, usesRegister: 0,
        usesVoiceCloning: 0, uniqueUsers: 0, totalRevenue: 0,
        revenueCreateMusic: 0, revenueCover: 0, revenueVideo: 0,
        revenuePromotion: 0, revenueRegister: 0,
      }
    );
  }, [metrics]);

  const genToRegPct = totals.generationsCompleted > 0
    ? ((totals.worksAfterGen / totals.generationsCompleted) * 100).toFixed(1)
    : "0.0";

  const fmt = (n: number) => n.toLocaleString("es-ES");
  const fmtEur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  const pct = (a: number, b: number) => (b > 0 ? ((a / b) * 100).toFixed(1) + "%" : "—");

  // Feature usage data
  const featureUsage = useMemo(() => {
    const lc = liveFeatureCounts;
    const items = [
      { label: "Crear música", icon: "🎵", uses: lc["create_music"] || 0 },
      { label: "Compositor letras", icon: "📝", uses: lc["lyrics"] || 0 },
      { label: "Canta tu canción", icon: "🎤", uses: lc["vocal"] || 0 },
      { label: "Clonación de voz", icon: "🎙️", uses: lc["voice_cloning"] || 0 },
      { label: "Portadas con IA", icon: "🖼️", uses: lc["cover"] || 0 },
      { label: "Videoclips IA", icon: "🎬", uses: lc["video"] || 0 },
      { label: "Promoción RRSS", icon: "📱", uses: lc["promotion"] || 0 },
      { label: "Promo Premium", icon: "💎", uses: lc["premium_promotion"] || 0 },
      { label: "Prensa & visibilidad", icon: "📰", uses: lc["press"] || 0 },
      { label: "Registro blockchain", icon: "🔐", uses: lc["register"] || 0 },
      { label: "Masterizado profesional", icon: "🎛️", uses: lc["enhance_audio"] || 0 },
      { label: "Edición de audio", icon: "✂️", uses: lc["edit_audio"] || 0 },
      { label: "Distribución", icon: "🌍", uses: lc["distribution"] || 0 },
      { label: "Inspiración", icon: "💡", uses: lc["inspire"] || 0 },
    ];
    const total = items.reduce((s, i) => s + i.uses, 0);
    const maxUses = Math.max(...items.map((i) => i.uses));
    const minUses = Math.min(...items.map((i) => i.uses));
    return items.map((i) => ({
      ...i,
      pct: total > 0 ? ((i.uses / total) * 100).toFixed(1) : "0.0",
      isTop: i.uses === maxUses && maxUses > 0,
      isLow: i.uses === minUses && total > 0 && minUses < maxUses,
    }));
  }, [liveFeatureCounts]);

  // Revenue by feature — estimated from live usage × credit_cost × price_per_credit_eur
  // Mapping: tracking feature name → api_cost_config feature_key
  const revenueFeatures = useMemo(() => {
    const lc = liveFeatureCounts;
    const featureMap: { label: string; trackingKey: string; costKeys: string[] }[] = [
      { label: "Crear música", trackingKey: "create_music", costKeys: ["generate_audio", "generate_audio_song"] },
      { label: "Compositor letras", trackingKey: "lyrics", costKeys: ["generate_lyrics"] },
      { label: "Canta tu canción", trackingKey: "vocal", costKeys: ["generate_vocal_track"] },
      { label: "Clonación de voz", trackingKey: "voice_cloning", costKeys: ["voice_translation_per_min"] },
      { label: "Portadas con IA", trackingKey: "cover", costKeys: ["generate_cover"] },
      { label: "Videoclips IA", trackingKey: "video", costKeys: ["generate_video"] },
      { label: "Promoción RRSS", trackingKey: "promotion", costKeys: ["promote_work"] },
      { label: "Promo Premium", trackingKey: "premium_promotion", costKeys: ["promote_premium"] },
      { label: "Prensa & visibilidad", trackingKey: "press", costKeys: ["generate_press_release"] },
      { label: "Registro blockchain", trackingKey: "register", costKeys: ["register_work"] },
      { label: "Masterizado profesional", trackingKey: "enhance_audio", costKeys: ["enhance_audio"] },
      { label: "Edición de audio", trackingKey: "edit_audio", costKeys: ["edit_audio"] },
      { label: "Social Video", trackingKey: "social_video", costKeys: ["social_video"] },
    ];

    const items = featureMap.map((f) => {
      const uses = lc[f.trackingKey] || 0;
      // Average credit cost across matching configs (e.g. instrumental + song)
      const cfgs = f.costKeys.map((k) => costConfig[k]).filter(Boolean);
      const creditCost = cfgs.length > 0 ? Math.round(cfgs.reduce((s, c) => s + c.credit_cost, 0) / cfgs.length) : 0;
      const pricePerCredit = cfgs.length > 0 ? cfgs.reduce((s, c) => s + c.price_per_credit_eur, 0) / cfgs.length : 0.60;
      const revenue = uses * creditCost * pricePerCredit;
      return { label: f.label, uses, creditCost, revenue };
    }).filter((f) => f.creditCost > 0); // Solo features de pago

    items.sort((a, b) => b.revenue - a.revenue);

    const totalRevEst = items.reduce((s, f) => s + f.revenue, 0);
    return { items, totalRevEst };
  }, [liveFeatureCounts, costConfig]);

  // Cancellation reasons by plan type
  const cancellationCharts = useMemo(() => {
    const buildPlanData = (planFilter: string) => {
      const filtered = cancellationData.filter((c) => (c.plan_type || "").toLowerCase() === planFilter.toLowerCase());
      const total = filtered.length;
      const counts: Record<string, number> = {};
      for (const c of filtered) {
        counts[c.reason] = (counts[c.reason] || 0) + 1;
      }
      return Object.entries(counts)
        .map(([reason, count]) => ({
          name: REASON_LABELS[reason] || reason,
          value: count,
          pct: total > 0 ? ((count / total) * 100).toFixed(1) : "0",
        }))
        .sort((a, b) => b.value - a.value);
    };
    const annualData = buildPlanData("annual");
    const monthlyData = buildPlanData("monthly");
    return {
      annual: annualData,
      monthly: monthlyData,
      totalAnnual: cancellationData.filter((c) => (c.plan_type || "").toLowerCase() === "annual").length,
      totalMonthly: cancellationData.filter((c) => (c.plan_type || "").toLowerCase() === "monthly").length,
    };
  }, [cancellationData]);

  const revenueValues = metrics.map((d) => Number(d.total_revenue_eur || 0));
  const sortedRevs = [...revenueValues].sort((a, b) => a - b);
  const p75 = sortedRevs[Math.floor(sortedRevs.length * 0.75)] || 0;
  const median = sortedRevs[Math.floor(sortedRevs.length * 0.5)] || 0;

  const revColor = (v: number) => {
    if (v > p75) return "bg-green-600/20 text-green-300 font-semibold";
    if (v > median && median > 0) return "bg-green-600/10 text-green-400";
    return "text-muted-foreground";
  };

  if (loading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">📊 Métricas de Producto</h1>
            <p className="text-sm text-muted-foreground">Comportamiento de usuarios y conversión por feature</p>
          </div>
          <div className="flex items-center gap-2">
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
                {r === "7d" ? "7 días" : r === "30d" ? "30 días" : "90 días"}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={handleRecalculate} disabled={recalculating}>
              {recalculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-1 hidden sm:inline">Recalcular hoy</span>
            </Button>
          </div>
        </div>

        {metrics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Los datos empezarán a aparecer mañana. El sistema registra la actividad del día anterior cada noche a las 3:00 AM.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* BLOCK 1 — Funnel AI Studio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funnel AI Studio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Entradas AI Studio", value: totals.aiStudioEntries, prev: null },
                    { label: "Generaciones iniciadas", value: totals.generationsStarted, prev: totals.aiStudioEntries },
                    { label: "Generaciones completadas", value: totals.generationsCompleted, prev: totals.generationsStarted },
                    { label: "Descargas de audio", value: totals.audiosDownloaded, prev: totals.generationsCompleted },
                  ].map((step, i) => (
                    <div key={i} className="relative">
                      <div className={`rounded-lg border p-4 text-center ${i === 0 ? "bg-primary/10 border-primary/30" : "bg-muted/30"}`}>
                        <p className="text-2xl font-bold">{fmt(step.value)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{step.label}</p>
                        {step.prev !== null && (
                          <p className="text-xs mt-1 text-primary font-medium">{pct(step.value, step.prev)} del paso anterior</p>
                        )}
                      </div>
                      {i < 3 && (
                        <ArrowRight className="absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hidden md:block z-10" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* BLOCK 2 — Conversión Generar → Registrar */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Canciones generadas → registradas en blockchain</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <p className="text-5xl font-bold">{genToRegPct}%</p>
                  <Badge variant={Number(genToRegPct) > 30 ? "default" : Number(genToRegPct) >= 10 ? "secondary" : "destructive"} className="text-sm">
                    {Number(genToRegPct) > 30 ? "Excelente" : Number(genToRegPct) >= 10 ? "Aceptable" : "Bajo"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {fmt(totals.worksAfterGen)} registros tras generación de {fmt(totals.generationsCompleted)} generaciones completadas
                </p>
                <p className="text-xs text-muted-foreground/70 max-w-lg mx-auto">
                  Mide cuántos usuarios que generan música dan el siguiente paso y la protegen con blockchain. Es el KPI principal del diferencial competitivo de MusicDibs.
                </p>
              </CardContent>
            </Card>

            {/* BLOCK 3 — Uso por feature */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Uso por funcionalidad (período seleccionado)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {featureUsage.map((f) => (
                    <div key={f.label} className="rounded-lg border p-3 relative">
                      {f.isTop && (
                        <Badge variant="default" className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 gap-0.5">
                          <Star className="h-3 w-3" /> Top
                        </Badge>
                      )}
                      {f.isLow && (
                        <Badge variant="destructive" className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 gap-0.5">
                          <AlertTriangle className="h-3 w-3" /> Poco uso
                        </Badge>
                      )}
                      <p className="text-xl mb-1">{f.icon}</p>
                      <p className="text-lg font-bold">{fmt(f.uses)}</p>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-xs text-primary">{f.pct}% del total</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* BLOCK 4 — Revenue por feature (estimación basada en usos × créditos × precio medio del crédito desde api_cost_config) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ingresos por funcionalidad</CardTitle>
                <CardDescription className="text-xs">
                  ⚠️ Estimación basada en usos × coste en créditos × precio medio del crédito (0,60 €/crédito de api_cost_config). Los valores de €/uso y % revenue son aproximados.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead className="text-right">Usos</TableHead>
                        <TableHead className="text-right">Créditos/uso</TableHead>
                        <TableHead className="text-right">Ingresos est.</TableHead>
                        <TableHead className="text-right">€/uso</TableHead>
                        <TableHead className="text-right">% Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenueFeatures.items.map((f) => (
                        <TableRow key={f.label}>
                          <TableCell className="font-medium">{f.label}</TableCell>
                          <TableCell className="text-right">{fmt(f.uses)}</TableCell>
                          <TableCell className="text-right">{f.creditCost}</TableCell>
                          <TableCell className="text-right">{fmtEur(f.revenue)}</TableCell>
                          <TableCell className="text-right">{f.uses > 0 ? fmtEur(f.revenue / f.uses) : "—"}</TableCell>
                          <TableCell className="text-right">{pct(f.revenue, revenueFeatures.totalRevEst)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-bold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-right">{fmt(revenueFeatures.items.reduce((s, f) => s + f.uses, 0))}</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">{fmtEur(revenueFeatures.totalRevEst)}</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">100%</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* BLOCK 5 — Motivos de cancelación */}
            {(cancellationCharts.totalAnnual > 0 || cancellationCharts.totalMonthly > 0) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Motivos de cancelación</CardTitle>
                  <CardDescription className="text-xs">
                    Distribución de motivos por tipo de plan en el período seleccionado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { label: "Plan Anual", data: cancellationCharts.annual, total: cancellationCharts.totalAnnual },
                      { label: "Plan Mensual", data: cancellationCharts.monthly, total: cancellationCharts.totalMonthly },
                    ].map((plan) => (
                      <div key={plan.label}>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-sm">{plan.label}</h3>
                          <Badge variant="secondary" className="text-xs">{plan.total} cancelaciones</Badge>
                        </div>
                        {plan.total === 0 ? (
                          <p className="text-sm text-muted-foreground py-8 text-center">Sin cancelaciones en este período</p>
                        ) : (
                          <div className="flex flex-col items-center">
                            <ResponsiveContainer width="100%" height={220}>
                              <PieChart>
                                <Pie
                                  data={plan.data}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={85}
                                  paddingAngle={2}
                                  dataKey="value"
                                >
                                  {plan.data.map((_, idx) => (
                                    <Cell key={idx} fill={REASON_COLORS[idx % REASON_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  formatter={(value: number, name: string) => [`${value} (${((value / plan.total) * 100).toFixed(1)}%)`, name]}
                                  contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="w-full space-y-1 mt-2">
                              {plan.data.map((d, idx) => (
                                <div key={d.name} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: REASON_COLORS[idx % REASON_COLORS.length] }} />
                                    <span className="text-muted-foreground">{d.name}</span>
                                  </div>
                                  <span className="font-medium">{d.pct}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BLOCK 6 — Actividad diaria */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actividad diaria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Usuarios únicos</TableHead>
                        <TableHead className="text-right">Generaciones</TableHead>
                        <TableHead className="text-right">Registros</TableHead>
                        <TableHead className="text-right">Revenue €</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...metrics].reverse().map((d) => (
                        <TableRow key={d.date}>
                          <TableCell className="font-medium">{d.date}</TableCell>
                          <TableCell className="text-right">{d.unique_users}</TableCell>
                          <TableCell className="text-right">{d.generations_completed}</TableCell>
                          <TableCell className="text-right">{d.uses_register}</TableCell>
                          <TableCell className={`text-right ${revColor(Number(d.total_revenue_eur))}`}>
                            {fmtEur(Number(d.total_revenue_eur))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
