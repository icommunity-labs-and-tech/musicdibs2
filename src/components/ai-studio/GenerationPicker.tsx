import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Music, Play, Pause, Loader2, Check } from "lucide-react";

interface Generation {
  id: string;
  prompt: string;
  genre: string | null;
  mood: string | null;
  audio_url: string;
  duration: number;
  created_at: string;
}

interface GenerationPickerProps {
  onSelect: (audioUrl: string, name: string) => void;
}

export const GenerationPicker = ({ onSelect }: GenerationPickerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ai_generations")
      .select("id, prompt, genre, mood, audio_url, duration, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setGenerations(data || []);
        setLoading(false);
      });
  }, [user]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const togglePlay = (gen: Generation) => {
    if (playingId === gen.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = new Audio(gen.audio_url);
    audioRef.current.onended = () => setPlayingId(null);
    audioRef.current.play();
    setPlayingId(gen.id);
  };

  const handleSelect = (gen: Generation) => {
    audioRef.current?.pause();
    setPlayingId(null);
    setSelectedId(gen.id);
    const label = gen.prompt.length > 40 ? gen.prompt.slice(0, 40) + "…" : gen.prompt;
    onSelect(gen.audio_url, `${label}.mp3`);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("common.loading", "Cargando…")}</span>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">{t("masterize.noGenerations", "Aún no tienes canciones generadas en AI Studio")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-1.5 pr-2">
        {generations.map((gen) => {
          const isSelected = selectedId === gen.id;
          const isPlaying = playingId === gen.id;
          return (
            <div
              key={gen.id}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border/40 hover:border-border hover:bg-muted/30"
              }`}
              onClick={() => handleSelect(gen)}
            >
              {/* Play/pause */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(gen);
                }}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
              </Button>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{gen.prompt}</p>
                <p className="text-xs text-muted-foreground">
                  {[gen.genre, gen.mood].filter(Boolean).join(" · ") || formatDuration(gen.duration)}
                </p>
              </div>

              {/* Selected check */}
              {isSelected && (
                <Check className="w-4 h-4 text-primary shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
