import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mic, Download, Loader2, Music, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const THEMES = ["Amor", "Desamor", "Superación", "Fiesta", "Calle", "Familia", "Libertad", "Nostalgia", "Éxito", "Identidad"];
const MUSIC_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Flamenco', 'Electrónica', 'Jazz', 'Clásica', 'R&B', 'Latin'];
const MUSIC_MOODS = ['Alegre', 'Melancólico', 'Épico', 'Relajado', 'Enérgico', 'Romántico', 'Oscuro', 'Motivador'];
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
const ARTIST_REFS = ["Bad Bunny", "Rosalía", "C. Tangana", "J Balvin", "Bizarrap", "Shakira", "Residente", "Anuel AA", "Eminem", "Drake", "Kendrick Lamar", "Taylor Swift", "The Weeknd", "Beyoncé", "Radiohead", "Arctic Monkeys"];
const POVS = ["Primera persona", "Segunda persona", "Tercera persona"];

export default function AIStudioVocal() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [lyrics, setLyrics] = useState('');
  const [voiceClones, setVoiceClones] = useState<any[]>([]);
  const [selectedCloneId, setSelectedCloneId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  // Lyrics generator states
  const [lyricsDesc, setLyricsDesc] = useState('');
  const [lyricsTheme, setLyricsTheme] = useState('');
  const [lyricsGenre, setLyricsGenre] = useState('');
  const [lyricsMood, setLyricsMood] = useState('');
  const [lyricsStyle, setLyricsStyle] = useState('');
  const [lyricsLanguage, setLyricsLanguage] = useState('Español');
  const [lyricsStructure, setLyricsStructure] = useState('V+C+V+C+P+C');
  const [lyricsRhyme, setLyricsRhyme] = useState('ABAB');
  const [lyricsPov, setLyricsPov] = useState('Primera persona');
  const [lyricsArtistRefs, setLyricsArtistRefs] = useState<string[]>([]);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  // Clone modal states
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloningName, setCloningName] = useState('');
  const [cloningFile, setCloningFile] = useState<File | null>(null);
  const [cloningDuration, setCloningDuration] = useState<number | null>(null);
  const [cloningNoise, setCloningNoise] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const cloneFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const lyricsParam = searchParams.get('lyrics');
    if (lyricsParam) setLyrics(decodeURIComponent(lyricsParam));
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    supabase.from('voice_clones').select('*')
      .eq('user_id', user.id).eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setVoiceClones(data || []);
        if (data?.length) setSelectedCloneId(data[0].id);
      });
    supabase.from('ai_generations').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => {
        const vocaltracks = (data || []).filter((d: any) => d.prompt?.startsWith('Pista vocal'));
        setHistory(vocaltracks);
      });
  }, [user]);

  const handleInlineClone = async () => {
    if (!cloningFile || !cloningName.trim() || !user) return;
    if (cloningDuration !== null && cloningDuration < 30) {
      toast({ title: 'Audio muy corto', description: 'Mínimo 30 segundos.', variant: 'destructive' });
      return;
    }
    setIsCloning(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const form = new FormData();
      form.append('audio', cloningFile);
      form.append('name', cloningName.trim());
      form.append('remove_background_noise', String(cloningNoise));
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }, body: form }
      );
      const data = await response.json();
      if (!response.ok) { toast({ title: 'Error al clonar', description: data.error || 'No se pudo clonar', variant: 'destructive' }); return; }
      const { data: newClones } = await supabase.from('voice_clones').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false });
      setVoiceClones(newClones || []);
      if (newClones?.length) setSelectedCloneId(newClones[0].id);
      setShowCloneModal(false);
      setCloningName(''); setCloningFile(null); setCloningDuration(null);
      if (cloneFileRef.current) cloneFileRef.current.value = '';
      toast({ title: '🎤 ¡Voz clonada!', description: `"${cloningName}" lista para usar.` });
    } catch { toast({ title: 'Error de conexión', variant: 'destructive' }); }
    finally { setIsCloning(false); }
  };

  const handleGenerateLyrics = async () => {
    if (!lyricsDesc.trim() && !lyricsTheme) {
      toast({ title: 'Describe tu canción o elige un tema', variant: 'destructive' });
      return;
    }
    setIsGeneratingLyrics(true);
    try {
      const { data, error } = await supabase.functions.invoke('lyrics-generator', {
        body: {
          description: lyricsDesc,
          theme: lyricsTheme,
          genre: lyricsGenre,
          mood: lyricsMood,
          style: lyricsStyle,
          language: lyricsLanguage,
          structure: lyricsStructure,
          rhymeScheme: lyricsRhyme,
          pov: lyricsPov,
          artistRefs: lyricsArtistRefs,
        }
      });
      if (error) throw error;
      if (data?.lyrics) {
        setLyrics(data.lyrics);
        toast({ title: '✅ Letra generada', description: 'Puedes editarla antes de cantar.' });
      }
    } catch {
      toast({ title: 'Error al generar la letra', variant: 'destructive' });
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleGenerate = async () => {
    if (!lyrics.trim()) { toast({ title: 'Escribe o pega tu letra primero', variant: 'destructive' }); return; }
    const selectedClone = voiceClones.find((c: any) => c.id === selectedCloneId);
    if (!selectedClone) { toast({ title: 'Selecciona una voz clonada', description: 'Ve a "Clonación de Voz" para crear tu primera voz.', variant: 'destructive' }); return; }

    setIsGenerating(true);
    setAudioUrl('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-vocal-track`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            lyrics,
            voice_id: selectedClone.elevenlabs_voice_id,
            voice_name: selectedClone.name,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'insufficient_credits') {
          toast({ title: 'Créditos insuficientes', description: 'Necesitas 1 crédito para generar una pista vocal.', variant: 'destructive' });
        } else {
          toast({ title: 'Error', description: data.error || 'No se pudo generar', variant: 'destructive' });
        }
        return;
      }
      setAudioUrl(data.audioUrl);
      setHistory(prev => [{ id: data.generationId, audio_url: data.audioUrl, prompt: `Pista vocal: ${selectedClone.name}`, created_at: new Date().toISOString() }, ...prev]);
      toast({ title: '🎤 ¡Pista vocal generada!', description: 'Tu voz cantando tu letra está lista.' });
    } catch {
      toast({ title: 'Error de conexión', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver a AI Studio
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Voz & Letra</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Canta tu canción</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Tu voz clonada cantando tu letra. Descarga la pista vocal y mézclala con tu base.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left column — inputs */}
          <div className="space-y-5">
            {/* Voice selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">🎤 Tu voz clonada</CardTitle>
              </CardHeader>
              <CardContent>
                {voiceClones.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground mb-3">Aún no tienes ninguna voz clonada</p>
                    <Button size="sm" variant="outline" onClick={() => setShowCloneModal(true)}>
                      <Mic className="w-3.5 h-3.5 mr-2" />Clonar mi voz
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {voiceClones.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCloneId(c.id)}
                        className="w-full flex items-center gap-3 rounded-lg p-3 text-left transition-all"
                        style={{
                          border: selectedCloneId === c.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                          background: selectedCloneId === c.id ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                        }}
                      >
                        <span className="text-lg">🎤</span>
                        <div>
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">Voz clonada · ElevenLabs</p>
                        </div>
                      </button>
                    ))}
                    <Button size="sm" variant="ghost" className="w-full text-xs text-muted-foreground mt-1" onClick={() => setShowCloneModal(true)}>
                      <Mic className="w-3 h-3 mr-1" /> Añadir otra voz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lyrics generator */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">📝 Tu letra</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">Generación gratis</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Descripción */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">¿De qué va tu canción?</Label>
                  <Textarea
                    value={lyricsDesc}
                    onChange={(e) => setLyricsDesc(e.target.value)}
                    placeholder="Describe la historia, el sentimiento, la situación..."
                    rows={3}
                    className="resize-none text-sm"
                    maxLength={400}
                  />
                </div>

                {/* Tema central */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tema central</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {THEMES.map(t => (
                      <Badge key={t} variant={lyricsTheme === t ? 'default' : 'outline'} className="cursor-pointer text-xs"
                        onClick={() => setLyricsTheme(lyricsTheme === t ? '' : t)}>{t}</Badge>
                    ))}
                  </div>
                </div>

                {/* Género y Mood */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Género musical</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSIC_GENRES.map(g => (
                        <Badge key={g} variant={lyricsGenre === g ? 'default' : 'outline'} className="cursor-pointer text-xs"
                          onClick={() => setLyricsGenre(lyricsGenre === g ? '' : g)}>{g}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Mood / Tono</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {MUSIC_MOODS.map(m => (
                        <Badge key={m} variant={lyricsMood === m ? 'default' : 'outline'} className="cursor-pointer text-xs"
                          onClick={() => setLyricsMood(lyricsMood === m ? '' : m)}>{m}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Artistas de referencia */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">
                    Estilo de artistas de referencia
                    <span className="text-muted-foreground font-normal ml-1">(También puedes escribir uno propio en el campo de texto)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ARTIST_REFS.map(a => (
                      <Badge key={a} variant={lyricsArtistRefs.includes(a) ? 'default' : 'outline'} className="cursor-pointer text-xs"
                        onClick={() => setLyricsArtistRefs(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])}>{a}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      placeholder="Añadir artista personalizado…"
                      className="text-xs h-8"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !lyricsArtistRefs.includes(val)) {
                            setLyricsArtistRefs(prev => [...prev, val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  {lyricsArtistRefs.filter(a => !ARTIST_REFS.includes(a)).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {lyricsArtistRefs.filter(a => !ARTIST_REFS.includes(a)).map(a => (
                        <Badge key={a} variant="default" className="cursor-pointer text-xs gap-1"
                          onClick={() => setLyricsArtistRefs(prev => prev.filter(x => x !== a))}>
                          {a} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Estructura y Esquema de rima */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Estructura</Label>
                    <select value={lyricsStructure} onChange={e => setLyricsStructure(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground">
                      {STRUCTURES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Esquema de rima</Label>
                    <select value={lyricsRhyme} onChange={e => setLyricsRhyme(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground">
                      {RHYME_SCHEMES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* Idioma y Punto de vista */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Idioma</Label>
                    <select value={lyricsLanguage} onChange={e => setLyricsLanguage(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground">
                      {LYRIC_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Punto de vista</Label>
                    <select value={lyricsPov} onChange={e => setLyricsPov(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-border bg-background text-foreground">
                      {POVS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {/* Estilo de escritura */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Estilo de escritura</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {LYRIC_STYLES.map(s => (
                      <Badge key={s} variant={lyricsStyle === s ? 'default' : 'outline'} className="cursor-pointer text-xs"
                        onClick={() => setLyricsStyle(lyricsStyle === s ? '' : s)}>{s}</Badge>
                    ))}
                  </div>
                </div>

                {/* Botón generar letra */}
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handleGenerateLyrics}
                  disabled={isGeneratingLyrics || (!lyricsDesc.trim() && !lyricsTheme)}
                >
                  {isGeneratingLyrics
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Generando letra...</>
                    : <><Sparkles className="w-4 h-4" />Generar letra (gratis)</>
                  }
                </Button>

                {/* Separador */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                  <div className="relative flex justify-center"><span className="bg-background px-2 text-xs text-muted-foreground">o escribe / pega tu letra</span></div>
                </div>

                {/* Textarea letra */}
                <Textarea
                  value={lyrics}
                  onChange={e => setLyrics(e.target.value)}
                  placeholder={"[Verso 1]\nEscribe aquí tu letra...\n\n[Coro]\nO pégala desde el Compositor de Letras"}
                  rows={8}
                  className="resize-none text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">{lyrics.length} caracteres · Los tags [Verso], [Coro] se eliminan automáticamente</p>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || !lyrics.trim() || !selectedCloneId}
            >
              {isGenerating
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generando tu pista vocal...</>
                : <><Mic className="w-4 h-4 mr-2" />Generar pista vocal — 1 crédito</>
              }
            </Button>
          </div>

          {/* Right column — result + history */}
          <div className="space-y-5">
            {audioUrl && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">✅ Pista vocal lista</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <audio controls className="w-full" src={audioUrl} />
                  <div className="flex gap-2">
                    <a href={audioUrl} download="pista-vocal.mp3" className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Download className="w-4 h-4" /> Descargar pista vocal
                      </Button>
                    </a>
                    <Link to="/ai-studio/create" className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <Music className="w-4 h-4" /> Generar base instrumental
                      </Button>
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    💡 Descarga la pista vocal y mézclala con tu base en GarageBand, Audacity o cualquier DAW
                  </p>
                </CardContent>
              </Card>
            )}

            {!audioUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">¿Cómo funciona?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { step: '1', text: 'Clona tu voz en "Clonación de Voz" del sidebar (mínimo 1 minuto de audio)' },
                    { step: '2', text: 'Escribe tu letra o impórtala desde el Compositor de Letras' },
                    { step: '3', text: 'Genera tu pista vocal — tu voz cantando tu letra (1 crédito)' },
                    { step: '4', text: 'Descarga la pista y combínala con tu base instrumental' },
                  ].map(({ step, text }) => (
                    <div key={step} className="flex gap-3 items-start">
                      <span className="min-w-[24px] h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{step}</span>
                      <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pistas generadas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.slice(0, 5).map((h: any) => (
                    <div key={h.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                      <Mic className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{h.prompt || 'Pista vocal'}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString('es-ES')}</p>
                      </div>
                      <a href={h.audio_url} download>
                        <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground cursor-pointer" />
                      </a>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Clone voice modal */}
        {showCloneModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: 'hsl(var(--background))', borderRadius: '16px', padding: '32px', width: '100%', maxWidth: '480px', border: '1px solid hsl(var(--border))' }}>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 700, color: 'hsl(var(--foreground))' }}>🎤 Clonar mi voz</h2>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'hsl(var(--muted-foreground))' }}>Sube 1-2 minutos de tu voz hablando o cantando. Sin música de fondo.</p>
              <div style={{ background: 'hsl(var(--primary) / 0.06)', borderRadius: '8px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: 'hsl(var(--muted-foreground))' }}>
                💡 Graba en silencio · Voz clara y natural · MP3 o WAV · Mínimo 1 minuto recomendado
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'hsl(var(--foreground))' }}>Nombre de tu voz *</label>
                <input type="text" value={cloningName} onChange={e => setCloningName(e.target.value)} placeholder="Ej: Mi voz, Luna..." maxLength={50}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, display: 'block', marginBottom: '6px', color: 'hsl(var(--foreground))' }}>Audio de tu voz *</label>
                <input ref={cloneFileRef} type="file" accept="audio/mp3,audio/mpeg,audio/wav,.mp3,.wav,.m4a"
                  onChange={e => { const f = e.target.files?.[0]; if (!f) return; setCloningFile(f); const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => setCloningDuration(Math.round(a.duration)); }}
                  style={{ width: '100%', fontSize: '13px', color: 'hsl(var(--foreground))' }} />
                {cloningDuration !== null && (
                  <p style={{ marginTop: '6px', fontSize: '12px', color: cloningDuration < 30 ? '#ef4444' : cloningDuration < 60 ? '#f59e0b' : '#22c55e' }}>
                    {cloningDuration < 30 ? `⚠️ Audio muy corto (${cloningDuration}s) — mínimo 30 segundos` : cloningDuration < 60 ? `⚠️ Funciona pero mejor con más de 1 minuto (${cloningDuration}s)` : `✓ Duración óptima (${cloningDuration}s)`}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <input type="checkbox" id="clone-noise-vocal" checked={cloningNoise} onChange={e => setCloningNoise(e.target.checked)} />
                <label htmlFor="clone-noise-vocal" style={{ fontSize: '12px', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}>Eliminar ruido de fondo</label>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={handleInlineClone}
                  disabled={!cloningFile || !cloningName.trim() || isCloning || (cloningDuration !== null && cloningDuration < 30)}
                  style={{ flex: 1, padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, background: 'hsl(var(--primary))', color: 'white', border: 'none', cursor: 'pointer', opacity: (!cloningFile || !cloningName.trim() || isCloning) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isCloning ? <><Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />Clonando...</> : '🎤 Clonar mi voz'}
                </button>
                <button type="button" onClick={() => { setShowCloneModal(false); setCloningName(''); setCloningFile(null); setCloningDuration(null); }}
                  style={{ padding: '10px 20px', borderRadius: '8px', fontSize: '14px', background: 'transparent', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))', cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
