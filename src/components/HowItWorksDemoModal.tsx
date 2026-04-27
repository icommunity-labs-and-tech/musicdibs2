import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Check,
  Music2,
  ShieldCheck,
  Rocket,
  Sparkles,
  Mic2,
  Upload,
  FileMusic,
  Hash,
  Link2,
  Globe2,
  Users,
  ChevronRight,
  SkipForward,
} from "lucide-react";

interface HowItWorksDemoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEP_DURATION_MS = 11333; // ~11.3s por paso → ~34s total
const FINAL_INDEX = 3;

export const HowItWorksDemoModal = ({ open, onOpenChange }: HowItWorksDemoModalProps) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language || "es";
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0..100 dentro del paso
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const copy = useMemo(() => getCopy(lang), [lang]);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setStepIndex(0);
      setProgress(0);
      startRef.current = performance.now();
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
  }, [open]);

  // Avance automático
  useEffect(() => {
    if (!open) return;
    if (stepIndex >= FINAL_INDEX) return;

    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(100, (elapsed / STEP_DURATION_MS) * 100);
      setProgress(pct);
      if (elapsed >= STEP_DURATION_MS) {
        setStepIndex((s) => s + 1);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, stepIndex]);

  const goToFinal = () => setStepIndex(FINAL_INDEX);
  const goRegister = () => {
    onOpenChange(false);
    navigate("/login?tab=register");
  };
  const goPlans = () => {
    onOpenChange(false);
    setTimeout(() => {
      document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl p-0 overflow-hidden border-0 bg-gradient-to-br from-[#1a0b2e] via-[#2a0f47] to-[#3b0764] text-white"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Glow decor */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-pink-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-16 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl" />

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-200">
              {copy.title}
            </h2>
            <p className="text-sm md:text-base text-white/70 mt-1">{copy.subtitle}</p>
          </div>

          {/* Stepper */}
          <div className="mt-5 flex items-center justify-center gap-2 md:gap-3">
            {[0, 1, 2].map((i) => {
              const active = stepIndex === i;
              const done = stepIndex > i || stepIndex === FINAL_INDEX;
              return (
                <div key={i} className="flex items-center gap-2 md:gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      done
                        ? "bg-green-400 text-green-950"
                        : active
                        ? "bg-pink-500 text-white ring-4 ring-pink-500/30"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                  </div>
                  {i < 2 && (
                    <div className="w-10 md:w-16 h-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-400 to-purple-400 transition-all duration-300"
                        style={{
                          width:
                            stepIndex > i || stepIndex === FINAL_INDEX
                              ? "100%"
                              : stepIndex === i
                              ? `${progress}%`
                              : "0%",
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="relative px-4 md:px-8 pb-6 min-h-[340px]">
          {stepIndex === 0 && <StepCreate copy={copy.step1} />}
          {stepIndex === 1 && <StepRegister copy={copy.step2} />}
          {stepIndex === 2 && <StepDistribute copy={copy.step3} />}
          {stepIndex === FINAL_INDEX && (
            <StepFinal copy={copy.final} onRegister={goRegister} onPlans={goPlans} />
          )}
        </div>

        {/* Footer controls */}
        {stepIndex < FINAL_INDEX && (
          <div className="relative flex items-center justify-between px-6 py-3 border-t border-white/10 bg-black/20">
            <button
              onClick={goToFinal}
              className="text-xs md:text-sm text-white/70 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              {copy.skip}
            </button>
            <button
              onClick={() => setStepIndex((s) => Math.min(FINAL_INDEX, s + 1))}
              className="text-xs md:text-sm text-white/80 hover:text-white inline-flex items-center gap-1 transition-colors"
            >
              {copy.next}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* -------------------- Step 1: Create -------------------- */
const StepCreate = ({ copy }: { copy: any }) => {
  const [typed, setTyped] = useState("");
  const fullText = copy.promptExample;
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setTyped("");
    setGenerating(false);
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(interval);
        setTimeout(() => setGenerating(true), 500);
        setTimeout(() => {
          setGenerating(false);
          setDone(true);
        }, 3200);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center">
          <Music2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{copy.title}</h3>
          <p className="text-xs text-white/60">{copy.text}</p>
        </div>
      </div>

      <div className="bg-white text-slate-900 rounded-xl p-4 shadow-2xl">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
          {copy.fieldLabel}
        </div>
        <div className="min-h-[60px] rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          {typed}
          <span className="inline-block w-1 h-4 align-middle bg-slate-700 ml-0.5 animate-pulse" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium inline-flex items-center gap-1">
            <Mic2 className="w-3 h-3" /> {copy.voicePop}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
            {copy.voiceUrban}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
            {copy.voiceIndie}
          </span>
        </div>

        <button
          className={`mt-4 w-full py-2.5 rounded-lg text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${
            generating
              ? "bg-purple-500"
              : done
              ? "bg-green-500"
              : "bg-gradient-to-r from-pink-500 to-purple-600"
          }`}
        >
          {generating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" /> {copy.generating}
            </>
          ) : done ? (
            <>
              <Check className="w-4 h-4" strokeWidth={3} /> {copy.generated}
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {copy.generateBtn}
            </>
          )}
        </button>

        <div className="mt-3 text-center text-xs text-slate-500 inline-flex items-center justify-center gap-1 w-full">
          <Upload className="w-3 h-3" />
          {copy.alreadyHave}
        </div>
      </div>
    </div>
  );
};

/* -------------------- Step 2: Register -------------------- */
const StepRegister = ({ copy }: { copy: any }) => {
  const [hashing, setHashing] = useState(true);
  const [hash, setHash] = useState("");
  const [certified, setCertified] = useState(false);

  useEffect(() => {
    setHashing(true);
    setHash("");
    setCertified(false);
    const chars = "0123456789abcdef";
    let i = 0;
    const interval = setInterval(() => {
      const random = Array.from({ length: 24 }, () => chars[Math.floor(Math.random() * 16)]).join("");
      setHash(random);
      i++;
      if (i > 45) {
        clearInterval(interval);
        setHash("a3f9c1d8e2b4f7a09c5b1e8d");
        setHashing(false);
        setTimeout(() => setCertified(true), 900);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{copy.title}</h3>
          <p className="text-xs text-white/60">{copy.text}</p>
        </div>
      </div>

      <div className="bg-white text-slate-900 rounded-xl p-4 shadow-2xl space-y-3">
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{copy.fTitle}</div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            {copy.songName}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{copy.fAuthor}</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              {copy.authorName}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{copy.fFile}</div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm inline-flex items-center gap-1">
              <FileMusic className="w-3.5 h-3.5 text-slate-500" /> empezar-de-nuevo.mp3
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-slate-900 text-green-300 font-mono text-xs p-3 flex items-center gap-2 overflow-hidden">
          <Hash className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {hashing ? `${copy.hashing} ${hash}` : `sha256: ${hash}…`}
          </span>
        </div>

        <div
          className={`rounded-lg p-3 flex items-center gap-2 text-sm font-semibold transition-all ${
            certified
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-slate-50 text-slate-500 border border-slate-200"
          }`}
        >
          <Link2 className={`w-4 h-4 ${certified ? "text-green-600" : "text-slate-400"}`} />
          {certified ? copy.certified : copy.certifying}
          {certified && <Check className="w-4 h-4 ml-auto text-green-600" strokeWidth={3} />}
        </div>

        <p className="text-[11px] text-slate-500 italic">{copy.disclaimer}</p>
      </div>
    </div>
  );
};

/* -------------------- Step 3: Distribute -------------------- */
const StepDistribute = ({ copy }: { copy: any }) => {
  const platforms = ["Spotify", "Apple Music", "YouTube", "Amazon Music", "Tidal", "Deezer"];
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const t = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center">
          <Rocket className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold">{copy.title}</h3>
          <p className="text-xs text-white/60">{copy.text}</p>
        </div>
      </div>

      <div className="bg-white text-slate-900 rounded-xl p-4 shadow-2xl space-y-3">
        <div className="flex flex-wrap gap-2">
          {platforms.map((p, idx) => (
            <span
              key={p}
              className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium animate-fade-in"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {p}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 p-3 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-purple-600" />
            <div>
              <div className="text-sm font-bold text-slate-900">+220</div>
              <div className="text-[11px] text-slate-600">{copy.platformsLabel}</div>
            </div>
          </div>
          <div className="rounded-lg bg-gradient-to-br from-pink-50 to-amber-50 border border-pink-100 p-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-pink-600" />
            <div>
              <div className="text-sm font-bold text-slate-900">+200k</div>
              <div className="text-[11px] text-slate-600">{copy.communityLabel}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">{copy.promoTitle}</div>
          <div className="text-sm text-slate-700">{copy.promoText}</div>
        </div>

        <div
          className={`rounded-lg p-3 flex items-center gap-2 text-sm font-semibold transition-all ${
            ready
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-slate-50 text-slate-500 border border-slate-200"
          }`}
        >
          <Rocket className={`w-4 h-4 ${ready ? "text-green-600" : "text-slate-400"}`} />
          {ready ? copy.ready : copy.preparing}
          {ready && <Check className="w-4 h-4 ml-auto text-green-600" strokeWidth={3} />}
        </div>
      </div>
    </div>
  );
};

/* -------------------- Final -------------------- */
const StepFinal = ({
  copy,
  onRegister,
  onPlans,
}: {
  copy: any;
  onRegister: () => void;
  onPlans: () => void;
}) => {
  return (
    <div className="animate-scale-in text-center py-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 mb-4 shadow-lg shadow-pink-500/30">
        <Rocket className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-2xl md:text-3xl font-bold mb-2">{copy.title}</h3>
      <p className="text-white/70 max-w-md mx-auto mb-6">{copy.text}</p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Button variant="hero" size="lg" className="font-semibold" onClick={onRegister}>
          {copy.ctaPrimary}
        </Button>
        <button
          onClick={onPlans}
          className="text-sm text-white/70 hover:text-white underline-offset-4 hover:underline"
        >
          {copy.ctaSecondary}
        </button>
      </div>
    </div>
  );
};

/* -------------------- Copy i18n -------------------- */
function getCopy(lang: string) {
  const dict: Record<string, any> = {
    es: {
      title: "Así funciona Musicdibs",
      subtitle: "De una idea a una canción lista para registrar, distribuir y promocionar.",
      skip: "Saltar al final",
      next: "Siguiente",
      step1: {
        title: "1. Crea tu canción. Si tienes ya, pasa al siguiente paso.",
        text: "",
        fieldLabel: "Describe tu canción",
        promptExample: "Canción pop latina sobre empezar de nuevo…",
        voicePop: "Voz Pop Latina",
        voiceUrban: "Urbano",
        voiceIndie: "Indie",
        generateBtn: "Generar con IA",
        generating: "Generando…",
        generated: "Canción generada",
        alreadyHave: "¿Ya tienes tu canción? Súbela y salta este paso.",
      },
      step2: {
        title: "2. Registro legal con blockchain. Antiplagio.",
        text: "",
        fTitle: "Título",
        fAuthor: "Autor",
        fFile: "Archivo",
        songName: "Empezar de nuevo",
        authorName: "Tu nombre artístico",
        hashing: "Calculando huella digital…",
        certifying: "Enviando a blockchain…",
        certified: "Registro certificado",
        disclaimer: "Certificación blockchain como evidencia verificable de autoría.",
      },
      step3: {
        title: "3. Distribuye y promociona",
        text: "",
        platformsLabel: "plataformas digitales",
        communityLabel: "fans en comunidad",
        promoTitle: "Promoción RRSS",
        promoText: "Difunde tu lanzamiento entre artistas y fans de la plataforma.",
        preparing: "Preparando lanzamiento…",
        ready: "Lanzamiento preparado",
      },
      final: {
        title: "Tu canción, lista para salir al mundo",
        text: "Crea, registra, distribuye y promociona tu música desde una sola plataforma.",
        ctaPrimary: "🚀 Crear cuenta gratis",
        ctaSecondary: "Ver planes",
      },
    },
    en: {
      title: "This is how Musicdibs works",
      subtitle: "From an idea to a song ready to register, distribute and promote.",
      skip: "Skip to end",
      next: "Next",
      step1: {
        title: "1. Create your song. If you already have one, skip to the next step.",
        text: "",
        fieldLabel: "Describe your song",
        promptExample: "Latin pop song about starting over…",
        voicePop: "Latin Pop Voice",
        voiceUrban: "Urban",
        voiceIndie: "Indie",
        generateBtn: "Generate with AI",
        generating: "Generating…",
        generated: "Song generated",
        alreadyHave: "Already have your song? Upload it and skip this step.",
      },
      step2: {
        title: "2. Legal registration with blockchain. Anti-plagiarism.",
        text: "",
        fTitle: "Title",
        fAuthor: "Author",
        fFile: "File",
        songName: "Starting Over",
        authorName: "Your artist name",
        hashing: "Computing digital fingerprint…",
        certifying: "Sending to blockchain…",
        certified: "Registration certified",
        disclaimer: "Blockchain certification as verifiable evidence of authorship.",
      },
      step3: {
        title: "3. Distribute & promote",
        text: "",
        platformsLabel: "digital platforms",
        communityLabel: "fans in community",
        promoTitle: "Social promotion",
        promoText: "Spread your release among platform artists and fans.",
        preparing: "Preparing release…",
        ready: "Release ready",
      },
      final: {
        title: "Your song, ready to take on the world",
        text: "Create, register, distribute and promote your music from a single platform.",
        ctaPrimary: "🚀 Create free account",
        ctaSecondary: "See plans",
      },
    },
    pt: {
      title: "Assim funciona o Musicdibs",
      subtitle: "De uma ideia a uma canção pronta para registrar, distribuir e promover.",
      skip: "Pular para o final",
      next: "Seguinte",
      step1: {
        title: "1. Crie sua canção. Se já tiver uma, passe ao próximo passo.",
        text: "",
        fieldLabel: "Descreva sua canção",
        promptExample: "Canção pop latina sobre recomeçar…",
        voicePop: "Voz Pop Latina",
        voiceUrban: "Urbano",
        voiceIndie: "Indie",
        generateBtn: "Gerar com IA",
        generating: "Gerando…",
        generated: "Canção gerada",
        alreadyHave: "Já tem sua canção? Envie e pule este passo.",
      },
      step2: {
        title: "2. Registro legal com blockchain. Antiplágio.",
        text: "",
        fTitle: "Título",
        fAuthor: "Autor",
        fFile: "Arquivo",
        songName: "Recomeçar",
        authorName: "Seu nome artístico",
        hashing: "Calculando impressão digital…",
        certifying: "Enviando para blockchain…",
        certified: "Registro certificado",
        disclaimer: "Certificação blockchain como evidência verificável de autoria.",
      },
      step3: {
        title: "3. Distribua e promova",
        text: "",
        platformsLabel: "plataformas digitais",
        communityLabel: "fãs na comunidade",
        promoTitle: "Promoção em redes",
        promoText: "Divulgue seu lançamento entre artistas e fãs da plataforma.",
        preparing: "Preparando lançamento…",
        ready: "Lançamento pronto",
      },
      final: {
        title: "Sua canção, pronta para o mundo",
        text: "Crie, registre, distribua e promova sua música em uma única plataforma.",
        ctaPrimary: "🚀 Criar conta grátis",
        ctaSecondary: "Ver planos",
      },
    },
  };
  return dict[lang] || dict.es;
}
