import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sparkles, Shield, Megaphone, ChevronDown,
  Loader2, CheckCircle2, Play, Pause,
  Music2, FileUp, AlertTriangle, Rocket,
  ArrowRight, Key, RefreshCw, Link as LinkIcon,
  Share2, Plus, Trash2,
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { FEATURE_COSTS } from '@/lib/featureCosts'
import {
  registerWork, listIbsSignatures, createIbsSignature,
  syncIbsSignatures, submitPromotionRequest,
} from '@/services/dashboardApi'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { IbsSignature } from '@/types/dashboard'
import {
  CREATOR_ROLES, WORK_TYPES as WIZARD_WORK_TYPES, type Creator,
} from '@/components/dashboard/register/types'

// ── Géneros musicales ──────────────────────────────────────────────
const GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz',
  'Reggaeton', 'Latin', 'Trap', 'Indie', 'Otro',
]

// ── Moods ──────────────────────────────────────────────────────────
const MOODS = [
  'Enérgico', 'Relajado', 'Romántico', 'Épico',
  'Melancólico', 'Festivo', 'Oscuro', 'Positivo',
]

// ── Step header colapsado/expandido ───────────────────────────────
function StepHeader({
  number, icon: Icon, iconColor, label, sublabel,
  isActive, isDone, onClick,
}: {
  number: number
  icon: React.ElementType
  iconColor: string
  label: string
  sublabel: string
  isActive: boolean
  isDone: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 text-left hover:bg-muted/30 transition-colors"
    >
      {/* Número / check */}
      <div className="shrink-0">
        {isDone && !isActive
          ? <CheckCircle2 className="h-7 w-7 text-emerald-500" />
          : (
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              isActive
                ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white'
                : 'bg-muted text-muted-foreground'
            }`}>
              {number}
            </span>
          )
        }
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-xs font-bold uppercase tracking-wider ${
            isActive ? 'text-primary' : 'text-muted-foreground'
          }`}>
            Paso {number}
          </span>
          <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        </div>
        <p className="text-sm font-semibold">
          {label}
        </p>
        <p className="text-sm text-muted-foreground leading-snug mt-0.5">
          {sublabel}
        </p>
      </div>

      {/* Indicador */}
      {isDone && !isActive && (
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
          ✓ Hecho
        </Badge>
      )}
      {isActive && (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════
export function FirstHitFlow() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const { hasEnough } = useCredits()

  // Paso activo: 1 | 2 | 3 | 'done'
  const [activeStep, setActiveStep]   = useState<1 | 2 | 3 | 'done'>(1)
  const [doneSteps,  setDoneSteps]    = useState<Set<number>>(new Set())

  const markDone = (step: number) => {
    setDoneSteps(prev => new Set([...prev, step]))
  }

  // ── PASO 1: IA generativa ──────────────────────────────────────
  const [prompt,        setPrompt]        = useState('')
  const [genre,         setGenre]         = useState('')
  const [mood,          setMood]          = useState('')
  const [duration,      setDuration]      = useState(30)
  const [generating,    setGenerating]    = useState(false)
  const [audioUrl,      setAudioUrl]      = useState<string | null>(null)
  const [audioTitle,    setAudioTitle]    = useState('')
  const [playing,       setPlaying]       = useState(false)
  const [genError,      setGenError]      = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Describe el estilo de tu canción')
      return
    }
    if (!hasEnough(FEATURE_COSTS.generate_audio)) {
      toast.error('No tienes créditos suficientes para generar audio')
      return
    }
    setGenerating(true)
    setGenError(null)
    try {
      // Gastar crédito
      const { data: spend, error: spendErr } = await supabase.functions.invoke(
        'spend-credits',
        { body: { feature: 'generate_audio', description: `Audio AI: ${prompt.slice(0, 80)}` } }
      )
      if (spendErr || spend?.error) throw new Error(spend?.message || 'Error al gastar créditos')

      // Construir prompt completo
      let fullPrompt = prompt
      if (genre) fullPrompt += `, género ${genre}`
      if (mood)  fullPrompt += `, mood ${mood}`

      const { data, error } = await supabase.functions.invoke('generate-audio', {
        body: { prompt: fullPrompt, duration, cfgScale: 7 },
      })
      if (error || data?.error === 'rate_limit_exceeded') {
        throw new Error(data?.message || error?.message || 'Error al generar')
      }
      if (data?.audio) {
        const url = `data:${data.format || 'audio/mpeg'};base64,${data.audio}`
        setAudioUrl(url)
        setAudioTitle(prompt.slice(0, 50))
        toast.success('¡Audio generado! Escúchalo y si te gusta, regístralo.')
      }
    } catch (err: any) {
      setGenError(err.message || 'Error al generar el audio')
    }
    setGenerating(false)
  }

  const togglePlay = () => {
    if (!audioUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl)
      audioRef.current.onended = () => setPlaying(false)
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const handleStep1Next = () => {
    markDone(1)
    setActiveStep(2)
  }

  // ── PASO 2: Registro ──────────────────────────────────────────
  const [regTitle,   setRegTitle]   = useState('')
  const [regAuthor,  setRegAuthor]  = useState('')
  const [regDesc,    setRegDesc]    = useState('')
  const [regType,    setRegType]    = useState('audio')
  const [regFile,    setRegFile]    = useState<File | null>(null)
  const [ownership,  setOwnership]  = useState(false)
  const [registering, setRegistering] = useState(false)
  const [regDone,    setRegDone]    = useState(false)
  const [regId,      setRegId]      = useState<string | null>(null)
  const [regError,   setRegError]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // Firmas iBS
  const [signatures,  setSignatures]  = useState<IbsSignature[]>([])
  const [selectedSig, setSelectedSig] = useState('')
  const [loadingSigs, setLoadingSigs] = useState(false)
  const [newSigName,  setNewSigName]  = useState('')
  const [creatingSig, setCreatingSig] = useState(false)
  const [kycUrl,      setKycUrl]      = useState<string | null>(null)

  // Creadores
  const [creators, setCreators] = useState<Creator[]>([{
    id: crypto.randomUUID(),
    name: '',
    email: '',
    roles: [],
    percentage: null,
  }])

  // Pre-rellenar título desde la IA
  useEffect(() => {
    if (audioTitle && !regTitle) setRegTitle(audioTitle)
  }, [audioTitle])

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('display_name').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data?.display_name) {
            setRegAuthor(data.display_name)
            setCreators(prev => prev.map((c, i) =>
              i === 0 ? { ...c, name: data.display_name! } : c
            ))
          }
        })
    }
  }, [user])

  const updateCreator = (id: string, patch: Partial<Creator>) => {
    setCreators(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  const toggleCreatorRole = (id: string, role: string) => {
    const c = creators.find(x => x.id === id)
    if (!c) return
    const roles = c.roles.includes(role)
      ? c.roles.filter(r => r !== role)
      : [...c.roles, role]
    updateCreator(id, { roles })
  }

  const addCreator = () => {
    setCreators(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '', email: '', roles: [], percentage: null,
    }])
  }

  const removeCreator = (id: string) => {
    if (creators.length <= 1) return
    setCreators(prev => prev.filter(c => c.id !== id))
  }

  const usesPercentages = creators.some(c => c.percentage !== null && c.percentage > 0)
  const totalPct = creators.reduce((sum, c) => sum + (c.percentage ?? 0), 0)
  const pctValid = !usesPercentages || totalPct === 100

  const creatorsValid = creators.length >= 1 &&
    creators.every(c => c.name.trim() && c.roles.length > 0) &&
    pctValid

  const loadSigs = async () => {
    setLoadingSigs(true)
    try {
      await syncIbsSignatures()
      const sigs = await listIbsSignatures()
      setSignatures(sigs)
      const active = sigs.find((s: IbsSignature) => s.status === 'success')
      if (active) setSelectedSig(active.ibs_signature_id)
    } catch {}
    setLoadingSigs(false)
  }

  useEffect(() => {
    if (activeStep === 2) loadSigs()
  }, [activeStep])

  const handleCreateSig = async () => {
    if (!newSigName.trim()) return
    setCreatingSig(true)
    try {
      const res = await createIbsSignature(newSigName.trim())
      if (res.kycUrl) setKycUrl(res.kycUrl)
      await loadSigs()
    } catch {}
    setCreatingSig(false)
  }

  const convertToFile = async (url: string): Promise<File | null> => {
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      return new File([blob], `ai-${Date.now()}.mp3`, { type: 'audio/mpeg' })
    } catch { return null }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    let uploadFile = regFile
    if (!uploadFile && audioUrl) {
      setRegistering(true)
      uploadFile = await convertToFile(audioUrl)
      if (!uploadFile) { setRegError('Error al procesar el audio'); setRegistering(false); return }
    }
    if (!uploadFile || !selectedSig) return
    setRegistering(true)
    setRegError(null)
    try {
      const res = await registerWork({
        title: regTitle, type: regType as any,
        author: regAuthor, description: regDesc,
        file: uploadFile, ownershipDeclaration: ownership,
        signatureId: selectedSig,
        creators,
      })
      if (res.ibsError || res.status === 'failed') {
        setRegError(res.ibsError || 'Error en el registro')
      } else {
        setRegId(res.registrationId)
        setRegDone(true)
        markDone(2)
        toast.success('¡Obra registrada en blockchain!')
        setTimeout(() => setActiveStep(3), 1500)
      }
    } catch (err: any) {
      setRegError(err.message || 'Error al registrar')
    }
    setRegistering(false)
  }

  // ── PASO 3: Promoción ─────────────────────────────────────────
  const [promoArtist,  setPromoArtist]  = useState('')
  const [promoLink,    setPromoLink]    = useState('')
  const [promoDesc,    setPromoDesc]    = useState('')
  const [promoGoal,    setPromoGoal]    = useState('')
  const [promoSocial,  setPromoSocial]  = useState('')
  const [promoConsent, setPromoConsent] = useState(false)
  const [promoting,    setPromoting]    = useState(false)
  const [skipWarning,  setSkipWarning]  = useState(false)

  useEffect(() => {
    if (activeStep === 3 && regAuthor) setPromoArtist(regAuthor)
    if (activeStep === 3 && regTitle)  {
      setPromoDesc(`Mi nueva canción: ${regTitle}`)
    }
  }, [activeStep])

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    setPromoting(true)
    try {
      await submitPromotionRequest({
        artistName: promoArtist, mainLink: promoLink,
        workTitle: regTitle || promoDesc, description: promoDesc,
        promotionGoal: promoGoal, socialNetworks: promoSocial,
        consent: promoConsent,
      })
      markDone(3)
      setActiveStep('done')
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar la solicitud')
    }
    setPromoting(false)
  }

  // ══ PANTALLA FINAL ════════════════════════════════════════════
  if (activeStep === 'done') {
    return (
      <div className="flex items-center justify-center min-h-[70vh] px-4">
        <div className="max-w-lg w-full text-center space-y-8">
          {/* Icono celebración */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 ring-2 ring-violet-500/30">
                <Rocket className="h-10 w-10 text-violet-400" />
              </div>
              <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-background">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Mensaje */}
          <div className="space-y-3">
            <h2 className="text-2xl font-bold tracking-tight">
              ¡Felicidades! ¡Lo has conseguido! 🎵🚀
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tu canción está protegida y lista para sonar.
              <br /><br />
              En <strong>2–3 días</strong> tu canción aterrizará frente a{' '}
              <strong>+100.000 fans</strong> que están a punto de descubrirte. 😎
            </p>
          </div>

          {/* Siguiente nivel */}
          <div className="rounded-xl border border-border/40 bg-muted/30 p-5 text-left space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Share2 className="h-4 w-4 text-violet-400" />
              <p>Siguiente nivel: distribución profesional</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Publica en <strong>+220 plataformas</strong> — Spotify,
              Apple Music, Amazon Music y más. Tú te quedas el{' '}
              <strong>95% de los royalties</strong>.
            </p>
            <p className="text-[11px] text-muted-foreground/70">
              ⏱ La aprobación puede tardar hasta 7 días.
              Sin sorpresas.
            </p>
            <Button
              variant="hero"
              className="w-full"
              onClick={() => window.open('https://dist.musicdibs.com/', '_blank', 'noopener')}
            >
              Distribuir en +220 plataformas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/dashboard')}
          >
            Ir a mi panel →
          </Button>
        </div>
      </div>
    )
  }

  // ══ WIZARD ════════════════════════════════════════════════════
  const activeSignatures = signatures.filter(
    (s: IbsSignature) => s.status === 'success'
  )

  return (
    <div className="flex items-center justify-center min-h-[70vh] px-4">
      <div className="max-w-2xl w-full space-y-6">

        {/* Hero */}
        <div className="text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400 ring-1 ring-violet-500/20">
            <Sparkles className="h-3 w-3" />
            PARA ARTISTAS INDEPENDIENTES
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
            ¡Lanza ya tu primera{' '}
            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              canción
            </span>
            {' '}al mundo!
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Sigue los 3 pasos. Cada uno desbloquea el siguiente.
          </p>
        </div>

        {/* ══ PASO 1 ══════════════════════════════════════════════ */}
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
          activeStep === 1
            ? 'border-violet-500/40 shadow-lg shadow-violet-500/5'
            : doneSteps.has(1)
              ? 'border-emerald-500/30'
              : 'border-border/40'
        }`}>
          <StepHeader
            number={1} icon={Sparkles} iconColor="text-violet-400"
            label="Crea tu canción"
            sublabel="¿Aún no tienes canciones? Pierde el miedo y crea tu primer tema con nuestra IA."
            isActive={activeStep === 1}
            isDone={doneSteps.has(1)}
            onClick={() => !doneSteps.has(1) && setActiveStep(1)}
          />

          {activeStep === 1 && (
            <div className="px-5 pb-6 border-t border-border/40 pt-4 space-y-4">
              {/* Prompt */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Describe tu canción y/o pega tu letra y describe el estilo
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="Ej: canción pop energética sobre el verano, con guitarra acústica y voz femenina..."
                  className="text-sm min-h-[80px] resize-none"
                  maxLength={300}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {prompt.length}/300
                </p>
              </div>

              {/* Género + Mood */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Género (opcional)
                  </Label>
                  <Select value={genre} onValueChange={setGenre}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Género" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map(g => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Mood (opcional)
                  </Label>
                  <Select value={mood} onValueChange={setMood}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Mood" />
                    </SelectTrigger>
                    <SelectContent>
                      {MOODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Duración */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Duración: {duration}s
                </Label>
                <input
                  type="range" min={5} max={90} step={5}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>5s</span><span>90s</span>
                </div>
              </div>

              {/* Error */}
              {genError && (
                <p className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />{genError}
                </p>
              )}

              {/* Preview */}
              {audioUrl && (
                <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="h-10 w-10 rounded-full bg-violet-500 flex items-center justify-center shrink-0 hover:bg-violet-600 transition-colors"
                  >
                    {playing
                      ? <Pause className="h-4 w-4 text-white" />
                      : <Play  className="h-4 w-4 text-white ml-0.5" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{audioTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      Audio generado con IA · {duration}s
                    </p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <Button
                  className="flex-1 gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700"
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                >
                  {generating
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Generando…</>
                    : <><Sparkles className="h-4 w-4" />Generar con IA</>
                  }
                </Button>
                <Button
                  variant="outline" className="flex-1 gap-2"
                  onClick={handleStep1Next}
                >
                  <Music2 className="h-4 w-4" />
                  Ya tengo mi canción — Registrar →
                </Button>
              </div>

              {audioUrl && (
                <Button className="w-full gap-2" onClick={handleStep1Next}>
                  Me gusta — Registrar esta canción →
                </Button>
              )}
            </div>
          )}
        </div>

        {/* ══ PASO 2 ══════════════════════════════════════════════ */}
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
          activeStep === 2
            ? 'border-blue-500/40 shadow-lg shadow-blue-500/5'
            : doneSteps.has(2)
              ? 'border-emerald-500/30'
              : 'border-border/40'
        }`}>
          <StepHeader
            number={2} icon={Shield} iconColor="text-blue-400"
            label="Registra tu canción"
            sublabel="¿Ya tienes una canción? ¡Regístrala para que no te la plagien!"
            isActive={activeStep === 2}
            isDone={doneSteps.has(1) || doneSteps.has(2)}
            onClick={() => !doneSteps.has(2) && setActiveStep(2)}
          />

          {activeStep === 2 && (
            <div className="px-5 pb-6 border-t border-border/40 pt-4">
              {/* Advertencia si no viene del paso 1 con audio */}
              {!audioUrl && !regFile && (
                <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Sin registro no hay protección.</strong>{' '}
                    Antes de promocionar tu canción, regístrala aquí.
                    Así tienes prueba legal de que eres el creador original.
                  </span>
                </div>
              )}

              {regDone ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  </div>
                  <p className="font-semibold">¡Obra registrada en blockchain!</p>
                  <p className="text-sm text-muted-foreground">
                    Pasando al paso 3…
                  </p>
                </div>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  {/* Firma iBS */}
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Key className="h-3 w-3" />
                      Identidad digital (firma)
                    </Label>
                    {loadingSigs ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Cargando firmas…
                      </div>
                    ) : activeSignatures.length > 0 ? (
                      <Select value={selectedSig} onValueChange={setSelectedSig}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar firma" />
                        </SelectTrigger>
                        <SelectContent>
                          {activeSignatures.map((s: IbsSignature) => (
                            <SelectItem key={s.ibs_signature_id} value={s.ibs_signature_id}>
                              {s.signature_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="space-y-2 p-3 rounded-xl border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10">
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Necesitas una identidad digital para firmar tu obra.
                        </p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Tu nombre artístico"
                            value={newSigName}
                            onChange={e => setNewSigName(e.target.value)}
                            className="h-8 text-xs flex-1"
                          />
                          <Button type="button" size="sm" className="h-8 text-xs"
                            disabled={creatingSig || !newSigName.trim()}
                            onClick={handleCreateSig}>
                            {creatingSig
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : 'Crear'
                            }
                          </Button>
                        </div>
                        {kycUrl && (
                          <a href={kycUrl} target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-xs text-primary hover:underline">
                            <LinkIcon className="h-3 w-3" />
                            Completar verificación KYC
                          </a>
                        )}
                        {signatures.filter(
                          (s: IbsSignature) => s.status === 'pending'
                        ).length > 0 && (
                          <Button type="button" variant="ghost" size="sm"
                            className="h-7 text-xs" onClick={loadSigs}>
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Actualizar estado
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Título */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Título de la obra
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input value={regTitle}
                      onChange={e => setRegTitle(e.target.value)}
                      required className="h-9 text-sm"
                      placeholder="Nombre de tu canción" />
                  </div>

                  {/* Tipo + Autor en fila */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo de obra</Label>
                      <Select value={regType} onValueChange={setRegType}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WIZARD_WORK_TYPES.map(t => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Autor / titular</Label>
                      <Input value={regAuthor}
                        onChange={e => setRegAuthor(e.target.value)}
                        required className="h-9 text-sm"
                        placeholder="Tu nombre" />
                    </div>
                  </div>

                  {/* Descripción */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Descripción
                      <span className="text-muted-foreground ml-1">(opcional)</span>
                    </Label>
                    <Textarea value={regDesc}
                      onChange={e => setRegDesc(e.target.value)}
                      rows={2} className="text-sm resize-none" />
                  </div>

                  {/* ── Creadores ────────────────────────────────────── */}
                  <div className="space-y-3 pt-2">
                    <Label className="text-xs font-semibold">
                      Creadores de la obra
                    </Label>

                    <div className="space-y-3">
                      {creators.map((c, idx) => (
                        <Card key={c.id} className="border-border/40">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-muted-foreground">
                                Creador {idx + 1}
                              </p>
                              {creators.length > 1 && (
                                <Button variant="ghost" size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeCreator(c.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Nombre completo
                                  <span className="text-destructive ml-1">*</span>
                                </Label>
                                <Input value={c.name}
                                  onChange={e => updateCreator(c.id, { name: e.target.value })}
                                  placeholder="Nombre del creador"
                                  className="h-9 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">
                                  Email
                                  <span className="text-muted-foreground ml-1">(opcional)</span>
                                </Label>
                                <Input value={c.email}
                                  onChange={e => updateCreator(c.id, { email: e.target.value })}
                                  placeholder="email@ejemplo.com"
                                  className="h-9 text-sm" type="email" />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <Label className="text-xs">
                                Roles
                                <span className="text-destructive ml-1">*</span>
                              </Label>
                              <div className="flex flex-wrap gap-1.5">
                                {CREATOR_ROLES.map(r => (
                                  <Badge key={r.value}
                                    variant={c.roles.includes(r.value) ? 'default' : 'outline'}
                                    className={cn(
                                      'cursor-pointer text-xs transition-colors',
                                      c.roles.includes(r.value) && 'bg-primary hover:bg-primary/90'
                                    )}
                                    onClick={() => toggleCreatorRole(c.id, r.value)}>
                                    {r.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <Label className="text-xs">
                                % de derechos
                                <span className="text-muted-foreground ml-1">(opcional)</span>
                              </Label>
                              <Input type="number" min={0} max={100}
                                value={c.percentage ?? ''}
                                onChange={e => updateCreator(c.id, {
                                  percentage: e.target.value ? Number(e.target.value) : null
                                })}
                                placeholder="Ej: 50"
                                className="h-9 text-sm w-28" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Añadir creador + total % */}
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="outline" size="sm" onClick={addCreator}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Añadir creador
                      </Button>
                      {usesPercentages && (
                        <p className={cn('text-sm font-medium',
                          totalPct === 100 ? 'text-emerald-600' : 'text-amber-600')}>
                          Total derechos: {totalPct}%
                        </p>
                      )}
                    </div>

                    {usesPercentages && totalPct !== 100 && (
                      <p className="text-xs text-destructive">
                        Los porcentajes deben sumar 100%.
                      </p>
                    )}
                  </div>

                  {/* Archivo */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Archivo de la obra</Label>
                    {audioUrl && !regFile ? (
                      <div className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3">
                        <Music2 className="h-4 w-4 text-violet-400" />
                        <span className="text-xs flex-1 truncate">
                          Audio generado con IA (listo para registrar)
                        </span>
                        <button type="button"
                          className="text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => fileRef.current?.click()}>
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div
                        className="flex items-center gap-2 rounded-xl border border-dashed border-border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => fileRef.current?.click()}
                      >
                        <FileUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground truncate">
                          {regFile ? regFile.name : 'Seleccionar archivo'}
                        </span>
                      </div>
                    )}
                    <input ref={fileRef} type="file" className="hidden"
                      onChange={e => setRegFile(e.target.files?.[0] || null)} />
                  </div>

                  {/* Ownership */}
                  <div className="flex items-start gap-2">
                    <Checkbox id="own" checked={ownership}
                      onCheckedChange={v => setOwnership(!!v)} />
                    <Label htmlFor="own"
                      className="text-xs leading-tight cursor-pointer">
                      Declaro ser el titular legítimo de esta obra
                    </Label>
                  </div>

                  {regError && (
                    <p className="text-xs text-destructive flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />{regError}
                    </p>
                  )}

                  <Button type="submit" className="w-full gap-2"
                    disabled={
                      registering || !ownership ||
                      (!regFile && !audioUrl) ||
                      !regType || !selectedSig || !regTitle
                    }>
                    {registering
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Registrando en blockchain…</>
                      : <><Shield className="h-4 w-4" />Registrar mi obra</>
                    }
                  </Button>

                  {/* Skip con advertencia */}
                  {!skipWarning ? (
                    <button type="button"
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                      onClick={() => setSkipWarning(true)}>
                      Saltar registro por ahora →
                    </button>
                  ) : (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                      <p className="text-xs text-destructive font-medium flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        ⚠️ Riesgo de plagio sin registro
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Si promocionas tu canción sin registrarla primero,
                        cualquier persona podría apropiarse de ella.
                        Sin registro no tienes prueba legal de autoría.
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 text-xs h-8"
                          onClick={() => setSkipWarning(false)}>
                          Registrar primero (recomendado)
                        </Button>
                        <Button variant="outline" size="sm"
                          className="flex-1 text-xs h-8 text-muted-foreground"
                          onClick={() => {
                            markDone(2)
                            setActiveStep(3)
                            setSkipWarning(false)
                          }}>
                          Saltar de todos modos
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          )}
        </div>

        {/* ══ PASO 3 ══════════════════════════════════════════════ */}
        <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
          activeStep === 3
            ? 'border-pink-500/40 shadow-lg shadow-pink-500/5'
            : doneSteps.has(3)
              ? 'border-emerald-500/30'
              : 'border-border/40'
        }`}>
          <StepHeader
            number={3} icon={Megaphone} iconColor="text-pink-400"
            label="Promociona tu canción"
            sublabel="¡Que se entere el mundo! Comparte con +100k seguidores (Instagram & TikTok) de nuestras redes sociales."
            isActive={activeStep === 3}
            isDone={doneSteps.has(2) || doneSteps.has(3)}
            onClick={() => !doneSteps.has(3) && setActiveStep(3)}
          />

          {activeStep === 3 && (
            <div className="px-5 pb-6 border-t border-border/40 pt-4">
              <div className="mb-4 space-y-1">
                <p className="text-sm font-medium">
                  Publicamos tu canción en nuestras redes sociales
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Más de <strong>100.000 seguidores reales</strong> entre
                  Instagram y TikTok — fans que buscan artistas como tú.
                  Tu música, delante de las personas correctas.
                </p>
              </div>

              <form onSubmit={handlePromote} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Nombre artístico
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input value={promoArtist}
                      onChange={e => setPromoArtist(e.target.value)}
                      required className="h-9 text-sm"
                      placeholder="Tu nombre artístico" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Link principal
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input value={promoLink}
                      onChange={e => setPromoLink(e.target.value)}
                      required type="url" className="h-9 text-sm"
                      placeholder="https://..." />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Sobre tu canción
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Textarea value={promoDesc}
                    onChange={e => setPromoDesc(e.target.value)}
                    required rows={2} className="text-sm resize-none"
                    placeholder="Cuéntanos de qué va tu canción y qué la hace especial" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Objetivo de la promoción
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input value={promoGoal}
                    onChange={e => setPromoGoal(e.target.value)}
                    required className="h-9 text-sm"
                    placeholder="Ganar seguidores, visibilidad, streams..." />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">
                    Tus redes sociales
                    <span className="text-muted-foreground ml-1">(opcional)</span>
                  </Label>
                  <Input value={promoSocial}
                    onChange={e => setPromoSocial(e.target.value)}
                    className="h-9 text-sm"
                    placeholder="@tuartista en Instagram, TikTok..." />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox id="promo-consent" checked={promoConsent}
                    onCheckedChange={v => setPromoConsent(!!v)} />
                  <Label htmlFor="promo-consent"
                    className="text-xs leading-tight cursor-pointer">
                    Confirmo que tengo los derechos sobre esta canción
                    y autorizo a MusicDibs a publicarla en sus redes sociales
                  </Label>
                </div>

                <Button type="submit" className="w-full gap-2"
                  disabled={promoting || !promoConsent || !promoArtist || !promoLink || !promoDesc || !promoGoal}>
                  {promoting
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Enviando solicitud…</>
                    : <><Megaphone className="h-4 w-4" />¡Quiero promocionarme!</>
                  }
                </Button>

                <button type="button"
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                  onClick={() => { markDone(3); setActiveStep('done') }}>
                  Saltar por ahora — ver pantalla final →
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Skip total */}
        <div className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => navigate('/dashboard')}
          >
            Ya tengo obras — ir directamente al panel
          </Button>
        </div>

      </div>
    </div>
  )
}
