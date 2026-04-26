import { Play, Sparkles, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";

interface DemoSong {
  title: string;
  tag: string;
  subtitle: string;
  colors: [string, string]; // tailwind from / to
  glow: string; // tailwind shadow color class
}

const DEMO_SONGS: DemoSong[] = [
  {
    title: "Midnight Drive",
    tag: "Lo-Fi",
    subtitle: "Lo-fi hip hop · nostálgico y soñador",
    colors: ["from-purple-500", "to-fuchsia-500"],
    glow: "shadow-purple-500/30",
  },
  {
    title: "Fuego Latino",
    tag: "Reggaeton",
    subtitle: "Reggaeton urbano · energético & bailable",
    colors: ["from-orange-400", "to-pink-500"],
    glow: "shadow-pink-500/30",
  },
  {
    title: "Neon Pulse",
    tag: "EDM",
    subtitle: "Dance electrónico · oscuro e hipnótico",
    colors: ["from-cyan-400", "to-blue-500"],
    glow: "shadow-cyan-500/30",
  },
  {
    title: "Alma Libre",
    tag: "Indie Folk",
    subtitle: "Indie folk · acústico y emotivo",
    colors: ["from-amber-300", "to-rose-400"],
    glow: "shadow-amber-400/30",
  },
  {
    title: "City Lights",
    tag: "R&B",
    subtitle: "R&B pop · suave y sensual",
    colors: ["from-fuchsia-500", "to-violet-600"],
    glow: "shadow-fuchsia-500/30",
  },
  {
    title: "Trap God",
    tag: "Hip Hop",
    subtitle: "Hip hop trap · duro y cinematográfico",
    colors: ["from-blue-500", "to-purple-700"],
    glow: "shadow-blue-500/30",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Describe tu idea",
    desc: "género, mood, tempo, vibra… en palabras simples",
    time: "~1 MIN",
  },
  {
    n: "02",
    title: "La IA genera tu canción",
    desc: "track completo con melodía, letra y producción",
    time: "~2 MIN",
  },
  {
    n: "03",
    title: "Registra tus derechos",
    desc: "certificado blockchain con validez legal",
    time: "~1 MIN",
  },
  {
    n: "04",
    title: "Distribuye al mundo",
    desc: "Spotify, Apple Music, YouTube y 200+ plataformas",
    time: "~1 MIN",
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
                    aria-label={`Reproducir demo ${song.title}`}
                    className={`shrink-0 w-11 h-11 rounded-full bg-gradient-to-br ${song.colors[0]} ${song.colors[1]} flex items-center justify-center text-white shadow-lg ${song.glow} hover:scale-110 active:scale-95 transition-transform`}
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </StaggerGrid>
        </div>

        {/* Steps block */}
        <ScrollReveal>
          <div className="text-center mb-10">
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              En menos de 10 minutos.{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                Tu canción al mundo
              </span>
            </h3>
          </div>
        </ScrollReveal>

        <div className="relative">
          {/* Horizontal connecting line — desktop only */}
          <div
            aria-hidden
            className="hidden lg:block absolute top-6 left-0 right-0 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(244,114,182,0.35) 12%, rgba(217,70,239,0.45) 50%, rgba(168,85,247,0.35) 88%, transparent 100%)",
            }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 lg:gap-x-6">
            <StaggerGrid baseDelay={100} staggerDelay={120}>
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="relative flex flex-col items-center text-center px-3"
                >
                  {/* Numbered badge */}
                  <div className="relative z-10 mb-5">
                    <span
                      className="absolute inset-0 rounded-full blur-xl opacity-70"
                      style={{
                        background:
                          "radial-gradient(circle, rgba(217,70,239,0.55) 0%, rgba(168,85,247,0.25) 60%, transparent 80%)",
                      }}
                      aria-hidden
                    />
                    <div className="relative w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-[#1d0f33] to-[#2a1747] border border-white/20 shadow-[0_0_20px_rgba(217,70,239,0.35)]">
                      <span className="text-sm font-semibold tracking-wide bg-gradient-to-br from-pink-300 to-fuchsia-300 bg-clip-text text-transparent">
                        {step.n}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-white font-semibold text-base md:text-[17px] mb-1.5 leading-tight max-w-[220px]">
                    {step.title}
                  </h4>
                  <p className="text-white/65 text-sm leading-snug max-w-[230px] mb-3">
                    {step.desc}
                  </p>
                  <span className="text-[10px] font-semibold tracking-[0.2em] text-fuchsia-300/90">
                    {step.time}
                  </span>
                </div>
              ))}
            </StaggerGrid>
          </div>
        </div>
      </div>
    </section>
  );
};
