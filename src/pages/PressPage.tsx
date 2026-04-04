import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Newspaper, Loader2, Copy, Check, ChevronDown, ExternalLink,
  BarChart3, Music, Users, Heart, Play, RotateCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const PressPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [works, setWorks] = useState<any[]>([]);
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [audiomackSlug, setAudiomackSlug] = useState("");
  const [audiomackMetrics, setAudiomackMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [generatingPR, setGeneratingPR] = useState(false);
  const [generatedPR, setGeneratedPR] = useState<any>(null);
  const [artistBio, setArtistBio] = useState("");
  const [prLanguage, setPrLanguage] = useState("es");
  const [copiedField, setCopiedField] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedPR, setExpandedPR] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("works")
      .select("id,title,author,type,description,blockchain_hash,checker_url,created_at")
      .eq("user_id", user.id)
      .eq("status", "registered")
      .order("created_at", { ascending: false })
      .then(({ data }) => setWorks(data || []));

    supabase
      .from("press_releases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPressReleases(data || []));

    supabase
      .from("audiomack_connections")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.audiomack_slug) setAudiomackSlug(data.audiomack_slug);
      });
  }, [user]);

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(""), 2000);
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </Button>
  );

  const handleGeneratePR = async () => {
    if (!selectedWork) {
      toast({ title: "Selecciona una obra", variant: "destructive" });
      return;
    }
    setGeneratingPR(true);
    setGeneratedPR(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-press-release`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            work_id: selectedWork.id,
            artist_name: selectedWork.author || user?.email?.split("@")[0],
            work_title: selectedWork.title,
            work_type: selectedWork.type,
            description: selectedWork.description,
            blockchain_hash: selectedWork.blockchain_hash,
            checker_url: selectedWork.checker_url,
            language: prLanguage,
            artist_bio: artistBio || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
        return;
      }
      setGeneratedPR(data);
      setPressReleases((prev) => [
        {
          id: data.press_release_id,
          title: data.headline,
          body: data.body,
          created_at: new Date().toISOString(),
          status: "draft",
        },
        ...prev,
      ]);
      toast({
        title: "📰 ¡Nota de prensa generada!",
        description: "Lista para enviar a medios y blogs.",
      });
    } catch {
      toast({ title: "Error de conexión", variant: "destructive" });
    } finally {
      setGeneratingPR(false);
    }
  };

  const handleFetchMetrics = async () => {
    if (!audiomackSlug.trim()) {
      toast({ title: "Introduce tu slug de Audiomack", variant: "destructive" });
      return;
    }
    setLoadingMetrics(true);
    try {
      if (user) {
        await supabase.from("audiomack_connections").upsert(
          {
            user_id: user.id,
            audiomack_slug: audiomackSlug.trim(),
            connected_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
      const res = await fetch(
        `https://api.audiomack.com/v1/artist/${audiomackSlug.trim()}?consumer_key=musicdibs`
      );
      if (!res.ok) throw new Error("Artista no encontrado en Audiomack");
      const data = await res.json();
      const artist = data.results || data;

      const metricsRes = await fetch(
        `https://api.audiomack.com/v1/artist/${audiomackSlug.trim()}/metrics?consumer_key=musicdibs`
      );
      const metricsData = metricsRes.ok ? await metricsRes.json() : null;
      setAudiomackMetrics({ artist, metrics: metricsData?.results || null });
      toast({
        title: "✅ Métricas cargadas",
        description: `Datos de ${artist.name || audiomackSlug} actualizados.`,
      });
    } catch (err: any) {
      toast({ title: "Error Audiomack", description: err.message, variant: "destructive" });
    } finally {
      setLoadingMetrics(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          Prensa & Visibilidad
        </h1>
        <p className="text-muted-foreground mt-1">
          Genera tu nota de prensa con IA, envíala a blogs y medios musicales, y mide tu impacto.
        </p>
      </div>

      {/* SECCIÓN 1 — Generador de Nota de Prensa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📰 Nota de prensa con IA
          </CardTitle>
          <CardDescription>
            Genera una nota de prensa profesional basada en tu obra registrada en blockchain.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paso 1 — Seleccionar obra */}
          <div className="space-y-2">
            <Label>1. Selecciona tu obra registrada</Label>
            {works.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                <p>Primero registra una obra en blockchain.</p>
                <Button
                  variant="link"
                  className="mt-1"
                  onClick={() => navigate("/dashboard/register")}
                >
                  Ir a registrar obra →
                </Button>
              </div>
            ) : (
              <Select
                onValueChange={(id) =>
                  setSelectedWork(works.find((w) => w.id === id) || null)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elige una obra..." />
                </SelectTrigger>
                <SelectContent>
                  {works.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.title} — {w.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Paso 2 — Bio del artista */}
          <div className="space-y-2">
            <Label>2. Bio del artista (opcional)</Label>
            <Textarea
              value={artistBio}
              onChange={(e) => setArtistBio(e.target.value)}
              rows={3}
              placeholder="Cuéntanos sobre ti como artista (opcional — si no la añades, la IA la generará automáticamente)"
              className="text-sm"
            />
          </div>

          {/* Paso 3 — Idioma */}
          <div className="space-y-2">
            <Label>3. Idioma</Label>
            <Select value={prLanguage} onValueChange={setPrLanguage}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGeneratePR}
            disabled={generatingPR || !selectedWork}
            className="w-full gap-2"
          >
            {generatingPR ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando con IA...
              </>
            ) : (
              <>
                <Newspaper className="h-4 w-4" />
                Generar nota de prensa (gratis)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {generatedPR && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>Tu nota de prensa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Headline */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Titular</Label>
              <div className="flex items-start gap-2">
                <p className="text-lg font-bold flex-1">{generatedPR.headline}</p>
                <CopyButton text={generatedPR.headline} field="headline" />
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cuerpo completo</Label>
              <div className="flex items-start gap-2">
                <Textarea
                  readOnly
                  value={generatedPR.body}
                  rows={10}
                  className="text-sm flex-1 bg-background"
                />
                <CopyButton text={generatedPR.body} field="body" />
              </div>
            </div>

            {/* Artist Quote */}
            {generatedPR.artist_quote && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cita del artista</Label>
                <div className="flex items-start gap-2">
                  <p className="italic text-sm text-muted-foreground flex-1">
                    "{generatedPR.artist_quote}"
                  </p>
                  <CopyButton text={generatedPR.artist_quote} field="quote" />
                </div>
              </div>
            )}

            {/* Short Bio */}
            {generatedPR.short_bio && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Bio corta</Label>
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{generatedPR.short_bio}</p>
                  <CopyButton text={generatedPR.short_bio} field="bio" />
                </div>
              </div>
            )}

            {/* Hashtags */}
            {generatedPR.hashtags?.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hashtags</Label>
                <div className="flex flex-wrap gap-2">
                  {generatedPR.hashtags.map((tag: string, i: number) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleCopy(tag, `tag-${i}`)}
                    >
                      {copiedField === `tag-${i}` ? (
                        <Check className="h-3 w-3 mr-1" />
                      ) : null}
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />
            <p className="text-sm text-muted-foreground text-center">
              ¿Qué haces ahora con tu nota de prensa?
            </p>

            {/* Groover Banner */}
            <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-white">
                  Envíala a blogs, radios y medios especializados
                </h3>
              </div>
              <p className="text-sm text-zinc-400">
                Groover conecta tu música con más de 3.000 curadores, blogs y medios musicales.
                Garantía de respuesta en 7 días o te devuelven los créditos.
              </p>
              <Button
                className="gap-2"
                onClick={() => {
                  const url = `https://groover.co/en/?ref=musicdibs&artist=${encodeURIComponent(
                    selectedWork?.author || ""
                  )}&track=${encodeURIComponent(selectedWork?.title || "")}`;
                  window.open(url, "_blank");
                }}
              >
                Ir a Groover →
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECCIÓN 2 — Historial */}
      <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Mis notas de prensa generadas ({pressReleases.length})
                </CardTitle>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    historyOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {pressReleases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aún no has generado notas de prensa.
                </p>
              ) : (
                <div className="space-y-3">
                  {pressReleases.map((pr) => (
                    <div
                      key={pr.id}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {pr.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(pr.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            pr.status === "draft" ? "secondary" : "default"
                          }
                          className="text-xs shrink-0"
                        >
                          {pr.status === "draft" ? "Borrador" : "Enviada"}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedPR(
                              expandedPR === pr.id ? null : pr.id
                            )
                          }
                        >
                          {expandedPR === pr.id ? "Ocultar" : "Ver/copiar"}
                        </Button>
                      </div>
                      {expandedPR === pr.id && pr.body && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea
                            readOnly
                            value={pr.body}
                            rows={6}
                            className="text-sm bg-muted/30"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleCopy(pr.body, `pr-${pr.id}`)}
                          >
                            {copiedField === `pr-${pr.id}` ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            Copiar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* SECCIÓN 3 — Métricas Audiomack */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Métricas en Audiomack
          </CardTitle>
          <CardDescription>
            Conecta tu perfil de Audiomack para ver tus estadísticas de reproducciones y engagement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tu slug de Audiomack (ej: nombre-artista)</Label>
            <div className="flex gap-2">
              <Input
                value={audiomackSlug}
                onChange={(e) => setAudiomackSlug(e.target.value)}
                placeholder="nombre-artista"
                className="flex-1"
              />
              <Button
                onClick={handleFetchMetrics}
                disabled={loadingMetrics || !audiomackSlug.trim()}
                className="gap-2 shrink-0"
              >
                {loadingMetrics ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Conectar y ver métricas
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encuéntralo en tu URL de Audiomack: audiomack.com/<strong>TU-SLUG</strong>
            </p>
          </div>

          {audiomackMetrics && (
            <div className="space-y-4 pt-4 border-t">
              {/* Artist info */}
              <div className="flex items-center gap-3">
                {audiomackMetrics.artist?.image && (
                  <img
                    src={audiomackMetrics.artist.image}
                    alt={audiomackMetrics.artist.name}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold">
                    {audiomackMetrics.artist?.name || audiomackSlug}
                  </p>
                  {audiomackMetrics.artist?.genre && (
                    <p className="text-xs text-muted-foreground">
                      {audiomackMetrics.artist.genre}
                    </p>
                  )}
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {audiomackMetrics.artist?.followers?.toLocaleString() || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Music className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {audiomackMetrics.artist?.total_uploads?.toLocaleString() || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Uploads</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <Heart className="h-4 w-4 mx-auto mb-1 text-primary" />
                  <p className="text-lg font-bold">
                    {audiomackMetrics.artist?.total_favorites?.toLocaleString() || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Favoritos</p>
                </div>
              </div>

              {/* Extra metrics */}
              {audiomackMetrics.metrics?.event_counters && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <Play className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="text-lg font-bold">
                      {audiomackMetrics.metrics.event_counters.plays_last_hour?.toLocaleString() ||
                        "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reproducciones última hora
                    </p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <RotateCw className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="text-lg font-bold">
                      {audiomackMetrics.metrics.event_counters.reposts_last_hour?.toLocaleString() ||
                        "0"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reposts última hora
                    </p>
                  </div>
                </div>
              )}

              {/* Top songs */}
              {audiomackMetrics.artist?.music_top10 &&
                audiomackMetrics.artist.music_top10.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm">Top canciones</Label>
                    <div className="space-y-1">
                      {audiomackMetrics.artist.music_top10.map(
                        (song: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded"
                          >
                            <span className="truncate flex-1">
                              {i + 1}. {song.title}
                            </span>
                            <span className="text-muted-foreground shrink-0 ml-2">
                              {song.plays?.toLocaleString() || "—"} plays
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  window.open(
                    `https://audiomack.com/${audiomackSlug}`,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
                Ver perfil en Audiomack →
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PressPage;
