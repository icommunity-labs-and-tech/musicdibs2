import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mic, Upload, Trash2, Loader2, CheckCircle2, AlertCircle, Music, Pencil, Check, X, Play, Pause, Globe } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTranslation } from 'react-i18next';
import { VoiceTranslator } from '@/components/voice/VoiceTranslator';

const VoiceCloningPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const vc = (key: string, opts?: Record<string, unknown>) => t(`dashboard.voiceCloning.${key}`, opts);

  const [clones, setClones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [removeNoise, setRemoveNoise] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCloneId, setEditingCloneId] = useState<string | null>(null);
  const [editingCloneName, setEditingCloneName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio player state
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const stopPlayback = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setPlayingId(null);
    setCurrentTime(0);
    setDuration(0);
  }, []);

  const togglePlay = useCallback(async (clone: any) => {
    if (playingId === clone.id) { stopPlayback(); return; }
    stopPlayback();
    if (!clone.sample_url) return;
    const audio = new Audio(clone.sample_url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setDuration(audio.duration));
    audio.addEventListener('ended', stopPlayback);
    const tick = () => { setCurrentTime(audio.currentTime); rafRef.current = requestAnimationFrame(tick); };
    setPlayingId(clone.id);
    await audio.play();
    tick();
  }, [playingId, stopPlayback]);

  const handleSeek = useCallback((val: number[]) => {
    if (audioRef.current) { audioRef.current.currentTime = val[0]; setCurrentTime(val[0]); }
  }, []);

  useEffect(() => () => { stopPlayback(); }, [stopPlayback]);

  const loadClones = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('voice_clones')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    const withUrls = await Promise.all((data || []).map(async (c: any) => {
      if (c.sample_storage_path) {
        const { data: urlData } = await supabase.storage
          .from('voice-clone-samples')
          .createSignedUrl(c.sample_storage_path, 3600);
        return { ...c, sample_url: urlData?.signedUrl || null };
      }
      return { ...c, sample_url: null };
    }));
    setClones(withUrls);
    setLoading(false);
  };

  useEffect(() => { loadClones(); }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAudioFile(file);
    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => setAudioDuration(Math.round(audio.duration));
  };

  const handleClone = async () => {
    if (!audioFile || !name.trim() || !user) return;

    if (audioDuration !== null && audioDuration < 30) {
      toast({ title: vc('tooShort'), description: vc('tooShortDesc'), variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const form = new FormData();
      form.append('audio', audioFile);
      form.append('name', name.trim());
      form.append('description', description);
      form.append('remove_background_noise', String(removeNoise));

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-voice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: form,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ title: vc('cloneError'), description: data.error || vc('cloneErrorDefault'), variant: 'destructive' });
        return;
      }

      toast({ title: vc('cloneSuccess'), description: vc('cloneSuccessDesc', { name: name.trim() }) });
      setName(''); setDescription(''); setAudioFile(null); setAudioDuration(null); setRemoveNoise(false);
      setShowForm(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadClones();
    } catch {
      toast({ title: vc('connectionError'), description: vc('connectionErrorDesc'), variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (clone: any) => {
    await supabase.from('voice_clones').update({ status: 'deleted' }).eq('id', clone.id);
    setClones(prev => prev.filter(c => c.id !== clone.id));
    toast({ title: vc('deleted') });
  };

  const handleRename = async (cloneId: string) => {
    const trimmed = editingCloneName.trim();
    if (!trimmed) return;
    const { error } = await supabase.from('voice_clones').update({ name: trimmed }).eq('id', cloneId);
    if (!error) {
      setClones(prev => prev.map(c => c.id === cloneId ? { ...c, name: trimmed } : c));
      toast({ title: vc('renamed') });
    }
    setEditingCloneId(null);
  };

  const formatDate = (dateStr: string) => {
    const lang = i18n.resolvedLanguage || 'es';
    const localeMap: Record<string, string> = { es: 'es-ES', en: 'en-US', 'pt-BR': 'pt-BR', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
    return new Date(dateStr).toLocaleDateString(localeMap[lang] || 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const durationBadge = () => {
    if (audioDuration === null) return null;
    if (audioDuration < 30) return <span className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {vc('durationTooShort')}</span>;
    if (audioDuration < 60) return <span className="text-xs text-yellow-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {vc('durationOk')}</span>;
    return <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {vc('durationOptimal')}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{vc('title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{vc('subtitle')}</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Mic className="h-4 w-4" /> {vc('newVoice')}
          </Button>
        )}
      </div>

      {/* Tips banner */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4 flex gap-3">
          <Mic className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-foreground">{vc('tipsTitle')}</p>
            <ul className="text-muted-foreground space-y-0.5 list-disc list-inside">
              <li>{vc('tip1')}</li>
              <li>{vc('tip2')}</li>
              <li>{vc('tip3')}</li>
              <li>{vc('tip4')}</li>
              <li>{vc('tip5')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Voice Translator Section */}
      {clones.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              {vc('translator.sectionTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{vc('translator.sectionDesc')}</p>
          </CardHeader>
          <CardContent>
            <VoiceTranslator clones={clones} />
          </CardContent>
        </Card>
      )}

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">{vc('formTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>{vc('nameLabel')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={vc('namePlaceholder')} maxLength={50} />
            </div>

            <div className="space-y-1.5">
              <Label>{vc('descLabel')}</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder={vc('descPlaceholder')} maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <Label>{vc('uploadLabel')}</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {audioFile ? audioFile.name : vc('uploadHint')}
                </p>
                {audioFile && audioDuration !== null && (
                  <p className="text-xs text-muted-foreground mt-1">{vc('duration', { seconds: audioDuration })}</p>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".mp3,.wav,.m4a,audio/*" className="hidden" onChange={handleFileChange} />
              {durationBadge()}
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={removeNoise} onChange={e => setRemoveNoise(e.target.checked)} className="rounded border-border" />
              {vc('removeNoise')}
              <span className="text-muted-foreground text-xs">— {vc('removeNoiseHint')}</span>
            </label>

            <div className="flex gap-3">
              <Button onClick={handleClone} disabled={!audioFile || !name.trim() || uploading} className="gap-2">
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> {vc('cloningBtn')}</> : <><Mic className="h-4 w-4" /> {vc('cloneBtn')}</>}
              </Button>
              <Button variant="ghost" onClick={() => { setShowForm(false); setAudioFile(null); setAudioDuration(null); setName(''); setDescription(''); }}>
                {vc('cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clones list */}
      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-12">{vc('loading')}</p>
      ) : clones.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Mic className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">{vc('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{vc('emptyDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {clones.map(clone => (
            <Card key={clone.id}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/15 text-primary border-0 text-xs">{vc('badge')}</Badge>
                  </div>
                  {editingCloneId === clone.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editingCloneName}
                        onChange={e => setEditingCloneName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRename(clone.id); if (e.key === 'Escape') setEditingCloneId(null); }}
                        className="h-8 text-lg font-semibold w-48"
                        maxLength={50}
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(clone.id)}><Check className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingCloneId(null)}><X className="h-3.5 w-3.5" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-lg">{clone.name}</p>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => { setEditingCloneId(clone.id); setEditingCloneName(clone.name); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {clone.description && <p className="text-xs text-muted-foreground mt-0.5">{clone.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {vc('createdAt', { date: formatDate(clone.created_at) })}
                  </p>
                  {/* Audio player */}
                  {clone.sample_url && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => togglePlay(clone)}
                      >
                        {playingId === clone.id
                          ? <Pause className="h-3.5 w-3.5" />
                          : <Play className="h-3.5 w-3.5" />}
                      </Button>
                      <Slider
                        value={[playingId === clone.id ? currentTime : 0]}
                        max={playingId === clone.id && duration > 0 ? duration : 100}
                        step={0.1}
                        onValueChange={handleSeek}
                        className="flex-1"
                        disabled={playingId !== clone.id}
                      />
                      <span className="text-[10px] text-muted-foreground tabular-nums w-16 text-right shrink-0">
                        {playingId === clone.id
                          ? `${formatTime(currentTime)} / ${formatTime(duration)}`
                          : '0:00'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/artist-profiles')} className="gap-1.5">
                    <Music className="h-3.5 w-3.5" /> {vc('useInProfile')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{vc('deleteTitle', { name: clone.name })}</AlertDialogTitle>
                        <AlertDialogDescription>{vc('deleteDesc')}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{vc('deleteCancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(clone)}>{vc('deleteConfirm')}</AlertDialogAction>
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

export default VoiceCloningPage;
