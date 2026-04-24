import { Play, Sparkles, Image as ImageIcon, Film, Camera, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";

type PromoCard = {
  title: string;
  label: string;
  type: "cover" | "social" | "video";
  colors: [string, string]; // tailwind from / to
  accent: string; // tailwind shadow color class
  ratio: "square" | "portrait" | "landscape";
};

const PROMO_CARDS: PromoCard[] = [
  // Portadas
  {
    title: "Neon Cover",
    label: "Portada",
    type: "cover",
    colors: ["from-fuchsia-500", "to-purple-700"],
    accent: "shadow-fuchsia-500/40",
    ratio: "square",
  },
  {
    title: "Urban Drop",
    label: "Portada",
    type: "cover",
    colors: ["from-orange-500", "to-rose-600"],
    accent: "shadow-orange-500/40",
    ratio: "square",
  },
  {
    title: "Indie Poster",
    label: "Flyer",
    type: "social",
    colors: ["from-amber-300", "to-pink-500"],
    accent: "shadow-amber-400/40",
    ratio: "portrait",
  },
  {
    title: "Reel Teaser",
    label: "Reel",
    type: "video",
    colors: ["from-cyan-400", "to-blue-600"],
    accent: "shadow-cyan-500/40",
    ratio: "portrait",
  },
  {
    title: "Canvas Loop",
    label: "Canvas",
    type: "video",
    colors: ["from-violet-500", "to-indigo-700"],
    accent: "shadow-violet-500/40",
    ratio: "portrait",
  },
  {
    title: "Story Drop",
    label: "Story",
    type: "social",
    colors: ["from-pink-500", "to-purple-600"],
    accent: "shadow-pink-500/40",
    ratio: "portrait",
  },
  {
    title: "EDM Cover",
    label: "Portada",
    type: "cover",
    colors: ["from-emerald-400", "to-cyan-600"],
    accent: "shadow-emerald-500/40",
    ratio: "square",
  },
  {
    title: "TikTok Promo",
    label: "Reel",
    type: "video",
    colors: ["from-rose-400", "to-fuchsia-600"],
    accent: "shadow-rose-500/40",
    ratio: "portrait",
  },
  {
    title: "Album Art",
    label: "Portada",
    type: "cover",
    colors: ["from-blue-500", "to-violet-700"],
    accent: "shadow-blue-500/40",
    ratio: "square",
  },
  {
    title: "Insta Post",
    label: "Post",
    type: "social",
    colors: ["from-yellow-400", "to-orange-600"],
    accent: "shadow-yellow-500/40",
    ratio: "square",
  },
  {
    title: "Launch Teaser",
    label: "Promo",
    type: "video",
    colors: ["from-purple-600", "to-pink-600"],
    accent: "shadow-purple-500/40",
    ratio: "portrait",
  },
  {
    title: "Indie Cover",
    label: "Portada",
    type: "cover",
    colors: ["from-teal-400", "to-emerald-600"],
    accent: "shadow-teal-500/40",
    ratio: "square",
  },
];

const labelIcon = (type: PromoCard["type"]) => {
  switch (type) {
    case "cover":
      return <ImageIcon className="w-3.5 h-3.5" />;
    case "social":
      return <Camera className="w-3.5 h-3.5" />;
    case "video":
      return <Film className="w-3.5 h-3.5" />;
  }
};

const ratioClass = (ratio: PromoCard["ratio"]) => {
  switch (ratio) {
    case "square":
      return "aspect-square";
    case "portrait":
      return "aspect-[9/14]";
    case "landscape":
      return "aspect-video";
  }
};

const PromoCardItem = ({ card }: { card: PromoCard }) => (
  <div
    className={`group relative shrink-0 w-48 sm:w-56 ${ratioClass(
      card.ratio
    )} rounded-2xl overflow-hidden border border-white/10 shadow-xl ${card.accent} transition-transform duration-300 hover:scale-[1.03]`}
  >
    {/* Background gradient */}
    <div
      className={`absolute inset-0 bg-gradient-to-br ${card.colors[0]} ${card.colors[1]}`}
    />
    {/* Decorative texture / noise */}
    <div className="absolute inset-0 opacity-30 mix-blend-overlay bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.5),transparent_50%)]" />
    <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.6),transparent_60%)]" />

    {/* Top label */}
    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium">
      {labelIcon(card.type)}
      <span>{card.label}</span>
    </div>

    {/* Play icon for video */}
    {card.type === "video" && (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
          <Play className="w-5 h-5 text-white fill-white ml-0.5" />
        </div>
      </div>
    )}

    {/* Bottom title */}
    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
      <p className="text-white font-semibold text-sm tracking-tight drop-shadow">
        {card.title}
      </p>
    </div>
  </div>
);

export const PromoVisualsShowcase = () => {
  // Duplicate cards for seamless infinite scroll
  const looped = [...PROMO_CARDS, ...PROMO_CARDS];

  const scrollToPricing = () => {
    document
      .getElementById("pricing-section")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="relative py-20 sm:py-28 overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #251541 0%, #2c1a4d 22%, #36205c 50%, #2e1a4f 78%, #2a1747 100%)",
      }}
    >
      {/* Soft top fade to blend seamlessly with previous section */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/8 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/6 to-transparent" />

      {/* Decorative ambient glow orbs (premium violet palette) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-purple-500/15 blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/15 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium mb-5 shadow-sm">
              <Megaphone className="w-3.5 h-3.5" />
              Material promocional con IA
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Crea todo el material visual de{" "}
              <span className="bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-300 bg-clip-text text-transparent">
                tu lanzamiento
              </span>
              , en minutos.
            </h2>
            <p className="text-base sm:text-lg text-white/70 leading-relaxed">
              Genera portadas, posts, flyers y vídeos cortos para promocionar tu
              música en redes. Todo desde MusicDibs.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Infinite horizontal scroll */}
      <div
        className="relative group/marquee"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="promo-marquee flex gap-5 py-6 w-max">
          {looped.map((card, i) => (
            <PromoCardItem key={`${card.title}-${i}`} card={card} />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="flex flex-col items-center gap-3 mt-12">
            <Button
              size="lg"
              onClick={scrollToPricing}
              className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-purple-600 hover:from-fuchsia-600 hover:via-pink-600 hover:to-purple-700 text-white shadow-lg shadow-fuchsia-500/30 border-0 px-8"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Crear mi material promocional
            </Button>
            <p className="text-xs text-white/60">
              Portadas, posts, flyers y vídeos generados con IA en minutos.
            </p>
          </div>
        </ScrollReveal>
      </div>

      {/* Marquee animation */}
      <style>{`
        @keyframes promo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .promo-marquee {
          animation: promo-marquee 60s linear infinite;
          will-change: transform;
        }
        .group\\/marquee:hover .promo-marquee {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
};
