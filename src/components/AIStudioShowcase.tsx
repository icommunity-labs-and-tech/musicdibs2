import { useEffect, useRef, useState } from "react";
import { Pause, Play, Sparkles, Music, Upload, Wand2, ShieldCheck, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";

interface DemoSong {
  title: string;
  tag: string;
  subtitle: string;
  colors: [string, string]; // tailwind from / to
  glow: string; // tailwind shadow color class
  audioUrl?: string;
}

const DEMO_SONGS: DemoSong[] = [
  {
    title: "Midnight Drive",
    tag: "Lo-Fi",
    subtitle: "Lo-fi hip hop · nostálgico y soñador",
    colors: ["from-purple-500", "to-fuchsia-500"],
    glow: "shadow-purple-500/30",
    audioUrl: "/audio/midnight-drive.mp3",
  },
  {
    title: "Fuego Latino",
    tag: "Reggaeton",
    subtitle: "Reggaeton urbano · energético & bailable",
    colors: ["from-orange-400", "to-pink-500"],
    glow: "shadow-pink-500/30",
    audioUrl: "/audio/fuego-latino.mp3",
  },
  {
    title: "Turn It Up",
    tag: "EDM",
    subtitle: "Dance electrónico · oscuro e hipnótico",
    colors: ["from-cyan-400", "to-blue-500"],
    glow: "shadow-cyan-500/30",
    audioUrl: "/audio/turn-it-up.mp3",
  },
  {
    title: "Alma Libre",
    tag: "Indie Folk",
    subtitle: "Indie folk · acústico y emotivo",
    colors: ["from-amber-300", "to-rose-400"],
    glow: "shadow-amber-400/30",
    audioUrl: "/audio/alma-libre.mp3",
  },
  {
    title: "No Sleep Tonight",
    tag: "R&B",
    subtitle: "R&B pop · suave y sensual",
    colors: ["from-fuchsia-500", "to-violet-600"],
    glow: "shadow-fuchsia-500/30",
    audioUrl: "/audio/no-sleep-tonight.mp3",
  },
  {
    title: "Trap God",
    tag: "Hip Hop",
    subtitle: "Hip hop trap · duro y cinematográfico",
    colors: ["from-blue-500", "to-purple-700"],
    glow: "shadow-blue-500/30",
    audioUrl: "/audio/trap-god.mp3",
  },
];

type Step = {
  n: string;
  title: string;
  desc: string;
  time: string;
  icon: LucideIcon;
  pulse?: boolean;
};

const STEPS: Step[] = [
  {
    n: "01",
    title: "Crea o sube tu canción",
    desc: "Empieza desde una idea, una letra, una demo o un archivo propio.",
    time: "~1 MIN",
    icon: Upload,
  },
  {
    n: "02",
    title: "La IA crea o mejora tu canción",
    desc: "Genera música nueva, mejora tu sonido, masteriza o crea versiones listas para publicar.",
    time: "~2 MIN",
    icon: Wand2,
    pulse: true,
  },
  {
    n: "03",
    title: "Registra y protege tus derechos",
    desc: "Obtén una evidencia blockchain con fecha, autoría y certificado verificable.",
    time: "~1 MIN",
    icon: ShieldCheck,
  },
  {
    n: "04",
    title: "Distribuye y lanza al mundo",
    desc: "Publica en Spotify, Apple Music, YouTube, TikTok y más de 200 plataformas.",
    time: "~1 MIN",
    icon: Rocket,
  },
];

// Elegant continuous waveform — vertically centered bars forming a fluid silhouette
const Waveform = ({ from, to }: { from: string; to: string }) => {
  // 56 thin bars to simulate a continuous horizontal waveform
  const bars = Array.from({ length: 56 });
  return (
    <div className="relative flex items-center justify-between h-16 px-3 overflow-hidden">
      {bars.map((_, i) => {
        // Combine two sines for a more organic, musical envelope
        const envelope =
          (Math.sin(i * 0.35) * 0.55 + Math.sin(i * 0.9 + 1.3) * 0.35 + 1) / 2; // 0-1
        const baseH = 14 + envelope * 78; // 14% - 92%
        // Smooth, sequential delay across the bar to create a traveling wave feel
        const delay = (i / bars.length) * 1.6;
        return (
          <span
            key={i}
            className={`flex-1 mx-[1px] rounded-full bg-gradient-to-t ${from} ${to} animate-[wave_2.4s_ease-in-out_infinite]`}
            style={{
              height: `${baseH}%`,
              animationDelay: `${delay}s`,
              transformOrigin: "center",
              opacity: 0.85,
            }}
          />
        );
      })}
    </div>
  );
};

export const AIStudioShowcase = () => {
  const [playingTitle, setPlayingTitle] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const handlePlay = (song: DemoSong) => {
    if (!song.audioUrl) return;
    if (playingTitle === song.title) {
      audioRef.current?.pause();
      setPlayingTitle(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(song.audioUrl);
    audio.onended = () => setPlayingTitle(null);
    audio.play().catch(() => setPlayingTitle(null));
    audioRef.current = audio;
    setPlayingTitle(song.title);
  };

  return (
    <section
      className="relative overflow-hidden py-24"
      style={{
        background:
          "linear-gradient(180deg, #2a1747 0%, #2e1a4f 22%, #36205c 50%, #2c1a4d 78%, #251541 100%)",
      }}
    >
      {/* Inline keyframes for the waveform — kept local to avoid touching tailwind config */}
      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.55); }
          50% { transform: scaleY(1); }
        }
        .ai-card-glow::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 1rem;
          padding: 1px;
          background: linear-gradient(135deg, rgba(168,85,247,0.5), rgba(236,72,153,0.4), rgba(59,130,246,0.3));
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none;
          opacity: 0.6;
        }
        @keyframes flowProgress {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        @keyframes stepPulse {
          0%, 100% { box-shadow: 0 0 22px rgba(217,70,239,0.45), 0 0 40px rgba(168,85,247,0.25); }
          50% { box-shadow: 0 0 34px rgba(217,70,239,0.75), 0 0 60px rgba(168,85,247,0.45); }
        }
        @keyframes ringSpin {
          to { transform: rotate(360deg); }
        }
        .step-progress-line {
          background: linear-gradient(90deg,
            rgba(244,114,182,0) 0%,
            rgba(244,114,182,0.55) 18%,
            rgba(217,70,239,0.85) 38%,
            rgba(34,211,238,0.6) 55%,
            rgba(168,85,247,0.85) 75%,
            rgba(168,85,247,0) 100%);
          background-size: 200% 100%;
          animation: flowProgress 6s linear infinite;
        }
        .step-card:hover .step-icon-wrap {
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 0 32px rgba(217,70,239,0.55), 0 0 60px rgba(168,85,247,0.35);
        }
      `}</style>

      {/* Soft top fade to blend with the previous (light) section. Bottom intentionally left open to flow into the bridge + promo visuals block. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/12 via-white/4 to-transparent" />

      {/* Decorative ambient glow orbs (richer, premium violet palette) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-purple-500/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm mb-6 shadow-sm">
              <Sparkles className="w-5 h-5 text-fuchsia-300" />
              <span className="text-base md:text-lg font-semibold text-white/90 tracking-wide">
                AI Music Studio
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-5">
              Crea o mejora tu música con IA.{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                De la idea a Spotify
              </span>{" "}
              en minutos 🎵
            </h2>
            <p className="text-base md:text-lg text-white/75 leading-relaxed mb-8">
              Genera canciones completas, regístralas y distribúyelas en 200+
              plataformas. Todo en un solo lugar.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => {
                  document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white border-0 shadow-[0_0_40px_rgba(217,70,239,0.45)] hover:shadow-[0_0_55px_rgba(217,70,239,0.7)] hover:scale-105 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Crear mi canción
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* Demo cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-20">
          <StaggerGrid baseDelay={120} staggerDelay={90} scale>
            {DEMO_SONGS.map((song) => (
              <div
                key={song.title}
                className={`ai-card-glow group relative rounded-2xl bg-gradient-to-b from-purple-950/85 to-purple-900/75 backdrop-blur-md p-5 border border-white/15 hover:border-white/25 transition-all duration-300 hover:-translate-y-1 shadow-xl ${song.glow} hover:shadow-2xl`}
              >
                {/* Tag */}
                <div className="flex items-start justify-between mb-4">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-white/10 text-white/90 border border-white/15">
                    <Music className="w-3 h-3" />
                    {song.tag}
                  </span>
                </div>

                {/* Waveform */}
                <div className="rounded-xl bg-black/35 border border-white/5 mb-5 py-3">
                  <Waveform from={song.colors[0]} to={song.colors[1]} />
                </div>

                {/* Footer: title + play */}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-white font-semibold text-lg truncate">
                      {song.title}
                    </h3>
                    <p className="text-white/60 text-xs mt-0.5 truncate">
                      {song.subtitle}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePlay(song)}
                    aria-label={`${playingTitle === song.title ? "Pausar" : "Reproducir"} demo ${song.title}`}
                    disabled={!song.audioUrl}
                    className={`shrink-0 w-11 h-11 rounded-full bg-gradient-to-br ${song.colors[0]} ${song.colors[1]} flex items-center justify-center text-white shadow-lg ${song.glow} hover:scale-110 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    {playingTitle === song.title ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </StaggerGrid>
        </div>

        {/* Steps block */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-white leading-[1.1] mb-4">
              En menos de 10 minutos.{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                Tu canción al mundo.
              </span>
            </h3>
            <p className="text-base md:text-lg text-white/70 leading-relaxed">
            </p>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Animated horizontal progress line — desktop only */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-9 left-[8%] right-[8%] h-[2px] rounded-full step-progress-line opacity-90"
          />
          {/* Soft halo behind the line */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-7 left-[8%] right-[8%] h-[6px] rounded-full blur-md opacity-40"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(244,114,182,0.5), rgba(168,85,247,0.6), transparent)",
            }}
          />
          {/* Vertical timeline rail — mobile/tablet */}
          <div
            aria-hidden
            className="lg:hidden absolute top-4 bottom-4 left-[27px] sm:left-[35px] w-[2px] rounded-full opacity-70"
            style={{
              background:
                "linear-gradient(180deg, rgba(244,114,182,0.05), rgba(217,70,239,0.6) 20%, rgba(168,85,247,0.6) 80%, rgba(168,85,247,0.05))",
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-y-7 lg:gap-y-0 lg:gap-x-5">
            <StaggerGrid baseDelay={100} staggerDelay={120}>
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.n}
                    className="step-card group relative flex lg:flex-col items-start lg:items-center text-left lg:text-center gap-4 lg:gap-0 lg:px-3 pl-2 lg:pl-3 transition-transform duration-300"
                  >
                    {/* Numbered badge with icon */}
                    <div className="relative z-10 shrink-0 lg:mb-5">
                      <span
                        className="absolute inset-0 rounded-full blur-xl opacity-70"
                        style={{
                          background:
                            "radial-gradient(circle, rgba(217,70,239,0.6) 0%, rgba(168,85,247,0.28) 60%, transparent 80%)",
                        }}
                        aria-hidden
                      />
                      <div
                        className="step-icon-wrap relative w-[60px] h-[60px] lg:w-[68px] lg:h-[68px] rounded-full flex items-center justify-center bg-gradient-to-br from-[#1a0d2e] via-[#241241] to-[#2c1850] border border-white/20 shadow-[0_0_24px_rgba(217,70,239,0.4)] transition-all duration-300"
                        style={step.pulse ? { animation: "stepPulse 2.6s ease-in-out infinite" } : undefined}
                      >
                        <Icon className="w-6 h-6 lg:w-7 lg:h-7 text-fuchsia-200 drop-shadow-[0_0_6px_rgba(217,70,239,0.7)]" />
                        {/* Number chip */}
                        <span className="absolute -top-1.5 -right-1.5 min-w-[26px] h-[22px] px-1.5 rounded-full bg-gradient-to-br from-pink-500 to-fuchsia-600 border border-white/30 flex items-center justify-center text-[10px] font-bold text-white shadow-md">
                          {step.n}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 lg:flex lg:flex-col lg:items-center min-w-0">
                      <h4 className="text-white font-semibold text-[15px] md:text-[17px] mb-1.5 leading-tight lg:max-w-[230px]">
                        {step.title}
                      </h4>
                      <p className="text-white/65 text-sm leading-snug mb-2.5 lg:max-w-[240px]">
                        {step.desc}
                      </p>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-fuchsia-300/90">
                        <span className="w-1 h-1 rounded-full bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.9)]" />
                        {step.time}
                      </span>
                    </div>
                  </div>
                );
              })}
            </StaggerGrid>
          </div>
        </div>
      </div>
    </section>
  );
};
