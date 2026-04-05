import { useState, useRef, useEffect } from 'react';
import { FileDropzone } from '@/components/FileDropzone';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Download, Info, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PricingLink } from '@/components/dashboard/PricingPopup';

interface VoiceTranslatorProps {
  clones: any[];
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
];

export const VoiceTranslator = ({ clones }: VoiceTranslatorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const vc = (key: string, opts?: Record<string, unknown>) =>
    t(`dashboard.voiceCloning.translator.${key}`, opts);

  const [selectedVoice, setSelectedVoice] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [translating, setTranslating] = useState(false);
  const [translatedUrl, setTranslatedUrl] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('available_credits')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setUserCredits(data?.available_credits || 0));
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast({ title: vc('tooLarge'), description: vc('tooLargeDesc'), variant: 'destructive' });
      return;
    }

    setAudioFile(file);
    setTranslatedUrl(null);

    const audio = new Audio(URL.createObjectURL(file));
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration);
      if (dur > 300) {
        toast({ title: vc('tooLong'), description: vc('tooLongDesc'), variant: 'destructive' });
        setAudioFile(null);
        setAudioDuration(null);
      } else {
        setAudioDuration(dur);
      }
    };
  };

  const creditsNeeded = audioDuration ? Math.ceil(audioDuration / 60) * 2 : 0;

  const handleTranslate = async () => {
    if (!audioFile || !selectedVoice || !targetLang || !user) return;

    if (userCredits < creditsNeeded) {
      toast({
        title: vc('insufficientCredits'),
        description: vc('insufficientCreditsDesc', { needed: creditsNeeded, current: userCredits }),
        variant: 'destructive',
      });
      return;
    }

    setTranslating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('voice_id', selectedVoice);
      formData.append('target_lang', targetLang);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-cloned-voice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({ title: vc('translationError'), description: data.error || 'Unknown error', variant: 'destructive' });
        return;
      }

      const { data: urlData } = await supabase.storage
        .from('translated-vocals')
        .createSignedUrl(data.audio_path, 3600);

      setTranslatedUrl(urlData?.signedUrl || null);
      setUserCredits(prev => prev - creditsNeeded);

      const langName = SUPPORTED_LANGUAGES.find(l => l.code === targetLang)?.name || targetLang;
      toast({
        title: vc('translationSuccess'),
        description: vc('translationSuccessDesc', { lang: langName }),
      });
    } catch {
      toast({ title: vc('translationError'), description: vc('serverError'), variant: 'destructive' });
    } finally {
      setTranslating(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Voice Selection */}
      <div className="space-y-1.5">
        <Label>{vc('selectVoice')}</Label>
        <Select value={selectedVoice} onValueChange={setSelectedVoice}>
          <SelectTrigger>
            <SelectValue placeholder={vc('selectVoicePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {clones.map(clone => (
              <SelectItem key={clone.id} value={clone.elevenlabs_voice_id}>
                <span className="flex items-center gap-2">🎤 {clone.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>{vc('uploadAudio')}</Label>
        <FileDropzone
          fileType="audio"
          accept=".mp3,.wav,.m4a,audio/*"
          maxSize={50}
          currentFile={audioFile}
          onFileSelect={(file) => {
            handleFileChange({ target: { files: [file] } } as any);
          }}
          onRemove={() => {
            setAudioFile(null);
            setAudioDuration(null);
          }}
        />
      </div>

      {/* Target Language */}
      <div className="space-y-1.5">
        <Label>{vc('selectTargetLang')}</Label>
        <Select value={targetLang} onValueChange={setTargetLang}>
          <SelectTrigger>
            <SelectValue placeholder={vc('selectTargetLangPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map(lang => (
              <SelectItem key={lang.code} value={lang.code}>
                <span className="flex items-center gap-2">{lang.flag} {lang.name}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cost Info */}
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {vc('costInfo')}
        </AlertDescription>
      </Alert>

      {/* Translate Button */}
      <Button
        onClick={handleTranslate}
        disabled={!audioFile || !selectedVoice || !targetLang || translating}
        className="w-full gap-2"
      >
        {translating ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {vc('translatingBtn')}</>
        ) : (
          <><Sparkles className="h-4 w-4" /> {vc('translateBtn')}</>
        )}
      </Button>
      <PricingLink className="block text-center mt-1" />

      {/* Download Translated */}
      {translatedUrl && (
        <a href={translatedUrl} download className="block">
          <Button variant="outline" className="w-full gap-2">
            <Download className="h-4 w-4" />
            {vc('downloadTranslated')}
          </Button>
        </a>
      )}
    </div>
  );
};
