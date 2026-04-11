import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { Slider } from "@/components/ui/slider";
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
  Mic, Headphones, RotateCw, Sparkles, HelpCircle, User, Save, Info
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Navbar } from "@/components/Navbar";

import { GENRES, MOODS, type GenerationResult } from "@/types/aiStudio";
import { useCredits } from "@/hooks/useCredits";
import { NoCreditsAlert } from "@/components/dashboard/NoCreditsAlert";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { PricingLink } from "@/components/dashboard/PricingPopup";
import { MusicCreatorTour } from "@/components/ai-studio/MusicCreatorTour";
import { useProductTracking } from "@/hooks/useProductTracking";

// ── Music tab constants ──
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
// Artist presets removed — users can type freely in description
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { credits, hasEnough } = useCredits();
  const formRef = useRef<HTMLDivElement>(null);
  const { track } = useProductTracking();

  // ── Music tab state ──
  const [mode, setMode] = useState<'song' | 'instrumental'>('song');
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(60);
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
  const [audioProgress, setAudioProgress] = useState<Map<string, { current: number; duration: number }>>(new Map());
  const progressIntervalRef = useRef<number | null>(null);

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
  const [_lyricsTheme] = useState(""); // kept for type compat
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [lyricsError, setLyricsError] = useState<string | null>(null);
  const [regenSection, setRegenSection] = useState("");
  const [copiedLyrics, setCopiedLyrics] = useState(false);

  // ── Lyrics history state ──
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"music" | "lyrics">(() => searchParams.get('tab') === 'lyrics' ? 'lyrics' : 'music');
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
  const [playingVoice, setPlayingVoice] = useState<string>('');
  const [audioRef] = useState<Record<string, HTMLAudioElement>>({});

  // ── Virtual Artists state ──
  const [voiceTab, setVoiceTab] = useState<'preset' | 'my_artists'>('preset');
  const [virtualArtists, setVirtualArtists] = useState<any[]>([]);
  const [virtualArtistsCount, setVirtualArtistsCount] = useState(0);
  const [selectedArtistId, setSelectedArtistId] = useState<string>('');

  // ── Save as Virtual Artist modal state ──
  const [showSaveArtistPrompt, setShowSaveArtistPrompt] = useState(false);
  const [showSaveArtistForm, setShowSaveArtistForm] = useState(false);
  const [saveArtistName, setSaveArtistName] = useState('');
  const [saveArtistStyle, setSaveArtistStyle] = useState('');
  const [isSavingArtist, setIsSavingArtist] = useState(false);
  const [lastGeneratedVoiceId, setLastGeneratedVoiceId] = useState<string>('');
  const [lastGeneratedVoiceName, setLastGeneratedVoiceName] = useState<string>('');



  // ── Derived values ──
  const selectedGenre: string | null = null;
  const selectedMood: string | null = null;
  const currentCost = mode === 'song' ? FEATURE_COSTS.generate_audio_song : FEATURE_COSTS.generate_audio;
  const currentFeature = mode === 'song' ? 'generate_audio_song' : 'generate_audio';
  const modeLabel = mode === 'song' ? t('aiCreate.songWithVoice') : t('aiCreate.instrumentalBase');

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
      .then(({ data }) => {
        setVoiceProfiles(data || []);
        if (data && data.length > 0 && !selectedVoice) {
          setSelectedVoice(data[0].id);
        }
      });

    // Load virtual artists
    if (user) {
      supabase.from('user_artist_profiles')
        .select('*, voice_profiles(label, emoji, sample_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) {
            setVirtualArtists(data);
            setVirtualArtistsCount(data.length);
          }
        });
    }

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
    if (!prompt.trim() || prompt.trim().length < 10) {
      toast({ title: t('aiShared.error'), description: 'Escribe al menos 10 caracteres describiendo tu canción', variant: "destructive" });
      return;
    }
    if (!selectedVoice) {
      toast({ title: t('aiShared.error'), description: 'Selecciona una voz para tu canción', variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: t('aiShared.error'), description: t('aiCreate.errorLogin'), variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setLastResult(null);
    track('generation_started', { feature: 'create_music', metadata: { mode } });

    try {
      // Spend credits
      const { data: spendResult, error: spendError } = await supabase.functions.invoke('spend-credits', {
        body: { feature: currentFeature, description: `${mode === 'song' ? 'Canción' : 'Instrumental'}: ${prompt.slice(0, 80)}` },
      });
      if (spendError) throw { message: spendError.message || 'Error al descontar créditos' };
      if (spendResult?.error) throw { message: spendResult.error };

      // Enrich prompt with voice tag (only for song mode)
      let enrichedPrompt = prompt.trim();
      if (mode === 'song') {
        const selectedVoiceProfile = voiceProfiles.find(v => v.id === selectedVoice);
        const voiceTag = selectedVoiceProfile ? `, ${selectedVoiceProfile.prompt_tag}` : '';
        enrichedPrompt = `${enrichedPrompt}${voiceTag}`;
      }

      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: {
          prompt: enrichedPrompt,
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
          createdAt: new Date(savedGen.created_at),
          isFavorite: false
        };
        setResults(prev => [newResult, ...prev]);
        setLastResult(newResult);
        toast({ title: t('aiCreate.musicGenerated'), description: t('aiCreate.songReady') });
        track('generation_completed', { feature: 'create_music' });
        sessionStorage.setItem('md_last_generation', Date.now().toString());

        // Show save as virtual artist prompt
        if (selectedVoice && !selectedArtistId) {
          const vp = voiceProfiles.find(v => v.id === selectedVoice);
          setLastGeneratedVoiceId(selectedVoice);
          setLastGeneratedVoiceName(vp?.label || '');
          setShowSaveArtistPrompt(true);
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationError({
        message: error.message || "No se pudo generar la música",
        details: error.details || "Intenta ajustar tu descripción o la duración."
      });
      track('generation_failed', { feature: 'create_music', metadata: { error: error.message } });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Playback ──
  const startProgressTracking = (id: string, audio: HTMLAudioElement) => {
    if (progressIntervalRef.current) cancelAnimationFrame(progressIntervalRef.current);
    const tick = () => {
      setAudioProgress(prev => {
        const next = new Map(prev);
        next.set(id, { current: audio.currentTime, duration: audio.duration || 0 });
        return next;
      });
      if (!audio.paused) progressIntervalRef.current = requestAnimationFrame(tick);
    };
    tick();
  };

  const seekAudio = (id: string, value: number[]) => {
    const audio = audioElements.get(id);
    if (audio) {
      audio.currentTime = value[0];
      setAudioProgress(prev => {
        const next = new Map(prev);
        next.set(id, { current: value[0], duration: audio.duration || 0 });
        return next;
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = (result: GenerationResult) => {
    const existingAudio = audioElements.get(result.id);
    if (playingId === result.id && existingAudio) {
      existingAudio.pause();
      if (progressIntervalRef.current) cancelAnimationFrame(progressIntervalRef.current);
      setPlayingId(null);
    } else {
      audioElements.forEach(audio => audio.pause());
      if (progressIntervalRef.current) cancelAnimationFrame(progressIntervalRef.current);
      let audio = existingAudio;
      if (!audio) {
        audio = new Audio(result.audioUrl);
        audio.onended = () => { setPlayingId(null); if (progressIntervalRef.current) cancelAnimationFrame(progressIntervalRef.current); };
        setAudioElements(prev => new Map(prev).set(result.id, audio!));
      }
      audio.play();
      setPlayingId(result.id);
      startProgressTracking(result.id, audio);
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
      toast({ title: t('aiShared.error'), description: t('aiShared.error'), variant: "destructive" });
    }
  };

  const deleteGeneration = async (id: string) => {
    if (playingId === id) { audioElements.get(id)?.pause(); setPlayingId(null); }
    setResults(prev => prev.filter(r => r.id !== id));
    const { error } = await supabase.from('ai_generations').delete().eq('id', id);
    if (error) { toast({ title: t('aiShared.error'), variant: "destructive" }); loadHistory(); }
  };

  const downloadAudio = (result: GenerationResult) => {
    const link = document.createElement('a');
    link.href = result.audioUrl;
    link.download = `musicdibs-${mode}-${result.id.slice(0, 8)}.mp3`;
    link.click();
    track('audio_downloaded', { feature: 'create_music' });
  };

  // ── Save as Virtual Artist ──
  const handleSaveVirtualArtist = async () => {
    if (!saveArtistName.trim() || !lastGeneratedVoiceId || !user) return;
    setIsSavingArtist(true);
    try {
      const { data: newArtist, error } = await supabase
        .from('user_artist_profiles')
        .insert({
          user_id: user.id,
          name: saveArtistName.trim(),
          voice_profile_id: lastGeneratedVoiceId,
          voice_type: 'preset',
          genre: null,
          mood: null,
          default_duration: duration,
          style_notes: saveArtistStyle.trim() || null,
          is_default: false,
        })
        .select('*, voice_profiles(label, emoji, sample_url)')
        .single();
      if (error) throw error;
      setVirtualArtists(prev => [newArtist, ...prev]);
      setVirtualArtistsCount(prev => prev + 1);
      toast({ title: `Artista "${saveArtistName.trim()}" guardado` });
      setShowSaveArtistForm(false);
      setShowSaveArtistPrompt(false);
      setSaveArtistName('');
      setSaveArtistStyle('');
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsSavingArtist(false);
    }
  };

  // ── Select virtual artist ──
  const handleSelectArtist = (artist: any) => {
    if (selectedArtistId === artist.id) {
      setSelectedArtistId('');
      setSelectedVoice('');
      return;
    }
    setSelectedArtistId(artist.id);
    setSelectedVoice(artist.voice_profile_id || '');
    if (artist.default_duration) setDuration(artist.default_duration);
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
    if (error) { toast({ title: t('aiShared.error'), variant: "destructive" }); loadHistory(); }
    else { toast({ title: `${ids.length} ${t('aiCreate.generations')}` }); }
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




  // ── Regenerate with same params ──
  const handleRegenerate = () => {
    setLastResult(null);
    setGenerationError(null);
  };

  // ── Preview voice sample ──
  const handlePreviewVoice = (e: React.MouseEvent, voiceId: string, sampleUrl: string) => {
    e.stopPropagation();
    if (!sampleUrl) return;

    if (audioRef[playingVoice]) {
      audioRef[playingVoice].pause();
      audioRef[playingVoice].currentTime = 0;
    }

    if (playingVoice === voiceId) {
      setPlayingVoice('');
      return;
    }

    const audio = new Audio(sampleUrl);
    audioRef[voiceId] = audio;
    audio.play();
    setPlayingVoice(voiceId);
    audio.onended = () => setPlayingVoice('');
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
        setPrompt(data.improved.slice(0, 1000));
        toast({ title: t('aiCreate.promptImproved'), description: t('aiCreate.promptImprovedDesc') });
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
          mode: 'lyrics',
        },
      });
      if (error || !data?.improved) throw new Error(error?.message || 'No response');
      setLyricsDesc(data.improved.slice(0, 1000));
      setImprovedLyricsDesc(true);
      toast({ title: t('aiCreate.lyricsDescImproved'), description: t('aiCreate.lyricsDescImprovedSub') });
    } catch {
      toast({ title: t('aiShared.error'), variant: 'destructive' });
    } finally {
      setIsImprovingLyrics(false);
    }
  };

  // ── Lyrics composer functions ──
  const toggleArtistRef = (artist: string) => {
    setLyricsArtistRefs(prev => prev.includes(artist) ? prev.filter(a => a !== artist) : [...prev, artist]);
  };

  const handleGenerateLyrics = async (regenerateSec?: string) => {
    if (!lyricsDesc.trim()) {
      toast({ title: t('aiCreate.describeSongOrTheme'), variant: "destructive" });
      return;
    }
    setIsGeneratingLyrics(true);
    setLyricsError(null);
    if (regenerateSec) setRegenSection(regenerateSec);
    try {
      const { data, error } = await supabase.functions.invoke("lyrics-generator", {
        body: {
          description: lyricsDesc, genre: lyricsGenre, style: lyricsStyle,
          rhymeScheme: lyricsRhyme, structure: lyricsStructure,
          artistRefs: lyricsArtistRefs, pov: lyricsPov,
          regenerateSection: regenerateSec || undefined,
          existingLyrics: regenerateSec ? generatedLyrics : undefined,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setGeneratedLyrics(data.lyrics);
      loadLyricsHistory();
      if (regenerateSec) {
        toast({ title: t('aiCreate.sectionRegenerated'), description: `[${regenerateSec}]` });
      } else {
        toast({ title: t('aiCreate.lyricsGenerated'), description: t('aiCreate.lyricsGeneratedDesc') });
        track('lyrics_generated', { feature: 'lyrics', metadata: { genre: lyricsGenre, mood: lyricsMood, language: lyricsLanguage } });
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
    if (lyricsDesc) setPrompt(lyricsDesc.slice(0, 1000));
    setMode('song');
    setActiveTab('music');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    toast({ title: t('aiCreate.lyricsLoaded'), description: t('aiCreate.lyricsLoadedDesc') });
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
          {t('aiCreate.backToStudio')}
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* ═══ LEFT: Creation Panel ═══ */}
          <div className="space-y-6" ref={formRef}>
            <MusicCreatorTour />
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{t('aiCreate.title')}</h1>
                <p className="text-muted-foreground">{t('aiCreate.subtitle')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground gap-1.5"
                onClick={() => {
                  if (user) localStorage.removeItem(`musicdibs_music_creator_tour_seen_${user.id}`);
                  window.dispatchEvent(new Event('musicdibs:start-music-tour'));
                }}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {t('aiCreate.tour.showAgain', 'Ver tutorial')}
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "music" | "lyrics")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="music" className="gap-2">
                  <Music className="h-4 w-4" />
                  {t('aiCreate.tabMusic')}
                </TabsTrigger>
                <TabsTrigger value="lyrics" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {t('aiCreate.tabLyrics')}
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
                        <p className="text-lg font-medium">{t('aiCreate.composing')} {mode === 'song' ? t('aiCreate.song') : t('aiCreate.instrumental')}...</p>
                        <p className="text-sm text-muted-foreground">{t('aiCreate.waitMsg')}</p>
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
                          {modeLabel} {t('aiCreate.generated')}
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
                          {t('aiCreate.download')}
                        </Button>
                        <Button variant="outline" onClick={handleRegenerate} className="gap-2">
                          <RotateCw className="h-4 w-4" />
                          {t('aiCreate.regenerate')}
                        </Button>
                        <Button variant="default" onClick={() => registerAsWork(lastResult)} className="gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          {t('aiCreate.registerWork')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  /* ── Form ── */
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">{t('aiCreate.createWithAI')}</CardTitle>
                      <CardDescription>{t('aiCreate.createDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                      {/* Main textarea — description + lyrics combined */}
                      <div className="space-y-1.5" data-tour="mc-description">
                        <div className="flex items-center justify-between">
                          <Label>Describe tu canción y/o pega tu letra *</Label>
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
                              ? <><Loader2 style={{ width: 16, height: 16, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />{t('aiCreate.improving')}</>
                              : <><Sparkles style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />{t('aiCreate.improveWithAI')}</>
                            }
                          </button>
                        </div>
                        <Textarea
                          placeholder="Ej: Una canción pop alegre en español sobre amor de verano, con un ritmo enérgico y romántico. Incluye la letra si la tienes..."
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
                          rows={5}
                          className="resize-none"
                          maxLength={2000}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">Incluye: género, mood, idioma, tema, ritmo, tipo de voz, letra...</p>
                          <p className="text-xs text-muted-foreground">{prompt.length}/2000</p>
                        </div>
                      </div>

                      {/* Mode selector: Canción con voz / Instrumental */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Tipo de generación</Label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setMode('song')}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-2",
                              mode === 'song'
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <Mic className="h-4 w-4" />
                            🎤 Canción con voz
                          </button>
                          <button
                            type="button"
                            onClick={() => { setMode('instrumental'); setSelectedVoice(''); setSelectedArtistId(''); }}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border-2 transition-all flex items-center justify-center gap-2",
                              mode === 'instrumental'
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            <Headphones className="h-4 w-4" />
                            🎹 Instrumental / Base
                          </button>
                        </div>
                      </div>

                      <div data-tour="mc-settings">
                      {/* Voice selector — only for song mode */}
                      {mode === 'song' && (
                      <div className="space-y-3">
                         <Label className="text-sm font-medium">Elige una voz *</Label>
                        {/* Tabs: Voces IA / Mis artistas virtuales */}
                        <TooltipProvider delayDuration={200}>
                        <div className="flex gap-2 mb-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { setVoiceTab('preset'); setSelectedArtistId(''); }}
                              className={cn(
                                "px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all",
                                voiceTab === 'preset'
                                  ? "border-primary bg-primary/10 text-primary border-2"
                                  : "border-border text-muted-foreground hover:border-primary/50"
                              )}
                            >
                              🎧 Voces IA
                            </button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-sm">
                                Elige una voz para tu canción. Después podrás guardarla como artista para reutilizarla.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => { if (virtualArtistsCount > 0) setVoiceTab('my_artists'); }}
                              disabled={virtualArtistsCount === 0}
                              className={cn(
                                "px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all",
                                voiceTab === 'my_artists'
                                  ? "border-primary bg-primary/10 text-primary border-2"
                                  : virtualArtistsCount === 0
                                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                                    : "border-border text-muted-foreground hover:border-primary/50"
                              )}
                            >
                              👤 Mis artistas virtuales {virtualArtistsCount > 0 && `(${virtualArtistsCount})`}
                            </button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-sm">
                                {virtualArtistsCount > 0
                                  ? "Los artistas virtuales son las voces que has guardado de otras canciones para crear nuevas con el mismo estilo."
                                  : "Aquí aparecen tus artistas guardados. Úsalos para crear canciones con el mismo estilo."}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        </TooltipProvider>

                        {/* TAB: Voces IA del catálogo */}
                        {voiceTab === 'preset' && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {voiceProfiles.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => { setSelectedVoice(v.id); setSelectedArtistId(''); }}
                                className={cn(
                                  "flex flex-col items-start p-2 px-3 rounded-lg border text-left w-full transition-all",
                                  selectedVoice === v.id && !selectedArtistId
                                    ? "border-2 border-primary bg-primary/5"
                                    : "border-border hover:border-primary/30"
                                )}
                                title={v.description}
                              >
                                <span className="text-base mb-0.5">{v.emoji}</span>
                                <span className="text-xs font-medium text-foreground">{v.label}</span>
                                {v.sample_url && (
                                  <span
                                    onClick={(e) => handlePreviewVoice(e, v.id, v.sample_url)}
                                    className={cn("inline-flex items-center gap-1 mt-1 text-[11px] cursor-pointer", playingVoice === v.id ? "text-primary" : "text-muted-foreground")}
                                  >
                                    {playingVoice === v.id ? '⏹ Detener' : '▶ Escuchar'}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* TAB: Mis artistas virtuales */}
                        {voiceTab === 'my_artists' && (
                          <div className="space-y-2">
                            {virtualArtistsCount === 0 ? (
                              <div className="text-center py-6 border border-dashed border-border rounded-lg">
                                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Aún no tienes artistas guardados</p>
                                <p className="text-xs text-muted-foreground mt-1">Aquí aparecen tus artistas guardados. Úsalos para crear canciones con el mismo estilo.</p>
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {virtualArtists.map((artist) => (
                                  <button
                                    key={artist.id}
                                    type="button"
                                    onClick={() => handleSelectArtist(artist)}
                                    className={cn(
                                      "flex flex-col items-start p-2 px-3 rounded-lg border text-left w-full transition-all",
                                      selectedArtistId === artist.id
                                        ? "border-2 border-primary bg-primary/5"
                                        : "border-border hover:border-primary/30"
                                    )}
                                  >
                                    <span className="text-base mb-0.5">{artist.voice_profiles?.emoji || '👤'}</span>
                                    <span className="text-xs font-medium text-foreground">{artist.name}</span>
                                    {artist.style_notes && (
                                      <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{artist.style_notes}</span>
                                    )}
                                    {artist.voice_profiles?.label && (
                                      <Badge variant="outline" className="text-[9px] h-4 mt-1">{artist.voice_profiles.label}</Badge>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Micro-copy */}
                        {voiceTab === 'my_artists' && virtualArtistsCount === 0 && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-2">
                            💡 Los artistas virtuales son voces que has guardado de otras canciones para crear nuevas con el mismo estilo
                          </p>
                        )}

                        {selectedVoice && !selectedArtistId && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {voiceProfiles.find(v => v.id === selectedVoice)?.description}
                          </p>
                        )}
                      </div>
                      )}
                      </div>{/* close data-tour="mc-settings" */}


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
                        <>
                        <Button
                          onClick={handleGenerate}
                          disabled={isGenerating || !prompt.trim() || prompt.trim().length < 10 || (mode === 'song' && !selectedVoice)}
                          className="w-full"
                          size="lg"
                        >
                          <Wand2 className="w-4 h-4 mr-2" />
                          {t('aiCreate.generateBtn')} {mode === 'song' ? 'canción' : 'instrumental'} con IA
                        </Button>
                        {mode === 'song' && !selectedVoice && prompt.trim().length >= 10 && (
                          <p className="text-xs text-destructive text-center mt-1">Selecciona una voz para continuar</p>
                        )}
                        <PricingLink className="mt-1 block text-center" />
                        </>
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
                       {t('aiCreate.lyricsDescLabel')}
                     </CardTitle>
                     <CardDescription>{t('aiCreate.createDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-sm">{t('aiCreate.lyricsDescLabel')}</Label>
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
                             ? <><Loader2 style={{ width: 16, height: 16, color: 'hsl(var(--primary))', animation: 'spin 1s linear infinite' }} />{t('aiCreate.improving')}</>
                             : <><Sparkles style={{ width: 16, height: 16, color: 'hsl(var(--primary))' }} />{t('aiCreate.improveWithAI')}</>
                          }
                        </button>
                      </div>
                      <Textarea value={lyricsDesc} onChange={e => setLyricsDesc(e.target.value)} rows={3} className="resize-none" maxLength={1000} placeholder={t('aiCreate.lyricsDescPlaceholder')} />
                      {improvedLyricsDesc && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('aiCreate.lyricsDescImproved')} — {t('aiCreate.lyricsDescImprovedSub')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground text-right">{lyricsDesc.length}/1000</p>
                    </div>


                    {/* Genre chips (primary) */}
                    <div className="space-y-1.5">
                      <Label className="text-sm">{t('aiCreate.genreLabel')}</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(GENRES as readonly string[]).slice(0, 8).map(g => (
                          <Badge key={g} variant={lyricsGenre === g ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsGenre(lyricsGenre === g ? "" : g)}>{g}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Advanced options */}
                    <Collapsible>
                      <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                        ⚙️ {t('aiCreate.advancedOptions', 'Opciones avanzadas')}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-4 pt-3">
                        {/* Structure & Rhyme */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-sm">{t('aiCreate.structureLabel')}</Label>
                            <Select value={lyricsStructure} onValueChange={setLyricsStructure}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STRUCTURES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-sm">{t('aiCreate.rhymeLabel')}</Label>
                            <Select value={lyricsRhyme} onValueChange={setLyricsRhyme}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {RHYME_SCHEMES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {/* POV */}
                        <div className="space-y-1.5">
                          <Label className="text-sm">{t('aiCreate.povLabel')}</Label>
                          <Select value={lyricsPov} onValueChange={setLyricsPov}>
                            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {POVS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Writing style */}
                        <div className="space-y-1.5">
                          <Label className="text-sm">{t('aiCreate.writingStyleLabel')}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {LYRIC_STYLES.map(s => (
                              <Badge key={s} variant={lyricsStyle === s ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setLyricsStyle(lyricsStyle === s ? "" : s)}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {lyricsError && (
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="h-3.5 w-3.5" />{lyricsError}
                      </p>
                    )}

                    <Button onClick={() => handleGenerateLyrics()} disabled={isGeneratingLyrics || !lyricsDesc.trim() || !lyricsGenre} className="w-full" size="lg">
                      {isGeneratingLyrics
                         ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('aiCreate.composingLyrics')}</>
                         : <>📝 {t('aiCreate.generateLyricsFree')}</>
                       }
                     </Button>
                     <p className="text-xs text-muted-foreground text-center">{t('aiCreate.lyricsFreeBadge')}</p>
                  </CardContent>
                </Card>

                {/* ── Generated lyrics result ── */}
                {generatedLyrics && (
                  <Card className="border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Music2 className="h-4 w-4 text-primary" />
                          {t('aiCreate.yourLyrics')}
                        </CardTitle>
                        <div className="flex items-center gap-1.5">
                          <Button variant="outline" size="sm" onClick={copyLyrics} className="h-8 text-xs gap-1.5">
                            {copiedLyrics ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{t('aiCreate.copied')}</> : <><Copy className="h-3.5 w-3.5" />{t('aiCreate.copy')}</>}
                          </Button>
                          <Button variant="default" size="sm" onClick={sendLyricsToMusic} className="h-8 text-xs gap-1.5">
                            <Music className="h-3.5 w-3.5" />
                            {t('aiCreate.createSongWithLyrics')}
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
                          <Label className="text-xs text-muted-foreground">{t('aiCreate.regenSection')}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {lyricsSections.map(section => (
                              <Button key={section} variant="outline" size="sm" className="h-7 text-xs gap-1.5" disabled={isGeneratingLyrics} onClick={() => handleGenerateLyrics(section)}>
                                {isGeneratingLyrics && regenSection === section ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                                {section}
                              </Button>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{t('aiCreate.regenSectionNote')}</p>
                        </div>
                      )}

                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1.5" onClick={() => handleGenerateLyrics()} disabled={isGeneratingLyrics}>
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('aiCreate.regenFull')}
                      </Button>
                      <Link
                        to={`/ai-studio/vocal?lyrics=${encodeURIComponent(generatedLyrics)}`}
                        className="block mt-3"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10">
                          <Mic className="w-3.5 h-3.5" />
                          {t('aiCreate.singThisLyrics')}
                        </Button>
                      </Link>
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
                {activeTab === "lyrics" ? t('aiCreate.myLyrics') : t('aiCreate.results')}
              </h2>
              {activeTab === "lyrics" && lyricsHistory.length > 0 ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t('aiCreate.latest')} {lyricsHistory.length}
                </span>
              ) : activeTab === "music" && (
                <div className="flex items-center gap-2">
                  {results.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        {filteredResults.length}{filteredResults.length !== results.length ? ` / ${results.length}` : ''} {t('aiCreate.generations')}
                      </span>
                      <Button variant={bulkMode ? "default" : "outline"} size="sm" className="h-8" onClick={toggleBulkMode}>
                        <CheckSquare className="w-3.5 h-3.5 mr-1.5" />
                        {bulkMode ? t('aiCreate.cancel') : t('aiCreate.select')}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {activeTab === "lyrics" ? (
              lyricsLoading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />{t('aiCreate.loading')}
                </div>
              ) : lyricsHistory.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm text-center">{t('aiCreate.lyricsEmptyHist')}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                  {lyricsHistory.map((item) => (
                    <Card key={item.id} className="border-border/40">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.theme || item.description || t('aiCreate.noTitle')}</p>
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary"
                              title="Cantar esta letra con mi voz"
                              onClick={() => {
                                window.open(`/ai-studio/vocal?lyrics=${encodeURIComponent(item.lyrics)}`, '_self');
                              }}
                            >
                              <Mic className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3 font-mono text-xs leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                          {item.lyrics}
                        </div>
                        <details className="group">
                          <summary className="text-xs text-primary cursor-pointer hover:underline list-none flex items-center gap-1">
                            <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                            {t('aiCreate.fullLyrics')}
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
                      {selectedIds.size === filteredResults.length ? t('aiCreate.deselectAll') : t('aiCreate.selectAll')}
                    </Button>
                    <span className="text-xs text-muted-foreground flex-1">{selectedIds.size} {selectedIds.size !== 1 ? t('aiCreate.selectedPlural') : t('aiCreate.selected')}</span>
                    <TooltipProvider delayDuration={300}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7" disabled={selectedIds.size === 0} onClick={bulkDownload}>
                             <Download className="w-3.5 h-3.5 mr-1" />{t('aiCreate.download')}
                           </Button>
                         </TooltipTrigger>
                         <TooltipContent><p>{t('aiCreate.downloadSelected')}</p></TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" className="h-7" disabled={selectedIds.size === 0}>
                                <Trash2 className="w-3.5 h-3.5 mr-1" />{t('aiCreate.delete')}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                 <AlertDialogTitle>{t('aiCreate.deleteConfirm', { count: selectedIds.size, plural: selectedIds.size !== 1 ? 'es' : '' })}</AlertDialogTitle>
                                 <AlertDialogDescription>{t('aiCreate.cannotUndo')}</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                 <AlertDialogCancel>{t('aiCreate.cancel')}</AlertDialogCancel>
                                 <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('aiCreate.delete')} {selectedIds.size}</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('aiCreate.deleteSelected')}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}

                {/* Filters */}
                {results.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant={filterFavorites ? "default" : "outline"} size="sm" onClick={() => setFilterFavorites(!filterFavorites)} className="h-8">
                      <Heart className={cn("w-3.5 h-3.5 mr-1.5", filterFavorites && "fill-current")} />{t('aiCreate.favorites')}
                    </Button>
                    <Select value={filterGenre} onValueChange={setFilterGenre}>
                      <SelectTrigger className="w-[140px] h-8 text-sm"><SelectValue placeholder="Género" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('aiCreate.allGenres')}</SelectItem>
                        {availableGenres.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className={cn("h-8 text-sm", filterDateFrom && "border-primary text-primary")}>
                          <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                          {filterDateFrom ? format(filterDateFrom, "dd MMM", { locale: es }) : t('aiCreate.from')}
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
                          {filterDateTo ? format(filterDateTo, "dd MMM", { locale: es }) : t('aiCreate.to')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} disabled={(date) => date > new Date()} className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={clearFilters}>
                        <X className="w-3 h-3 mr-1" />{t('aiCreate.clear')}
                      </Button>
                    )}
                  </div>
                )}

                {isLoading ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="w-12 h-12 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground text-center">{t('aiCreate.loadingHistory')}</p>
                    </CardContent>
                  </Card>
                ) : results.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Music className="w-12 h-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-center">
                        {user ? t('aiCreate.generationsHere') : t('aiCreate.loginForHistory')}
                      </p>
                    </CardContent>
                  </Card>
                ) : filteredResults.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Filter className="w-10 h-10 text-muted-foreground mb-3" />
                       <p className="text-muted-foreground text-center text-sm">{t('aiCreate.noFilterResults')}</p>
                       <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">{t('aiCreate.clearFilters')}</Button>
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
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right shrink-0">
                                  {formatTime(audioProgress.get(result.id)?.current ?? 0)}
                                </span>
                                <Slider
                                  value={[audioProgress.get(result.id)?.current ?? 0]}
                                  max={audioProgress.get(result.id)?.duration || result.duration || 30}
                                  step={0.1}
                                  onValueChange={(v) => seekAudio(result.id, v)}
                                  className="flex-1"
                                />
                                <span className="text-[10px] tabular-nums text-muted-foreground w-8 shrink-0">
                                  {formatTime(audioProgress.get(result.id)?.duration || result.duration || 0)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
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
                                  <TooltipContent><p>{t('aiCreate.registerAsWork')}</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => toggleFavorite(result.id)}>
                                      <Heart className={`w-4 h-4 ${result.isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{result.isFavorite ? t('aiCreate.removeFav') : t('aiCreate.addFav')}</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => downloadAudio(result)}>
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>{t('aiCreate.downloadAudio')}</p></TooltipContent>
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
                                           <AlertDialogTitle>{t('aiCreate.deleteGeneration')}</AlertDialogTitle>
                                           <AlertDialogDescription>{t('aiCreate.cannotUndo')}</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                           <AlertDialogCancel>{t('aiCreate.cancel')}</AlertDialogCancel>
                                           <AlertDialogAction onClick={() => deleteGeneration(result.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('aiCreate.delete')}</AlertDialogAction>
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

      {/* ── Save as Virtual Artist Prompt Modal ── */}
      <Dialog open={showSaveArtistPrompt} onOpenChange={setShowSaveArtistPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              ¿Te gusta esta voz y este estilo?
            </DialogTitle>
            <DialogDescription>
              Guarda esta configuración como un Artista Virtual para crear más canciones con el mismo estilo automáticamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              onClick={() => { setShowSaveArtistPrompt(false); setShowSaveArtistForm(true); }}
              className="gap-2 flex-1"
            >
              <Save className="h-4 w-4" />
              Guardar como artista virtual
            </Button>
            <Button variant="outline" onClick={() => setShowSaveArtistPrompt(false)} className="flex-1">
              No guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Save Virtual Artist Form Modal ── */}
      <Dialog open={showSaveArtistForm} onOpenChange={setShowSaveArtistForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo artista virtual</DialogTitle>
            <DialogDescription>
              Voz seleccionada: {lastGeneratedVoiceName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="save-artist-name">Nombre del artista *</Label>
              <Input
                id="save-artist-name"
                placeholder="Ej: Luna Nova"
                value={saveArtistName}
                onChange={(e) => setSaveArtistName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="save-artist-style">Estilo (opcional)</Label>
              <Input
                id="save-artist-style"
                placeholder="Ej: Pop"
                value={saveArtistStyle}
                onChange={(e) => setSaveArtistStyle(e.target.value)}
                maxLength={100}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSaveArtistForm(false)} disabled={isSavingArtist}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVirtualArtist} disabled={!saveArtistName.trim() || isSavingArtist} className="gap-2">
              {isSavingArtist ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="h-4 w-4" /> Guardar artista</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
    </div>
  );
};

export default AIStudioCreate;
