import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Mic, Download, Loader2, Music, Sparkles } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

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
                    <Link to="/dashboard/voice-cloning">
                      <Button size="sm">Clonar mi voz</Button>
                    </Link>
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
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lyrics */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">📝 Tu letra</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">Gratis con el compositor</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder={"[Verso 1]\nEscribe aquí tu letra...\n\n[Coro]\nO pégala desde el Compositor de Letras"}
                  rows={10}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {lyrics.length} caracteres · Los tags [Verso], [Coro] se eliminan automáticamente
                </p>
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
      </main>
      <Footer />
    </div>
  );
}
