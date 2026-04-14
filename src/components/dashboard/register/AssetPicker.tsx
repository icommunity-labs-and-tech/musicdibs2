import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Music, Play, Pause, Loader2, Check, Search, FolderOpen } from 'lucide-react';

interface AudioAsset {
  id: string;
  title: string;
  url: string;
  genre: string | null;
  mood: string | null;
  duration: number;
  createdAt: string;
}

interface AssetPickerProps {
  onSelect: (audioUrl: string, fileName: string) => void;
  disabled?: boolean;
}

export function AssetPicker({ onSelect, disabled }: AssetPickerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user || !open) return;
    setLoading(true);
    supabase
      .from('ai_generations')
      .select('id, prompt, genre, mood, audio_url, duration, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAssets(
          (data || []).map((d) => ({
            id: d.id,
            title: d.prompt?.substring(0, 80) || 'Canción sin título',
            url: d.audio_url,
            genre: d.genre,
            mood: d.mood,
            duration: d.duration,
            createdAt: d.created_at,
          }))
        );
        setLoading(false);
      });
  }, [user, open]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return assets;
    const q = search.toLowerCase();
    return assets.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.genre?.toLowerCase().includes(q) ||
        a.mood?.toLowerCase().includes(q)
    );
  }, [assets, search]);

  const togglePlay = (asset: AudioAsset) => {
    if (playingId === asset.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    audioRef.current = new Audio(asset.url);
    audioRef.current.onended = () => setPlayingId(null);
    audioRef.current.play();
    setPlayingId(asset.id);
  };

  const handleSelect = (asset: AudioAsset) => {
    audioRef.current?.pause();
    setPlayingId(null);
    setSelectedId(asset.id);
    const label = asset.title.length > 40 ? asset.title.slice(0, 40) + '…' : asset.title;
    onSelect(asset.url, `${label}.mp3`);
    setOpen(false);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { audioRef.current?.pause(); setPlayingId(null); } setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1.5">
          <FolderOpen className="h-4 w-4" />
          Elegir de mi biblioteca
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            Biblioteca de audio
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Aún no tienes canciones generadas en AI Music Studio</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, género o mood…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-1.5 pr-2">
                {filtered.map((asset) => {
                  const isSelected = selectedId === asset.id;
                  const isPlaying = playingId === asset.id;
                  return (
                    <div
                      key={asset.id}
                      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border/40 hover:border-border hover:bg-muted/30'
                      }`}
                      onClick={() => handleSelect(asset)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(asset);
                        }}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{asset.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {[asset.genre, asset.mood].filter(Boolean).join(' · ') || formatDuration(asset.duration)}
                        </p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-sm text-center text-muted-foreground py-6">Sin resultados</p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
