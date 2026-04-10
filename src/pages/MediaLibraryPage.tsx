import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Download, Music, Video, Image, Mic, Loader2, Search,
  CheckSquare, Square, Package, Play, Pause, Trash2, X,
  FileAudio, Film, ImageIcon, FolderOpen, Lock
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLibraryAccess, registerFreeDownload } from "@/hooks/useLibraryAccess";
import LibraryAccessBanner from "@/components/library/LibraryAccessBanner";
import JSZip from "jszip";

// ── Types ──
interface MediaAsset {
  id: string;
  type: "song" | "video" | "cover" | "vocal";
  title: string;
  url: string | null;
  createdAt: string;
  meta?: Record<string, string>;
}

type TabType = "all" | "song" | "video" | "cover" | "vocal";

const TAB_CONFIG: { value: TabType; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "Todo", icon: FolderOpen },
  { value: "song", label: "Canciones", icon: Music },
  { value: "video", label: "Vídeos", icon: Film },
  { value: "cover", label: "Portadas", icon: ImageIcon },
  { value: "vocal", label: "Voces", icon: Mic },
];

export default function MediaLibraryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const libraryAccess = useLibraryAccess();
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabType>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // ── Fetch all assets ──
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const allAssets: MediaAsset[] = [];

      // Songs from ai_generations
      const { data: songs } = await supabase
        .from("ai_generations")
        .select("id, prompt, audio_url, genre, mood, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (songs) {
        songs.forEach((s) =>
          allAssets.push({
            id: s.id,
            type: "song",
            title: s.prompt?.substring(0, 80) || "Canción sin título",
            url: s.audio_url,
            createdAt: s.created_at,
            meta: { genre: s.genre || "", mood: s.mood || "" },
          })
        );
      }

      // Videos from video_generations
      const { data: videos } = await supabase
        .from("video_generations")
        .select("id, prompt, video_url, merged_url, status, created_at, style")
        .eq("user_id", user.id)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false });

      if (videos) {
        videos.forEach((v) =>
          allAssets.push({
            id: v.id,
            type: "video",
            title: v.prompt?.substring(0, 80) || "Vídeo sin título",
            url: v.merged_url || v.video_url,
            createdAt: v.created_at,
            meta: { style: v.style || "" },
          })
        );
      }

      // Covers from social_promotions
      const { data: promos } = await supabase
        .from("social_promotions")
        .select("id, image_url, created_at, work_id")
        .eq("user_id", user.id)
        .not("image_url", "is", null)
        .order("created_at", { ascending: false });

      if (promos) {
        promos.forEach((p) =>
          allAssets.push({
            id: p.id,
            type: "cover",
            title: `Portada promocional`,
            url: p.image_url,
            createdAt: p.created_at,
          })
        );
      }

      // Covers generated from AI Studio (stored in social-promo-images/covers/{userId}/)
      const { data: coverFiles } = await supabase.storage
        .from("social-promo-images")
        .list(`covers/${user.id}`, { limit: 200, sortBy: { column: "created_at", order: "desc" } });

      if (coverFiles) {
        const promoUrls = new Set(promos?.map((p) => p.image_url) || []);
        coverFiles
          .filter((f) => f.name.endsWith(".png") || f.name.endsWith(".jpg"))
          .forEach((f) => {
            const { data: pubUrl } = supabase.storage
              .from("social-promo-images")
              .getPublicUrl(`covers/${user.id}/${f.name}`);
            // Skip if already added from social_promotions
            if (promoUrls.has(pubUrl.publicUrl)) return;
            allAssets.push({
              id: `cover-file-${f.id || f.name}`,
              type: "cover",
              title: `Portada IA`,
              url: pubUrl.publicUrl,
              createdAt: f.created_at || new Date().toISOString(),
            });
          });
      }

      // Voice clones samples
      const { data: clones } = await supabase
        .from("voice_clones")
        .select("id, name, sample_storage_path, created_at, status")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (clones) {
        for (const c of clones) {
          let url: string | null = null;
          if (c.sample_storage_path) {
            const { data: signedData } = await supabase.storage
              .from("voice-clone-samples")
              .createSignedUrl(c.sample_storage_path, 3600);
            url = signedData?.signedUrl || null;
          }
          allAssets.push({
            id: c.id,
            type: "vocal",
            title: c.name || "Voz clonada",
            url,
            createdAt: c.created_at,
          });
        }
      }

      setAssets(allAssets);
      setLoading(false);
    };
    load();
  }, [user]);

  // ── Filtering ──
  const filtered = useMemo(() => {
    let list = assets;
    if (tab !== "all") list = list.filter((a) => a.type === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          Object.values(a.meta || {}).some((v) => v.toLowerCase().includes(q))
      );
    }
    return list;
  }, [assets, tab, search]);

  // ── Selection ──
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  // ── Download single ──
  const downloadSingle = async (asset: MediaAsset) => {
    if (!asset.url) return;
    if (!libraryAccess.canDownload) return;
    setDownloading(asset.id);
    try {
      // Register free download if in warning tier
      if (libraryAccess.tier === 'warning' && user) {
        await registerFreeDownload(user.id);
      }
      const resp = await fetch(asset.url);
      const blob = await resp.blob();
      const ext = asset.type === "song" ? "mp3" : asset.type === "video" ? "mp4" : asset.type === "cover" ? "png" : "mp3";
      const filename = `${asset.title.substring(0, 50).replace(/[^a-zA-Z0-9áéíóúñ ]/g, "")}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
    setDownloading(null);
  };

  // ── Download ZIP ──
  const downloadZip = async () => {
    const items = assets.filter((a) => selected.has(a.id) && a.url);
    if (!items.length) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folders: Record<string, JSZip> = {
        song: zip.folder("canciones")!,
        video: zip.folder("videos")!,
        cover: zip.folder("portadas")!,
        vocal: zip.folder("voces")!,
      };
      const extMap: Record<string, string> = { song: "mp3", video: "mp4", cover: "png", vocal: "mp3" };

      await Promise.all(
        items.map(async (asset, i) => {
          try {
            const resp = await fetch(asset.url!);
            const blob = await resp.blob();
            const name = `${(i + 1).toString().padStart(2, "0")}_${asset.title.substring(0, 40).replace(/[^a-zA-Z0-9áéíóúñ ]/g, "")}.${extMap[asset.type]}`;
            folders[asset.type].file(name, blob);
          } catch { /* skip failed */ }
        })
      );

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `MusicDibs_assets_${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: `${items.length} archivos descargados` });
      setSelected(new Set());
    } catch {
      toast({ title: "Error al crear ZIP", variant: "destructive" });
    }
    setDownloadingZip(false);
  };

  // ── Delete single ──
  const deleteAsset = async (asset: MediaAsset) => {
    setDeleting(asset.id);
    try {
      const tbl = asset.type === "song" ? "ai_generations" as const
        : asset.type === "video" ? "video_generations" as const
        : asset.type === "cover" ? "social_promotions" as const
        : "voice_clones" as const;
      const { error } = await supabase.from(tbl).delete().eq("id", asset.id);
      if (error) throw error;
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      setSelected((prev) => { const n = new Set(prev); n.delete(asset.id); return n; });
      toast({ title: "Asset eliminado" });
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
    setDeleting(null);
  };

  // ── Delete bulk ──
  const deleteBulk = async () => {
    const items = assets.filter((a) => selected.has(a.id));
    if (!items.length) return;
    setDeletingBulk(true);
    let deleted = 0;

    const byType = items.reduce((acc, a) => {
      (acc[a.type] ??= []).push(a.id);
      return acc;
    }, {} as Record<string, string[]>);

    for (const [type, ids] of Object.entries(byType)) {
      let error: any = null;
      if (type === "song") ({ error } = await supabase.from("ai_generations").delete().in("id", ids));
      else if (type === "video") ({ error } = await supabase.from("video_generations").delete().in("id", ids));
      else if (type === "cover") ({ error } = await supabase.from("social_promotions").delete().in("id", ids));
      else if (type === "vocal") ({ error } = await supabase.from("voice_clones").delete().in("id", ids));
      if (!error) deleted += ids.length;
    }

    setAssets((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
    toast({ title: `${deleted} assets eliminados` });
    setDeletingBulk(false);
  };

  // ── Playback ──
  const togglePlay = (asset: MediaAsset) => {
    if (!asset.url) return;
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(asset.url);
    audio.onended = () => setPlayingId(null);
    audio.play();
    audioRef.current = audio;
    setPlayingId(asset.id);
  };

  // ── Icon for type ──
  const typeIcon = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return <Music className="h-4 w-4" />;
      case "video": return <Film className="h-4 w-4" />;
      case "cover": return <ImageIcon className="h-4 w-4" />;
      case "vocal": return <Mic className="h-4 w-4" />;
    }
  };

  const typeBadgeColor = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "video": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "cover": return "bg-pink-500/15 text-pink-400 border-pink-500/30";
      case "vocal": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  const typeLabel = (type: MediaAsset["type"]) => {
    switch (type) {
      case "song": return "Canción";
      case "video": return "Vídeo";
      case "cover": return "Portada";
      case "vocal": return "Voz";
    }
  };

  return (
    <div className="space-y-6">
      {/* Library Access Banner */}
      <LibraryAccessBanner />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">📂 Biblioteca multimedia</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos tus assets creados con AI Studio en un solo lugar
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {selected.size} seleccionados
            </Badge>
            <Button
              size="sm"
              onClick={downloadZip}
              disabled={downloadingZip}
              className="rounded-full"
            >
              {downloadingZip ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-1" />
              )}
              Descargar ZIP
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deletingBulk}
                  className="rounded-full"
                >
                  {deletingBulk ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Eliminar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar {selected.size} assets?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Los archivos seleccionados se eliminarán permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteBulk} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Eliminar {selected.size} assets
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, género, mood..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={selectAll}
          className="shrink-0"
        >
          {selected.size === filtered.length && filtered.length > 0 ? (
            <CheckSquare className="h-4 w-4 mr-1" />
          ) : (
            <Square className="h-4 w-4 mr-1" />
          )}
          {selected.size === filtered.length && filtered.length > 0
            ? "Deseleccionar todo"
            : "Seleccionar todo"}
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as TabType); setSelected(new Set()); }}>
        <TabsList className="w-full sm:w-auto">
          {TAB_CONFIG.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5 mr-1" />
              {t.label}
              {t.value !== "all" && (
                <span className="ml-1 text-muted-foreground">
                  ({assets.filter((a) => a.type === t.value).length})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content for all tabs is the same filtered view */}
        {TAB_CONFIG.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mb-3 opacity-40" />
                <p className="text-sm">No hay assets{t.value !== "all" ? ` de tipo "${t.label}"` : ""}</p>
                <p className="text-xs mt-1">Crea contenido en AI Studio para verlo aquí</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((asset) => (
                  <Card
                    key={asset.id}
                    className={`group relative transition-all duration-200 hover:border-primary/40 ${
                      selected.has(asset.id) ? "border-primary ring-1 ring-primary/20" : ""
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selected.has(asset.id)}
                          onCheckedChange={() => toggleSelect(asset.id)}
                          className="mt-1 shrink-0"
                        />

                        {/* Preview thumbnail */}
                        {asset.type === "cover" && asset.url ? (
                          <div className="h-14 w-14 rounded-md overflow-hidden bg-muted shrink-0">
                            <img
                              src={asset.url}
                              alt={asset.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
                            {typeIcon(asset.type)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{asset.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${typeBadgeColor(asset.type)}`}
                            >
                              {typeLabel(asset.type)}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(asset.createdAt).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                          {asset.meta && Object.values(asset.meta).filter(Boolean).length > 0 && (
                            <p className="text-[10px] text-muted-foreground mt-1 truncate">
                              {Object.values(asset.meta).filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border/40">
                        {(asset.type === "song" || asset.type === "vocal") && asset.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => togglePlay(asset)}
                          >
                            {playingId === asset.id ? (
                              <Pause className="h-3.5 w-3.5 mr-1" />
                            ) : (
                              <Play className="h-3.5 w-3.5 mr-1" />
                            )}
                            {playingId === asset.id ? "Parar" : "Escuchar"}
                          </Button>
                        )}
                        {asset.type === "video" && asset.url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(asset.url!, "_blank")}
                          >
                            <Play className="h-3.5 w-3.5 mr-1" />
                            Ver
                          </Button>
                        )}
                        <div className="flex-1" />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              disabled={deleting === asset.id}
                            >
                              {deleting === asset.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar este asset?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{asset.title.substring(0, 60)}" se eliminará permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAsset(asset)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        {libraryAccess.canDownload ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!asset.url || downloading === asset.id}
                            onClick={() => downloadSingle(asset)}
                          >
                            {downloading === asset.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs opacity-50"
                                  disabled
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reactiva tu plan para descargar</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
