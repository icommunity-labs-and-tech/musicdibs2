import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Pencil, Music, X, Check, ExternalLink, Copy, Sparkles, Loader2, HelpCircle } from "lucide-react";
import { VirtualArtistsWelcomeModal } from "@/components/dashboard/VirtualArtistsWelcomeModal";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const MUSIC_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Reggaeton', 'Flamenco', 'Electrónica', 'Jazz', 'Clásica', 'R&B', 'Latin'];
const MUSIC_MOODS = ['Alegre', 'Melancólico', 'Épico', 'Relajado', 'Enérgico', 'Romántico', 'Oscuro', 'Motivador'];
const DURATION_OPTIONS = [30, 60, 90, 120] as const;

interface ArtistProfile {
  id: string;
  name: string;
  voice_profile_id: string | null;
  genre: string | null;
  mood: string | null;
  default_duration: number;
  style_notes: string | null;
  is_default: boolean;
  created_at: string;
  voice_profiles?: { label: string; emoji: string; sample_url: string | null } | null;
}

const ArtistProfilesPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState<ArtistProfile[]>([]);
  const [voiceProfiles, setVoiceProfiles] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formVoice, setFormVoice] = useState("");
  const [formGenre, setFormGenre] = useState<string | null>(null);
  const [formMood, setFormMood] = useState<string | null>(null);
  const [formDuration, setFormDuration] = useState(60);
  const [formNotes, setFormNotes] = useState("");
  const [formDefault, setFormDefault] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  // Audio preview
  const [playingVoice, setPlayingVoice] = useState("");
  const [audioRef] = useState<Record<string, HTMLAudioElement>>({});

  const loadProfiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_artist_profiles')
      .select('*, voice_profiles(label, emoji, sample_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setProfiles((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
    supabase.from('voice_profiles').select('*').eq('active', true).order('sort_order')
      .then(({ data }) => setVoiceProfiles(data || []));
    if (user) {
      // Show welcome modal on first visit
      const hasSeenKey = `virtual_artists_welcome_seen_${user.id}`;
      if (!localStorage.getItem(hasSeenKey)) {
        setShowWelcomeModal(true);
        localStorage.setItem(hasSeenKey, 'true');
      }
    }
  }, [user]);

  const resetForm = () => {
    setFormName(""); setFormVoice(""); setFormGenre(null); setFormMood(null);
    setFormDuration(60); setFormNotes(""); setFormDefault(false);
    setShowForm(false); setEditingId(null);
  };

  const startEdit = (p: ArtistProfile) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormVoice(p.voice_profile_id || "");
    setFormGenre(p.genre);
    setFormMood(p.mood);
    setFormDuration(p.default_duration || 60);
    setFormNotes(p.style_notes || "");
    setFormDefault(p.is_default);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !user) return;
    setSaving(true);

    const payload = {
      user_id: user.id,
      name: formName.trim(),
      voice_profile_id: formVoice || null,
      voice_type: 'preset' as const,
      voice_clone_id: null,
      genre: formGenre,
      mood: formMood,
      default_duration: formDuration,
      style_notes: formNotes || null,
      is_default: formDefault,
    };

    // If setting as default, unset others first
    if (formDefault) {
      await supabase.from('user_artist_profiles')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .neq('id', editingId || '');
    }

    let error;
    if (editingId) {
      ({ error } = await supabase.from('user_artist_profiles').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('user_artist_profiles').insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Perfil actualizado" : "Perfil creado" });
      resetForm();
      loadProfiles();
    }
  };

  const handleDuplicate = async (p: ArtistProfile) => {
    if (!user) return;
    const { error } = await supabase.from('user_artist_profiles').insert({
      user_id: user.id,
      name: `${p.name} (copia)`,
      voice_profile_id: p.voice_profile_id,
      genre: p.genre,
      mood: p.mood,
      default_duration: p.default_duration,
      style_notes: p.style_notes,
      is_default: false,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil duplicado", description: `"${p.name} (copia)" creado` });
      loadProfiles();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('user_artist_profiles').delete().eq('id', id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setProfiles(prev => prev.filter(p => p.id !== id));
      toast({ title: "Perfil eliminado" });
    }
  };

  const handlePreviewVoice = (e: React.MouseEvent, voiceId: string, sampleUrl: string) => {
    e.stopPropagation();
    if (!sampleUrl) return;
    if (audioRef[playingVoice]) { audioRef[playingVoice].pause(); audioRef[playingVoice].currentTime = 0; }
    if (playingVoice === voiceId) { setPlayingVoice(''); return; }
    const audio = new Audio(sampleUrl);
    audioRef[voiceId] = audio;
    audio.play();
    setPlayingVoice(voiceId);
    audio.onended = () => setPlayingVoice('');
  };

  const handleGenerateNotes = async (regenerate = false) => {
    const voiceLabel = voiceProfiles.find(v => v.id === formVoice)?.label || '';
    const context = [
      formName && `Artista: ${formName}`,
      voiceLabel && `Voz: ${voiceLabel}`,
      formGenre && `Género: ${formGenre}`,
      formMood && `Mood: ${formMood}`,
    ].filter(Boolean).join(', ');

    if (!context) {
      toast({ title: "Añade al menos un dato", description: "Selecciona nombre, voz, género o mood para generar notas.", variant: "destructive" });
      return;
    }

    setGeneratingNotes(true);
    try {
      const basePrompt = regenerate && formNotes
        ? `Reescribe y mejora estas notas de estilo de un artista musical, dándoles un enfoque diferente pero manteniendo la esencia. Notas actuales: "${formNotes}". Contexto del artista: ${context}. Genera 3-4 frases nuevas con perspectiva fresca. Responde solo con las notas, sin encabezados.`
        : `Genera unas notas de estilo breves (3-4 frases) para un perfil de artista musical con estas características: ${context}. ${formNotes ? `Notas existentes para expandir: ${formNotes}` : ''} Describe temática habitual, referencias musicales, idioma, atmósfera y elementos distintivos. Responde solo con las notas, sin encabezados.`;

      const { data, error } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: basePrompt,
          genre: formGenre,
          mood: formMood,
          mode: 'song',
        },
      });
      if (error) throw error;
      if (data?.improved) {
        setFormNotes(data.improved);
        toast({ title: "✨ Notas generadas" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudieron generar las notas", variant: "destructive" });
    } finally {
      setGeneratingNotes(false);
    }
  };

  return (
    <div className="space-y-6">
      <VirtualArtistsWelcomeModal
        open={showWelcomeModal}
        onOpenChange={setShowWelcomeModal}
        onCreateFirst={() => { setShowWelcomeModal(false); resetForm(); setShowForm(true); }}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.virtualArtists.title', { defaultValue: 'Mis Artistas Virtuales' })}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t('dashboard.virtualArtists.description', { defaultValue: 'Guarda la configuración de voz y estilo de tus artistas para crear canciones coherentes.' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowWelcomeModal(true)} className="gap-1.5 text-muted-foreground">
            <HelpCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t('virtualArtists.welcome.showAgain', 'Ver introducción')}</span>
          </Button>
          {!showForm && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              {t('dashboard.virtualArtists.newArtist', { defaultValue: 'Nuevo Artista Virtual' })}
            </Button>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? "Editar perfil" : "Nuevo perfil de artista"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Nombre del artista *</Label>
              <input
                type="text"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="Ej: Mi proyecto trap, Luna Electrónica..."
                maxLength={50}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              />
            </div>

            {/* Voice selection — preset only */}
            <div className="space-y-2">
              <Label>Voz del artista</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {voiceProfiles.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setFormVoice(formVoice === v.id ? '' : v.id)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '8px 12px', borderRadius: '8px',
                      border: formVoice === v.id ? '2px solid hsl(var(--primary))' : '1px solid hsl(var(--border))',
                      background: formVoice === v.id ? 'hsl(var(--primary) / 0.08)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', width: '100%',
                    }}
                    title={v.description}
                  >
                    <span style={{ fontSize: '16px', marginBottom: '2px' }}>{v.emoji}</span>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--foreground)' }}>{v.label}</span>
                    {v.sample_url && (
                      <span
                        onClick={(e) => handlePreviewVoice(e, v.id, v.sample_url)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                          marginTop: '4px', fontSize: '11px',
                          color: playingVoice === v.id ? 'hsl(var(--primary))' : '#6b7280', cursor: 'pointer',
                        }}
                      >
                        {playingVoice === v.id ? <span>⏹ Detener</span> : <span>▶ Escuchar</span>}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Esta voz se usará por defecto al generar música con este perfil</p>
            </div>

            {/* Genre chips */}
            <div className="space-y-2">
              <Label>Género</Label>
              <div className="flex flex-wrap gap-2">
                {MUSIC_GENRES.map(g => (
                  <Badge key={g} variant={formGenre === g ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => setFormGenre(formGenre === g ? null : g)}>{g}</Badge>
                ))}
              </div>
            </div>

            {/* Mood chips */}
            <div className="space-y-2">
              <Label>Mood</Label>
              <div className="flex flex-wrap gap-2">
                {MUSIC_MOODS.map(m => (
                  <Badge key={m} variant={formMood === m ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => setFormMood(formMood === m ? null : m)}>{m}</Badge>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label>Duración por defecto</Label>
              <div className="flex gap-2">
                {DURATION_OPTIONS.map(d => (
                  <button key={d} onClick={() => setFormDuration(d)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      formDuration === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50'
                    }`}>{d}s</button>
                ))}
              </div>
            </div>

            {/* Style notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Notas de estilo</Label>
                <div className="flex items-center gap-1">
                  {formNotes.trim() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateNotes(true)}
                      disabled={generatingNotes}
                      className="gap-1.5 text-xs h-7 text-muted-foreground hover:text-primary"
                    >
                      {generatingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      Regenerar
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateNotes(false)}
                    disabled={generatingNotes}
                    className="gap-1.5 text-xs h-7 text-primary hover:text-primary"
                  >
                    {generatingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {generatingNotes ? 'Generando...' : 'Generar con IA'}
                  </Button>
                </div>
              </div>
              <Textarea
                value={formNotes}
                onChange={e => setFormNotes(e.target.value)}
                placeholder="Describe el estilo del artista: temática, idioma habitual, referencias..."
                rows={3} className="resize-none"
              />
            </div>

            {/* Default checkbox */}
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={formDefault} onChange={e => setFormDefault(e.target.checked)}
                className="rounded border-border" />
              Perfil por defecto — se preselecciona al abrir el generador
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={!formName.trim() || saving} className="gap-2">
                <Check className="h-4 w-4" />
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear perfil'}
              </Button>
              <Button variant="ghost" onClick={resetForm}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-12">Cargando perfiles...</p>
      ) : profiles.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Music className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">Aún no tienes perfiles de artista</p>
            <p className="text-sm text-muted-foreground">Crea uno para guardar tu configuración de voz y estilo favorita.</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Crear mi primer perfil
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {profiles.map(p => (
            <Card key={p.id} className={p.is_default ? 'border-primary/40' : ''}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{p.voice_profiles?.emoji || '🎤'}</span>
                    <span className="font-semibold text-lg">{p.name}</span>
                    {p.is_default && <Badge variant="secondary" className="text-[10px]">Por defecto</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {p.voice_profiles?.label && <Badge variant="outline" className="text-xs">{p.voice_profiles.label}</Badge>}
                    {p.genre && <Badge variant="outline" className="text-xs">{p.genre}</Badge>}
                    {p.mood && <Badge variant="outline" className="text-xs">{p.mood}</Badge>}
                    <Badge variant="outline" className="text-xs">{p.default_duration}s</Badge>
                  </div>
                  {p.style_notes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.style_notes}</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => navigate(`/ai-studio/create?profile=${p.id}`)} className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Usar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(p)} title="Duplicar perfil">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar "{p.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(p.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistProfilesPage;
