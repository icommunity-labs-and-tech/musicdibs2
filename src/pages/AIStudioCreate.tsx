import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { 
  ArrowLeft, Wand2, Loader2, Play, Pause, Download, 
  Heart, Clock, Music, Trash2, Filter, CalendarIcon, X,
  AlertCircle, RefreshCw, ShieldCheck, CheckSquare, Square,
  FileText, Copy, RotateCcw, Music2, CheckCircle2, ChevronDown,
  Mic, Headphones, Import, RotateCw, Sparkles
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { GENRES, MOODS, type GenerationResult } from "@/types/aiStudio";
import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";

// ── Music tab constants ──
const MUSIC_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Flamenco', 'Electrónica', 'Jazz', 'Clásica', 'R&B', 'Latin'];
const MUSIC_MOODS = ['Alegre', 'Melancólico', 'Épico', 'Relajado', 'Enérgico', 'Romántico', 'Oscuro', 'Motivador'];
const DURATION_OPTIONS = [30, 60, 90, 120] as const;

// ── Lyrics tab constants ──
const LYRIC_STYLES = ["Narrativa", "Abstracta", "Descriptiva", "Reivindicativa", "Introspectiva", "Poética"];
const LYRIC_LANGUAGES = ["Español", "Inglés", "Spanglish", "Portugués", "Francés"];
const RHYME_SCHEMES = [
  { value: "ABAB", label: "ABAB — Alterna" },
  { value: "AABB", label: "AABB — Pareados" },
  { value: "ABCB", label: "ABCB — Balada" },
  { value: "libre", label: "Libre — Sin rima" },
];
const STRUCTURES = [
  { value: "V+C+V+C+P+C", label: "Verso · Coro · Verso · Coro · Puente · Coro" },
  { value: "V+C+V+C", label: "Verso · Coro · Verso · Coro" },
  { value: "V+V+C+V+C", label: "Verso · Verso · Coro · Verso · Coro" },
  { value: "V+C+P+C", label: "Verso · Coro · Puente · Coro" },
];
const ARTIST_REFS = [
  "Bad Bunny", "Rosalía", "C. Tangana", "J Balvin",
  "Bizarrap", "Shakira", "Residente", "Anuel AA",
  "Eminem", "Drake", "Kendrick Lamar", "Taylor Swift",
  "The Weeknd", "Beyoncé", "Radiohead", "Arctic Monkeys",
];
const THEMES = ["Amor", "Desamor", "Superación", "Fiesta", "Calle", "Familia", "Libertad", "Nostalgia", "Éxito", "Identidad"];
const POVS = ["Primera persona", "Segunda persona", "Tercera persona"];

interface LyricsGeneration {
  id: string;
  lyrics: string;
  description: string | null;
  theme: string | null;
  genre: string | null;
  mood: string | null;
  created_at: string;
}

// ── Audio Wave Animation Component ──
const AudioWaveAnimation = () => (
  <div className="flex items-end justify-center gap-1 h-16">
    {[...Array(12)].map((_, i) => (
      <div
        key={i}
        className="w-1.5 bg-primary rounded-full animate-pulse"
        style={{
          height: `${20 + Math.random() * 80}%`,
          animationDelay: `${i * 0.1}s`,
          animationDuration: `${0.6 + Math.random() * 0.4}s`,
        }}
      />
    ))}
  </div>
);

const AIStudioCreate = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, hasEnough } = useCredits();
  const formRef = useRef<HTMLDivElement>(null);

  // ── Music tab state ──
  const [mode, setMode] = useState<'song' | 'instrumental'>('song');
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(60);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState("");
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<{ message: string; details?: string } | null>(null);
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);

  // ── History & playback state ──
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());

  // ── Filter state ──
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [filterGenre, setFilterGenre] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>(undefined);
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>(undefined);

  // ── Bulk selection state ──
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Lyrics composer state ──
  const [lyricsDesc, setLyricsDesc] = useState("");
  const [lyricsGenre, setLyricsGenre] = useState("");
  const [lyricsMood, setLyricsMood] = useState("");
  const [lyricsStyle, setLyricsStyle] = useState("");
  const [lyricsLanguage, setLyricsLanguage] = useState("Español");
  const [lyricsRhyme, setLyricsRhyme] = useState("ABAB");
  const [lyricsStructure, setLyricsStructure] = useState("V+C+V+C+P+C");
  const [lyricsArtistRefs, setLyricsArtistRefs] = useState<string[]>([]);
  const [lyricsPov, setLyricsPov] = useState("Primera persona");
  const [lyricsTheme, setLyricsTheme] = useState("");
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [regenSection, setRegenSection] = useState("");
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  // ── Lyrics history state ──
  const [activeTab, setActiveTab] = useState<"music" | "lyrics">("music");
  const [lyricsHistory, setLyricsHistory] = useState<LyricsGeneration[]>([]);
  const [lyricsLoading, setLyricsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ── Improve prompt state ──
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [isImprovingLyrics, setIsImprovingLyrics] = useState(false);
  const [improvedLyricsDesc, setImprovedLyricsDesc] = useState(false);

  // ── Voice selector state ──
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);

  // ── Derived values ──
  const currentCost = mode === 'song' ? FEATURE_COSTS.generate_audio_song : FEATURE_COSTS.generate_audio;
  const currentFeature = mode === 'song' ? 'generate_audio_song' : 'generate_audio';
  const modeLabel = mode === 'song' ? 'Canción con voz' : 'Instrumental';

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    results.forEach(r => { if (r.genre) genres.add(r.genre); });
    return Array.from(genres).sort();
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(result => {
      if (filterFavorites && !result.isFavorite) return false;
      if (filterGenre !== "all" && result.genre !== filterGenre) return false;
      if (filterDateFrom && result.createdAt < filterDateFrom) return false;
      if (filterDateTo) {
        const endOfDay = new Date(filterDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (result.createdAt > endOfDay) return false;
      }
      return true;
    });
  }, [results, filterFavorites, filterGenre, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterFavorites || filterGenre !== "all" || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setFilterFavorites(false);
    setFilterGenre("all");
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
  };

  // ── Load history on mount ──
  useEffect(() => {
    if (user) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
    // Load voice profiles
    supabase
      .from('voice_profiles')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setVoiceProfiles(data || []));
  }, [user]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setResults((data || []).map(item => ({
        id: item.id,
        audioUrl: item.audio_url,
        prompt: item.prompt,
        duration: item.duration,
        genre: item.genre || undefined,
        mood: item.mood || undefined,
        createdAt: new Date(item.created_at),
        isFavorite: item.is_favorite || false,
      })));
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Generate music ──
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Error", description: "Escribe una descripción para tu canción", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para generar música", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setLastResult(null);

    try {
      // Spend credits
      const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: currentFeature, description: `${modeLabel}: ${prompt.slice(0, 80)}` },
      });
      if (spendError) throw { message: spendError.message || 'Error al descontar créditos' };
      if (spendResult?.error) throw { message: spendResult.error };

      const selectedVoiceProfile = voiceProfiles.find(v => v.id === selectedVoice);
      const voiceTag = selectedVoiceProfile ? `, ${selectedVoiceProfile.prompt_tag}` : '';

      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: {
          prompt: `${prompt.trim()}${voiceTag}`,
          duration,
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          lyrics: lyricsText || undefined,
          mode,
        }
      });

      if (error) {
        if (data?.error === 'rate_limit_exceeded') {
          toast({ title: 'Demasiadas generaciones', description: data.message, variant: 'destructive' });
          return;
        }
        if (data?.error === 'insufficient_credits') {
          throw { message: data.message || 'Créditos del proveedor insuficientes', details: data.details };
        }
        if (data?.error) throw { message: data.error, details: data.details };
        throw { message: error.message || 'Error al generar audio' };
      }

      if (data?.error) {
        if (data.error === 'insufficient_credits') {
          throw { message: data.message || 'Créditos del proveedor insuficientes', details: data.details };
        }
        throw { message: data.error, details: data.details };
      }

      if (data?.audio) {
        const audioUrl = `data:${data.format};base64,${data.audio}`;

        const { data: savedGen, error: saveError } = await supabase
          .from('ai_generations')
          .insert({
            user_id: user.id,
            prompt: prompt.trim(),
            duration: data.duration,
            genre: selectedGenre,
            mood: selectedMood,
            audio_url: audioUrl,
          })
          .select()
          .single();

        if (saveError) throw { message: saveError.message };

        const newResult: GenerationResult = {
          id: savedGen.id,
          audioUrl,
          prompt: prompt.trim(),
          duration: data.duration,
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          createdAt: new Date(savedGen.created_at),
          isFavorite: false
        };
        setResults(prev => [newResult, ...prev]);
        setLastResult(newResult);
        toast({ title: "¡Música generada!", description: `Tu ${mode === 'song' ? 'canción' : 'instrumental'} está lista` });
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationError({
        message: error.message || "No se pudo generar la música",
        details: error.details || "Intenta ajustar tu descripción o la duración."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Playback ──
  const togglePlay = (result: GenerationResult) => {
    const existingAudio = audioElements.get(result.id);
    if (playingId === result.id && existingAudio) {
      existingAudio.pause();
      setPlayingId(null);
    } else {
      audioElements.forEach(audio => audio.pause());
      let audio = existingAudio;
      if (!audio) {
        audio = new Audio(result.audioUrl);
        audio.onended = () => setPlayingId(null);
        setAudioElements(prev => new Map(prev).set(result.id, audio!));
      }
      audio.play();
      setPlayingId(result.id);
    }
  };

  const toggleFavorite = async (id: string) => {
    const result = results.find(r => r.id === id);
    if (!result) return;
    const newFavorite = !result.isFavorite;
    setResults(prev => prev.map(r => r.id === id ? { ...r, isFavorite: newFavorite } : r));
    const { error } = await supabase.from('ai_generations').update({ is_favorite: newFavorite }).eq('id', id);
    if (error) {
      setResults(prev => prev.map(r => r.id === id ? { ...r, isFavorite: !newFavorite } : r));
      toast({ title: "Error", description: "No se pudo actualizar favorito", variant: "destructive" });
    }
  };

  const deleteGeneration = async (id: string) => {
    if (playingId === id) { audioElements.get(id)?.pause(); setPlayingId(null); }
    setResults(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('ai_generations').delete().eq('id', id);
    if (error) { toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" }); loadHistory(); }
  };

  const downloadAudio = (result: GenerationResult) => {
    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `musicdibs-${mode}-${result.id.slice(0, 8)}.mp3`;
    link.click();
  };

  // ── Bulk helpers ──
  const toggleBulkMode = () => { setBulkMode(prev => !prev); setSelectedIds(new Set()); };
  const toggleSelected = (id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const selectAll = () => setSelectedIds(new Set(filteredResults.map(r => r.id)));
  const deselectAll = () => setSelectedIds(new Set());
  const bulkDownload = () => {
    const selected = results.filter(r => selectedIds.has(r.id));
    selected.forEach((r, i) => setTimeout(() => downloadAudio(r), i * 200));
    toast({ title: `Descargando ${selected.length} archivos` });
  };
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    ids.forEach(id => { if (playingId === id) { audioElements.get(id)?.pause(); setPlayingId(null); } });
    setResults(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set()); setBulkMode(false);
    const { error } = await supabase.from('ai_generations').delete().in('id', ids);
    if (error) { toast({ title: "Error", description: "No se pudieron eliminar algunas generaciones", variant: "destructive" }); loadHistory(); }
    else { toast({ title: `${ids.length} generaciones eliminadas` }); }
  };

  const registerAsWork = (result: GenerationResult) => {
    const descParts: string[] = [];
    if (result.genre) descParts.push(`Género: ${result.genre}`);
    if (result.mood) descParts.push(`Mood: ${result.mood}`);
    descParts.push(`Duración: ${result.duration}s`);
    descParts.push(`Descripción: ${result.prompt}`);
    navigate('/dashboard/register', {
      state: { prefill: { title: result.prompt.slice(0, 80), type: 'audio', description: descParts.join('\n'), audioUrl: result.audioUrl, generationId: result.id } }
    });
  };

  // ── Import lyrics from compositor ──
  const importLyricsFromCompositor = () => {
    if (!generatedLyrics) {
      toast({ title: "Sin letras", description: "Primero genera una letra en el Compositor de Letras", variant: "destructive" });
      return;
    }
    setLyricsText(generatedLyrics);
    setLyricsExpanded(true);
    toast({ title: "Letra importada", description: "Se ha copiado la última letra generada" });
  };

  // ── Regenerate with same params ──
  const handleRegenerate = () => {
    setLastResult(null);
    setGenerationError(null);
  };

  // ── Improve prompt with AI ──
  const handleImprovePrompt = async () => {
    if (!prompt.trim()) return;
    setIsImprovingPrompt(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: prompt.trim(),
          genre: selectedGenre || undefined,
          mood: selectedMood || undefined,
          mode,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.improved) {
        setPrompt(data.improved.slice(0, 400));
        toast({ title: "Prompt mejorado", description: "La descripción ha sido enriquecida con IA" });
      }
    } catch (e: any) {
      toast({ title: "Error al mejorar", description: e.message, variant: "destructive" });
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleImproveLyricsDesc = async () => {
    if (!lyricsDesc.trim()) return;
    setIsImprovingLyrics(true);
    setImprovedLyricsDesc(false);
    try {
      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: lyricsDesc,
          genre: lyricsGenre || '',
          mood: lyricsMood || '',
          mode: 'lyrics',
        },
      });
      if (error || !data?.improved) throw new Error(error?.message || 'No response');
      setLyricsDesc(data.improved.slice(0, 400));
      setImprovedLyricsDesc(true);
      toast({ title: '✨ Descripción mejorada', description: 'Puedes editarla antes de generar la letra' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo mejorar la descripción', variant: 'destructive' });
    } finally {
      setIsImprovingLyrics(false);
    }
  };

  // ── Lyrics composer functions ──
  const toggleArtistRef = (artist: string) => {
    setLyricsArtistRefs(prev => prev.includes(artist) ? prev.filter(a => a !== artist) : [...prev, artist]);
  };

  const handleGenerateLyrics = async (regenerateSec?: string) => {
    if (!lyricsDesc.trim() && !lyricsTheme) {
      toast({ title: "Describe tu canción", description: "Añade una descripción o elige un tema.", variant: "destructive" });
      return;
    }
    setIsGeneratingLyrics(true);
    setLyricsError(null);
    if (regenerateSec) setRegenSection(regenerateSec);
    try {
      const { data, error } = await supabase.functions.invoke("lyrics-generator", {
        body: {
          description: lyricsDesc, genre: lyricsGenre, mood: lyricsMood, style: lyricsStyle,
          language: lyricsLanguage, rhymeScheme: lyricsRhyme, structure: lyricsStructure,
          artistRefs: lyricsArtistRefs, pov: lyricsPov, theme: lyricsTheme,
          regenerateSection: regenerateSec || undefined,
          existingLyrics: regenerateSec ? generatedLyrics : undefined,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setGeneratedLyrics(data.lyrics);
      loadLyricsHistory();
      if (regenerateSec) {
        toast({ title: `Sección regenerada`, description: `[${regenerateSec}] actualizado.` });
      } else {
        toast({ title: "¡Letra generada!", description: "Revisa el resultado en el panel." });
      }
    } catch (err: any) {
      setLyricsError(err.message || "Error al generar la letra");
    }
    setIsGeneratingLyrics(false);
    setRegenSection("");
  };

  const copyLyrics = async () => {
    await navigator.clipboard.writeText(generatedLyrics);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  // ── "Crear canción con esta letra" from compositor ──
  const sendLyricsToMusic = () => {
    setLyricsText(generatedLyrics);
    setLyricsExpanded(true);
    if (lyricsGenre) setSelectedGenre(lyricsGenre);
    if (lyricsMood) setSelectedMood(lyricsMood);
    if (lyricsDesc) setPrompt(lyricsDesc.slice(0, 400));
    setMode('song');
    setActiveTab('music');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    toast({ title: "¡Letra cargada!", description: "Completa los detalles y genera tu canción." });
  };

  const lyricsSections = generatedLyrics
    ? [...generatedLyrics.matchAll(/\[([^\]]+)\]/g)].map(m => m[1])
    : [];

  // ── Lyrics history ──
  const loadLyricsHistory = async () => {
    if (!user) return;
    setLyricsLoading(true);
    const { data } = await supabase
      .from("lyrics_generations" as any)
      .select("id, lyrics, description, theme, genre, mood, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (data) setLyricsHistory(data as any);
    setLyricsLoading(false);
  };

  useEffect(() => {
    if (activeTab === "lyrics") loadLyricsHistory();
  }, [activeTab, user]);

  const downloadLyrics = (lyrics: string, title: string) => {
    const blob = new Blob([lyrics], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `letra-${(title || "musicdibs").replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyLyricsFromHistory = async (id: string, lyrics: string) => {
    await navigator.clipboard.writeText(lyrics);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver a AI MusicDibs Studio
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ═══ LEFT: Creation Panel ═══ */}
          <div className="space-y-6" ref={formRef}>
            <div>
              <h1 className="text-3xl font-bold mb-2">AI MusicDibs Studio</h1>
              <p className="text-muted-foreground">Crea música e inspírate con IA</p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "music" | "lyrics")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="music" className="gap-2">
                  <Music className="h-4 w-4" />
                  Crear Música
                </TabsTrigger>
                <TabsTrigger value="lyrics" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Compositor de Letras
                </TabsTrigger>
              </TabsList>

              {/* ═══ TAB: Crear Música ═══ */}
              <TabsContent value="music" className="space-y-6 mt-4">
                {/* Generation result or loading */}
                {isGenerating ? (
                  <Card className="border-primary/30">
                    <CardContent className="py-12 space-y-6">
                      <AudioWaveAnimation />
                      <div className="text-center space-y-2">
                        <p className="text-lg font-medium">Componiendo tu {mode === 'song' ? 'canción' : 'instrumental'}...</p>
                        <p className="text-sm text-muted-foreground">Esto puede tardar 1-2 minutos</p>
                      </div>
                      <Progress value={undefined} className="w-full animate-pulse" />
                    </CardContent>
                  </Card>
                ) : lastResult ? (
                  <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          ¡{modeLabel} generada!
                        </CardTitle>
                        <Badge variant={mode === 'song' ? 'default' : 'secondary'}>
                          {modeLabel}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Audio player */}
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-background border">
                        <Button
                          variant="outline"
                          size="icon"
                          className="shrink-0 w-14 h-14 rounded-full"
                          onClick={() => togglePlay(lastResult)}
                        >
                          {playingId === lastResult.id ? (
                            <Pause className="w-6 h-6" />
                          ) : (
                            <Play className="w-6 h-6 ml-0.5" />
                          )}
                        </Button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lastResult.prompt}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <Clock className="w-3 h-3" />
                            <span>{lastResult.duration}s</span>
                            {lastResult.genre && <Badge variant="secondary" className="text-[10px]">{lastResult.genre}</Badge>}
                            {lastResult.mood && <Badge variant="secondary" className="text-[10px]">{lastResult.mood}</Badge>}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-3 gap-2">
                        <Button variant="outline" onClick={() => downloadAudio(lastResult)} className="gap-2">
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                        <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                          <RotateCw className="h-4 w-4" />
                          Regenerar
                        </Button>
                        <Button variant="default" onClick={() => registerAsWork(lastResult)} className="gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          Registrar obra
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* ── Form ── */
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Crear música con IA</CardTitle>
                      <CardDescription>Describe tu canción y elige el estilo. Cuanto más detallado, mejor resultado.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Mode toggle */}
                      <div className="flex rounded-full bg-muted p-1">
                        <button
                          onClick={() => setMode('song')}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-medium transition-all",
                            mode === 'song'
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Mic className="h-4 w-4" />
                          Canción con voz
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{FEATURE_COSTS.generate_audio_song} créd.</Badge>
                        </button>
                        <button
                          onClick={() => { setMode('instrumental'); setSelectedVoice(''); }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-sm font-medium transition-all",
                            mode === 'instrumental'
                              ? "bg-background shadow-sm text-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Headphones className="h-4 w-4" />
                          Instrumental / Base
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{FEATURE_COSTS.generate_audio} créd.</Badge>
                        </button>
                      </div>

                      {/* Main textarea */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label>Describe tu canción</Label>
                          <button
                            type="button"
                            onClick={handleImprovePrompt}
                            disabled={isImprovingPrompt || !prompt.trim()}
                            title="Optimiza tu descripción para obtener mejores resultados"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              fontSize: '14px',
                              fontWeight: 600,
                              color: '#4b5563',
                              background: 'transparent',
                              border: '1px solid transparent',
                              borderRadius: '8px',
                              padding: '6px 14px',
                              cursor: 'pointer',
                              opacity: (isImprovingPrompt || !prompt.trim()) ? 0.4 : 1,
                              transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsl(var(--primary) / 0.08)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
                          >
                            {isImprovingPrompt
                              ? <><Loader2 style={{ width: 16, height: 16, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />Mejorando...</>
                              : <><Sparkles style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />Mejorar con IA</>
                            }
                          </button>
                        </div>
                        <Textarea
                          placeholder="Una canción de pop romántico sobre el primer amor..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value.slice(0, 400))}
                          rows={4}
                          className="resize-none"
                          maxLength={400}
                        />
                        <p className="text-xs text-muted-foreground text-right">{prompt.length}/400</p>
                      </div>

                      {/* Collapsible lyrics section */}
                      <Collapsible open={lyricsExpanded} onOpenChange={setLyricsExpanded}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" className="w-full justify-between px-3 h-10 text-sm text-muted-foreground hover:text-foreground">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Letra (opcional)
                            </span>
                            <ChevronDown className={cn("h-4 w-4 transition-transform", lyricsExpanded && "rotate-180")} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 pt-2">
                          <Textarea
                            placeholder="Pega o escribe la letra de tu canción aquí..."
                            value={lyricsText}
                            onChange={(e) => setLyricsText(e.target.value)}
                            rows={8}
                            className="resize-none font-mono text-sm"
                          />
                          <p className="text-xs text-muted-foreground">
                            Puedes usar la letra generada por el Compositor de Letras
                          </p>
                          <Button variant="outline" size="sm" onClick={importLyricsFromCompositor} className="gap-2">
                            <Import className="h-3.5 w-3.5" />
                            Importar desde Compositor
                          </Button>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Genre chips */}
                      <div className="space-y-2">
                        <Label>Género</Label>
                        <div className="flex flex-wrap gap-2">
                          {MUSIC_GENRES.map(genre => (
                            <Badge
                              key={genre}
                              variant={selectedGenre === genre ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/80 transition-colors"
                              onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                            >
                              {genre}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Mood chips */}
                      <div className="space-y-2">
                        <Label>Mood</Label>
                        <div className="flex flex-wrap gap-2">
                          {MUSIC_MOODS.map(m => (
                            <Badge
                              key={m}
                              variant={selectedMood === m ? "default" : "outline"}
                              className="cursor-pointer hover:bg-primary/80 transition-colors"
                              onClick={() => setSelectedMood(selectedMood === m ? null : m)}
                            >
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Voice type selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de voz</Label>
                        <p className="text-xs text-muted-foreground">Solo disponible en modo "Canción con voz"</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {voiceProfiles.map((v) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => setSelectedVoice(selectedVoice === v.id ? '' : v.id)}
                              disabled={mode === 'instrumental'}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'flex-start',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: selectedVoice === v.id
                                  ? '2px solid hsl(var(--primary))'
                                  : '1px solid hsl(var(--border))',
                                background: selectedVoice === v.id
                                  ? 'hsl(var(--primary) / 0.08)'
                                  : 'transparent',
                                cursor: mode === 'instrumental' ? 'not-allowed' : 'pointer',
                                opacity: mode === 'instrumental' ? 0.4 : 1,
                                transition: 'all 0.15s',
                                textAlign: 'left',
                                width: '100%',
                              }}
                              title={v.description}
                            >
                              <span style={{ fontSize: '16px', marginBottom: '2px' }}>{v.emoji}</span>
                              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--foreground)' }}>{v.label}</span>
                            </button>
                          ))}
                        </div>
                        {selectedVoice && (
                          <p className="text-xs text-muted-foreground">
                            {voiceProfiles.find(v => v.id === selectedVoice)?.description}
                          </p>
                        )}
                      </div>

                      {/* Duration options */}
                      <div className="space-y-2">
                        <Label>Duración</Label>
                        <div className="flex gap-2">
                          {DURATION_OPTIONS.map(d => (
                            <button
                              key={d}
                              onClick={() => setDuration(d)}
                              className={cn(
                                "flex-1 py-2 rounded-lg text-sm font-medium border transition-all",
                                duration === d
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
                              )}
                            >
                              {d}s
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Error */}
                      {generationError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error al generar</AlertTitle>
                          <AlertDescription className="mt-2 space-y-2">
                            <p>{generationError.message}</p>
                            {generationError.details && <p className="text-xs opacity-80">{generationError.details}</p>}
                            <Button variant="outline" size="sm" onClick={() => setGenerationError(null)} className="mt-2 gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Intentar de nuevo
                            </Button>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* CTA */}
                      {!hasEnough(currentCost) ? (
                        <NoCreditsAlert message={`Necesitas ${currentCost} créditos para generar ${mode === 'song' ? 'una canción' : 'un instrumental'}.`} />
                      ) : (
                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt.trim()}
                          className="w-full"
                          size="lg"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          {mode === 'song'
                            ? `Generar canción — ${FEATURE_COSTS.generate_audio_song} créditos`
                            : `Generar instrumental — ${FEATURE_COSTS.generate_audio} créditos`
                          }
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* ═══ TAB: Compositor de Letras (UNCHANGED) ═══ */}
              <TabsContent value="lyrics" className="space-y-6 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Describe tu canción
                    </CardTitle>
                    <CardDescription>Cuanto más detallado seas, mejor será el resultado</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">¿De qué va tu canción?</Label>
                        <button
                          type="button"
                          onClick={handleImproveLyricsDesc}
                          disabled={isImprovingLyrics || !lyricsDesc.trim()}
                          title="Optimiza tu descripción para obtener mejores resultados"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#4b5563',
                            background: 'transparent',
                            border: '1px solid transparent',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            opacity: (isImprovingLyrics || !lyricsDesc.trim()) ? 0.4 : 1,
                            transition: 'border-color 0.15s, color 0.15s, background 0.15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = 'hsl(var(--primary))'; e.currentTarget.style.color = 'hsl(var(--primary))'; e.currentTarget.style.background = 'hsl(var(--primary) / 0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = '#4b5563'; e.currentTarget.style.background = 'transparent'; }}
                        >
                          {isImprovingLyrics
                            ? <><Loader2 style={{ width: 16, height: 16, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />Mejorando...</>
                            : <><Sparkles style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />Mejorar con IA</>
                          }
                        </button>
                      </div>
                      <Textarea value={lyricsDesc} onChange={e => setLyricsDesc(e.target.value)} rows={3} className="resize-none" maxLength={400} placeholder="Describe la historia, el sentimiento, la situación..." />
                      {improvedLyricsDesc && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✨ Descripción optimizada por IA — puedes editarla antes de generar
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground text-right">{lyricsDesc.length}/400</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Tema central</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {THEMES.map(t => (
                          <Badge key={t} variant={lyricsTheme === t ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsTheme(lyricsTheme === t ? "" : t)}>{t}</Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Género musical</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {(GENRES as readonly string[]).slice(0, 8).map(g => (
                            <Badge key={g} variant={lyricsGenre === g ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsGenre(lyricsGenre === g ? "" : g)}>{g}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Mood / Tono</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {(MOODS as readonly string[]).slice(0, 8).map(m => (
                            <Badge key={m} variant={lyricsMood === m ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsMood(lyricsMood === m ? "" : m)}>{m}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">
                        Estilo de artistas de referencia
                        <span className="text-muted-foreground ml-1 font-normal">(También puedes escribir uno propio en el campo de texto)</span>
                      </Label>
                      <div className="flex flex-wrap gap-1.5">
                        {ARTIST_REFS.map(a => (
                          <Badge key={a} variant={lyricsArtistRefs.includes(a) ? "default" : "outline"}
                            className={cn("cursor-pointer text-xs transition-colors", lyricsArtistRefs.length >= 3 && !lyricsArtistRefs.includes(a) && "opacity-40 cursor-not-allowed")}
                            onClick={() => { if (lyricsArtistRefs.length >= 3 && !lyricsArtistRefs.includes(a)) return; toggleArtistRef(a); }}>
                            {a}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Estructura</Label>
                        <Select value={lyricsStructure} onValueChange={setLyricsStructure}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STRUCTURES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Esquema de rima</Label>
                        <Select value={lyricsRhyme} onValueChange={setLyricsRhyme}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RHYME_SCHEMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Idioma</Label>
                        <Select value={lyricsLanguage} onValueChange={setLyricsLanguage}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LYRIC_LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Punto de vista</Label>
                        <Select value={lyricsPov} onValueChange={setLyricsPov}>
                          <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {POVS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-sm">Estilo de escritura</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {LYRIC_STYLES.map(s => (
                          <Badge key={s} variant={lyricsStyle === s ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsStyle(lyricsStyle === s ? "" : s)}>{s}</Badge>
                        ))}
                      </div>
                    </div>

                    {lyricsError && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />{lyricsError}
                      </p>
                    )}

                    <Button onClick={() => handleGenerateLyrics()} disabled={isGeneratingLyrics || (!lyricsDesc.trim() && !lyricsTheme)} className="w-full" size="lg">
                      {isGeneratingLyrics
                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Componiendo letra...</>
                        : <><FileText className="w-4 h-4 mr-2" />Generar letra (gratis)</>
                      }
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">La generación de letras no consume créditos</p>
                  </CardContent>
                </Card>

                {/* ── Generated lyrics result ── */}
                {generatedLyrics && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Music2 className="h-4 w-4 text-primary" />
                          Tu letra
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" onClick={copyLyrics} className="h-8 text-xs gap-1.5">
                            {copiedLyrics ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />Copiado</> : <><Copy className="h-3.5 w-3.5" />Copiar</>}
                          </Button>
                          <Button variant="default" size="sm" onClick={sendLyricsToMusic} className="h-8 text-xs gap-1.5">
                            <Music className="h-3.5 w-3.5" />
                            🎵 Crear canción con esta letra
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-xl bg-muted/40 p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                        {generatedLyrics}
                      </div>

                      {lyricsSections.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Regenerar una sección específica:</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {lyricsSections.map(section => (
                              <Button key={section} variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isGeneratingLyrics} onClick={() => handleGenerateLyrics(section)}>
                                {isGeneratingLyrics && regenSection === section ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                {section}
                              </Button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">Solo regenera esa sección manteniendo el resto intacto</p>
                        </div>
                      )}

                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1.5" onClick={() => handleGenerateLyrics()} disabled={isGeneratingLyrics}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        Regenerar letra completa
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* ═══ RIGHT: Results Panel ═══ */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {activeTab === "lyrics" ? "Mis letras" : "Resultados"}
              </h2>
              {activeTab === "lyrics" && lyricsHistory.length > 0 ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Últimas {lyricsHistory.length}
                </span>
              ) : activeTab === "music" && (
                <div className="flex items-center gap-2">
                  {results.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {filteredResults.length}{filteredResults.length !== results.length ? ` / ${results.length}` : ''} generaciones
                      </span>
                      <Button variant={bulkMode ? "default" : "outline"} size="sm" className="h-8" onClick={toggleBulkMode}>
                        <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                        {bulkMode ? "Cancelar" : "Seleccionar"}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {activeTab === "lyrics" ? (
              lyricsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />Cargando...
                </div>
              ) : lyricsHistory.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm text-center">Tus letras generadas aparecerán aquí</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {lyricsHistory.map((item) => (
                    <Card key={item.id} className="border-border/40">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.theme || item.description || "Sin título"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {item.genre && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{item.genre}</Badge>}
                              {item.mood && <Badge variant="outline" className="text-[10px] h-4 px-1.5">{item.mood}</Badge>}
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(item.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyLyricsFromHistory(item.id, item.lyrics)} title="Copiar letra">
                              {copiedId === item.id ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadLyrics(item.lyrics, item.theme || item.description || "letra")} title="Descargar .txt">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                          {item.lyrics}
                        </div>
                        <details className="group">
                          <summary className="text-xs text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                            Ver letra completa
                          </summary>
                          <div className="mt-2 rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                            {item.lyrics}
                          </div>
                        </details>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : (
              <>
                {/* Bulk Actions Bar */}
                {bulkMode && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={selectedIds.size === filteredResults.length ? deselectAll : selectAll}>
                      {selectedIds.size === filteredResults.length ? "Deseleccionar todo" : "Seleccionar todo"}
                    </Button>
                    <span className="text-xs text-muted-foreground flex-1">{selectedIds.size} seleccionado{selectedIds.size !== 1 ? 's' : ''}</span>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7" disabled={selectedIds.size === 0} onClick={bulkDownload}>
                            <Download className="w-3.5 h-3.5 mr-1" />Descargar
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Descargar seleccionados</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-7" disabled={selectedIds.size === 0}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" />Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar {selectedIds.size} generación{selectedIds.size !== 1 ? 'es' : ''}?</AlertDialogTitle>
                                <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar {selectedIds.size}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent><p>Eliminar seleccionados</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Filters */}
                {results.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant={filterFavorites ? "default" : "outline"} size="sm" onClick={() => setFilterFavorites(!filterFavorites)} className="h-8">
                      <Heart className={cn("w-3.5 h-3.5 mr-1.5", filterFavorites && "fill-current")} />Favoritos
                    </Button>
                    <Select value={filterGenre} onValueChange={setFilterGenre}>
                      <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Género" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los géneros</SelectItem>
                        {availableGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-sm", filterDateFrom && "border-primary text-primary")}>
                          <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                          {filterDateFrom ? format(filterDateFrom, "dd MMM", { locale: es }) : "Desde"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} disabled={(date) => date > new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-sm", filterDateTo && "border-primary text-primary")}>
                          <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                          {filterDateTo ? format(filterDateTo, "dd MMM", { locale: es }) : "Hasta"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} disabled={(date) => date > new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
                        <X className="w-3 h-3 mr-1" />Limpiar
                      </Button>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground text-center">Cargando historial...</p>
                    </CardContent>
                  </Card>
                ) : results.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Music className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        {user ? "Tus generaciones aparecerán aquí" : "Inicia sesión para guardar tu historial"}
                      </p>
                    </CardContent>
                  </Card>
                ) : filteredResults.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Filter className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-center text-sm">Sin resultados para estos filtros</p>
                      <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">Limpiar filtros</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {filteredResults.map(result => (
                      <Card key={result.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            {bulkMode && (
                              <Checkbox checked={selectedIds.has(result.id)} onCheckedChange={() => toggleSelected(result.id)} className="mt-3 shrink-0" />
                            )}
                            <Button variant="outline" size="icon" className="shrink-0 w-12 h-12 rounded-full" onClick={() => togglePlay(result)}>
                              {playingId === result.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </Button>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate mb-1">{result.prompt}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                <span>{result.duration}s</span>
                                {result.genre && <Badge variant="secondary" className="text-xs">{result.genre}</Badge>}
                                {result.mood && <Badge variant="secondary" className="text-xs">{result.mood}</Badge>}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => registerAsWork(result)} className="text-primary hover:text-primary">
                                      <ShieldCheck className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Registrar como obra protegida</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => toggleFavorite(result.id)}>
                                      <Heart className={`w-4 h-4 ${result.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{result.isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => downloadAudio(result)}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Descargar audio</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar esta generación?</AlertDialogTitle>
                                          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => deleteGeneration(result.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Eliminar generación</p></TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudioCreate;
