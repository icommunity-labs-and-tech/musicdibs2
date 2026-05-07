import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Play, Pause, Download, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VariantRow {
  id: string;
  audio_url: string | null;
  storage_bucket: string | null;
  storage_path: string | null;
  variant_index: number;
  is_primary: boolean;
  duration: number | null;
  provider: string | null;
  created_at: string;
}

interface VariantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationGroupId: string | null;
  baseTitle?: string;
}

/**
 * Resolves a playable/downloadable URL for a variant.
 * Prefers existing audio_url for compatibility; falls back to a signed URL
 * generated from storage_bucket + storage_path when needed.
 */
async function resolveVariantUrlOnce(v: VariantRow): Promise<string | null> {
  if (v.audio_url) return v.audio_url;
  if (v.storage_bucket && v.storage_path) {
    const { data, error } = await supabase.storage
      .from(v.storage_bucket)
      .createSignedUrl(v.storage_path, 60 * 60);
    if (error) return null;
    return data?.signedUrl ?? null;
  }
  return null;
}

const RETRY_DELAYS_MS = [300, 800];

async function resolveVariantUrl(v: VariantRow): Promise<string | null> {
  let url = await resolveVariantUrlOnce(v);
  if (url) return url;
  for (const delay of RETRY_DELAYS_MS) {
    await new Promise((r) => setTimeout(r, delay));
    url = await resolveVariantUrlOnce(v);
    if (url) return url;
  }
  return null;
}

const formatDuration = (secs: number | null) => {
  if (!secs || secs <= 0) return "—";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function VariantsDialog({
  open,
  onOpenChange,
  generationGroupId,
  baseTitle,
}: VariantsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open || !generationGroupId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from("ai_generations")
      .select("id, audio_url, storage_bucket, storage_path, variant_index, is_primary, duration, provider, created_at")
      .eq("generation_group_id", generationGroupId)
      .order("variant_index", { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          toast({ title: "Error al cargar variantes", variant: "destructive" });
        } else {
          setVariants((data || []) as VariantRow[]);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, generationGroupId, toast]);

  // Track open state in a ref so async callbacks can detect close mid-flight
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; }, [open]);

  // Stop audio + reset transient state when dialog closes
  useEffect(() => {
    if (!open) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      setDownloadingId(null);
    }
  }, [open]);

  const togglePlay = async (v: VariantRow) => {
    if (playingId === v.id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = null;
    const url = await resolveVariantUrl(v);
    if (!openRef.current) return;
    if (!url) {
      toast({ title: "No se pudo reproducir esta variante", variant: "destructive" });
      return;
    }
    const audio = new Audio(url);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(v.id);
    audio.play().catch(() => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingId(null);
      toast({ title: "Error al reproducir", variant: "destructive" });
    });
  };

  const handleDownload = async (v: VariantRow) => {
    setDownloadingId(v.id);
    try {
      const url = await resolveVariantUrl(v);
      if (!openRef.current) return;
      if (!url) throw new Error("no_url");
      const res = await fetch(url);
      if (!openRef.current) return;
      const blob = await res.blob();
      if (!openRef.current) return;
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      const safeBase = (baseTitle || "variante").replace(/[^a-z0-9_\-]+/gi, "_").slice(0, 60);
      a.download = `${safeBase}_v${(v.variant_index ?? 0) + 1}.mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      if (openRef.current) toast({ title: "Error al descargar", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Variantes de la generación</DialogTitle>
          <DialogDescription>
            Cada variante es una versión independiente generada en la misma solicitud.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando variantes…</span>
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay variantes para esta generación.</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 pr-2">
              {variants.map((v) => {
                const isPlaying = playingId === v.id;
                return (
                  <div
                    key={v.id}
                    className="flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9 rounded-full"
                      onClick={() => togglePlay(v)}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          Variante {(v.variant_index ?? 0) + 1}
                        </p>
                        {v.is_primary && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Principal
                          </Badge>
                        )}
                        {v.provider && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {v.provider}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDuration(v.duration)} ·{" "}
                        {new Date(v.created_at).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
                      disabled={downloadingId === v.id}
                      onClick={() => handleDownload(v)}
                    >
                      {downloadingId === v.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
