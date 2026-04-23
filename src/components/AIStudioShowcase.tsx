import { Play, Sparkles, Music, Shield, Globe, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
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
    icon: Lightbulb,
    title: "Describe tu idea",
    desc: "género, mood, tempo, vibe…",
  },
  {
    n: "02",
    icon: Sparkles,
    title: "La IA genera tu canción",
    desc: "música, letra y producción",
  },
  {
    n: "03",
    icon: Shield,
    title: "Registra tus derechos",
    desc: "certificado blockchain con validez legal",
  },
  {
    n: "04",
    icon: Globe,
    title: "Distribuye al mundo",
    desc: "Spotify, Apple Music, YouTube y 200+ plataformas",
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

      {/* Soft top/bottom fades to blend with neighbouring (light) sections */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/12 via-white/4 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/8 to-transparent" />

      {/* Decorative ambient glow orbs (richer, premium violet palette) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-purple-500/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-300" />
              <span className="text-xs font-semibold text-white/90 tracking-wide">
                AI Music Studio
              </span>
            </div>
            <h2 className="text-4xl md:text-6xl font-bold text-white leading-[1.1] mb-5">
              Crea música con IA.
              <br />
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
                asChild
                size="lg"
                className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 text-white border-0 shadow-[0_0_40px_rgba(217,70,239,0.45)] hover:shadow-[0_0_55px_rgba(217,70,239,0.7)] hover:scale-105 transition-all"
              >
                <Link to="/ai-studio/create">
                  <Sparkles className="w-4 h-4" />
                  Crear mi canción
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="bg-white/10 border-white/25 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm"
              >
                <Link to="/ai-studio">
                  <Play className="w-4 h-4" />
                  Ver demo
                </Link>
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
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-fuchsia-300 mb-2">
              En menos de 10 minutos
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-white">
              Cuatro pasos. Una canción al mundo.
            </h3>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StaggerGrid baseDelay={100} staggerDelay={120}>
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="relative text-center px-4 py-6 rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm hover:border-white/30 hover:bg-white/10 transition-all shadow-lg"
              >
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gradient-to-br from-pink-500/40 to-purple-600/40 border border-white/20 flex items-center justify-center shadow-inner">
                  <step.icon className="w-5 h-5 text-fuchsia-200" />
                </div>
                <div className="text-[10px] tracking-[0.25em] font-semibold text-white/50 mb-1">
                  {step.n}
                </div>
                <h4 className="text-white font-semibold text-base mb-1.5">
                  {step.title}
                </h4>
                <p className="text-white/65 text-sm leading-snug">
                  {step.desc}
                </p>
              </div>
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
};
