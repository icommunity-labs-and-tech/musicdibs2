import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProductTracking } from "@/hooks/useProductTracking";

const PressPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { track } = useProductTracking();

  const [works, setWorks] = useState<any[]>([]);
  const [selectedWork, setSelectedWork] = useState<any>(null);
  const [pressReleases, setPressReleases] = useState<any[]>([]);
  const [audiomackSlug, setAudiomackSlug] = useState("");
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
      className="shrink-0 h-8 w-8"
      onClick={() => handleCopy(text, field)}
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );

  const handleGeneratePR = async () => {
    if (!selectedWork) {
      toast({ title: t("dashboard.press.selectWork"), variant: "destructive" });
      return;
    }
    setGeneratingPR(true);
    setGeneratedPR(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        title: t("dashboard.press.prGenerated"),
        description: t("dashboard.press.prGeneratedDesc"),
      });
      track('press_release_generated', { feature: 'press' });
    } catch {
      toast({ title: t("dashboard.press.errorConnection"), variant: "destructive" });
    } finally {
      setGeneratingPR(false);
    }
  };




  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Newspaper className="h-6 w-6 text-primary" />
          {t("dashboard.press.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.press.subtitle")}
        </p>
      </div>

      {/* SECCIÓN 1 — Generador de Nota de Prensa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("dashboard.press.generatorTitle")}
          </CardTitle>
          <CardDescription>
            {t("dashboard.press.generatorDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Paso 1 */}
          <div className="space-y-2">
            <Label>{t("dashboard.press.step1")}</Label>
            {works.length === 0 ? (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4 text-center">
                <p>{t("dashboard.press.noWorks")}</p>
                <Button variant="link" className="mt-1" onClick={() => navigate("/dashboard/register")}>
                  {t("dashboard.press.goToRegister")}
                </Button>
              </div>
            ) : (
              <Select onValueChange={(id) => setSelectedWork(works.find((w) => w.id === id) || null)}>
                <SelectTrigger>
                  <SelectValue placeholder={t("dashboard.press.selectPlaceholder")} />
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

          {/* Paso 2 */}
          <div className="space-y-2">
            <Label>{t("dashboard.press.step2")}</Label>
            <Textarea
              value={artistBio}
              onChange={(e) => setArtistBio(e.target.value)}
              rows={3}
              placeholder={t("dashboard.press.bioPlaceholder")}
              className="text-sm"
            />
          </div>

          {/* Paso 3 */}
          <div className="space-y-2">
            <Label>{t("dashboard.press.step3")}</Label>
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

          <Button onClick={handleGeneratePR} disabled={generatingPR || !selectedWork} className="w-full gap-2">
            {generatingPR ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("dashboard.press.generating")}
              </>
            ) : (
              <>
                <Newspaper className="h-4 w-4" />
                {t("dashboard.press.generateBtn")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* RESULTADO */}
      {generatedPR && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>{t("dashboard.press.resultTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("dashboard.press.labelHeadline")}</Label>
              <div className="flex items-start gap-2">
                <p className="text-lg font-bold flex-1">{generatedPR.headline}</p>
                <CopyButton text={generatedPR.headline} field="headline" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t("dashboard.press.labelBody")}</Label>
              <div className="flex items-start gap-2">
                <Textarea readOnly value={generatedPR.body} rows={10} className="text-sm flex-1 bg-background" />
                <CopyButton text={generatedPR.body} field="body" />
              </div>
            </div>

            {generatedPR.artist_quote && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("dashboard.press.labelQuote")}</Label>
                <div className="flex items-start gap-2">
                  <p className="italic text-sm text-muted-foreground flex-1">"{generatedPR.artist_quote}"</p>
                  <CopyButton text={generatedPR.artist_quote} field="quote" />
                </div>
              </div>
            )}

            {generatedPR.short_bio && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("dashboard.press.labelBio")}</Label>
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{generatedPR.short_bio}</p>
                  <CopyButton text={generatedPR.short_bio} field="bio" />
                </div>
              </div>
            )}

            {generatedPR.hashtags?.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t("dashboard.press.labelHashtags")}</Label>
                <div className="flex flex-wrap gap-2">
                  {generatedPR.hashtags.map((tag: string, i: number) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors"
                      onClick={() => handleCopy(tag, `tag-${i}`)}
                    >
                      {copiedField === `tag-${i}` ? <Check className="h-3 w-3 mr-1" /> : null}
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />
            <p className="text-sm text-muted-foreground text-center">{t("dashboard.press.whatNow")}</p>

            {/* Groover Banner */}
            <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-white">{t("dashboard.press.grooverTitle")}</h3>
              </div>
              <p className="text-sm text-zinc-400">{t("dashboard.press.grooverDesc")}</p>
              <Button
                className="gap-2"
                onClick={() => {
                  const url = `https://groover.co/en/?ref=musicdibs&artist=${encodeURIComponent(selectedWork?.author || "")}&track=${encodeURIComponent(selectedWork?.title || "")}`;
                  window.open(url, "_blank");
                }}
              >
                {t("dashboard.press.grooverBtn")}
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
                  {t("dashboard.press.historyTitle")} ({pressReleases.length})
                </CardTitle>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {pressReleases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t("dashboard.press.historyEmpty")}</p>
              ) : (
                <div className="space-y-3">
                  {pressReleases.map((pr) => (
                    <div key={pr.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{pr.title}</p>
                          <p className="text-xs text-muted-foreground">{new Date(pr.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={pr.status === "draft" ? "secondary" : "default"} className="text-xs shrink-0">
                          {pr.status === "draft" ? t("dashboard.press.statusDraft") : t("dashboard.press.statusSent")}
                        </Badge>
                        <Button variant="ghost" size="sm" onClick={() => setExpandedPR(expandedPR === pr.id ? null : pr.id)}>
                          {expandedPR === pr.id ? t("dashboard.press.hideContent") : t("dashboard.press.showContent")}
                        </Button>
                      </div>
                      {expandedPR === pr.id && pr.body && (
                        <div className="space-y-2 pt-2 border-t">
                          <Textarea readOnly value={pr.body} rows={6} className="text-sm bg-muted/30" />
                          <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCopy(pr.body, `pr-${pr.id}`)}>
                            {copiedField === `pr-${pr.id}` ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {t("dashboard.press.copyBtn")}
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

      {/* SECCIÓN 3 — Audiomack */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">🎵 Tu perfil en Audiomack</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Conecta tu perfil de Audiomack para acceder rápidamente a tus estadísticas y compartir tu música con curadores.
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tu slug de Audiomack</Label>
            <div className="flex gap-2">
              <Input
                value={audiomackSlug}
                onChange={e => setAudiomackSlug(e.target.value)}
                placeholder="ej: nombre-artista"
                className="text-sm"
              />
              <Button
                variant="outline"
                onClick={async () => {
                  if (!audiomackSlug.trim() || !user) return;
                  await supabase.from('audiomack_connections').upsert(
                    { user_id: user.id, audiomack_slug: audiomackSlug.trim(), connected_at: new Date().toISOString() },
                    { onConflict: 'user_id' }
                  );
                  toast({ title: '✅ Perfil guardado' });
                }}
                disabled={!audiomackSlug.trim()}
              >
                Guardar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Encuéntralo en tu URL: audiomack.com/<strong>tu-slug</strong>
            </p>
          </div>
          {audiomackSlug && (
            <a
              href={`https://audiomack.com/${audiomackSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button className="w-full gap-2" variant="outline">
                <span>🎵</span> Ver mi perfil en Audiomack →
              </Button>
            </a>
          )}
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">📊 Analytics avanzados — Próximamente</p>
            <p>En la siguiente versión podrás ver tus reproducciones, seguidores y tendencias directamente desde MusicDibs gracias a la integración con Chartmetric.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PressPage;
