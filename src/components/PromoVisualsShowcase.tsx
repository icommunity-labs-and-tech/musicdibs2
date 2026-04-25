import { Sparkles, Image as ImageIcon, Megaphone, Play, Film, Layers, FileImage, Instagram, Music2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import neonPulse from "@/assets/covers/neon-pulse.png";
import fuegoLento from "@/assets/covers/fuego-lento.png";
import caminoDeAbril from "@/assets/covers/camino-de-abril.png";
import distrito9 from "@/assets/covers/distrito-9.png";
import loQueQuedaDeTi from "@/assets/covers/lo-que-queda-de-ti.png";
import cityLights from "@/assets/covers/city-lights.png";
import reelMidnight from "@/assets/promo/reel-midnight-drop.jpg";
import tiktokFuego from "@/assets/promo/tiktok-fuego-viral.jpg";
import canvasLiquid from "@/assets/promo/canvas-liquid-dreams.jpg";
import storyIndie from "@/assets/promo/story-indie-motion.jpg";
import flyerUrban from "@/assets/promo/flyer-urban.jpg";
import postPop from "@/assets/promo/post-pop-release.jpg";
import videoclipNocheDeFuego from "@/assets/promo/videoclip-noche-de-fuego.mp4";
import videoclipUltimaLuz from "@/assets/promo/videoclip-ultima-luz.mp4";
import reelNeonPulse from "@/assets/promo/reel-neon-pulse.mp4";

type CoverCard = {
  title: string;
  artist: string;
  genre: string;
  image: string;
};

type PromoCard = {
  title: string;
  badge: string;
  description: string;
  image?: string;
  video?: string;
  isVideo?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};

const COVER_CARDS: CoverCard[] = [
  { title: "Neon Pulse", artist: "Vera Nova", genre: "EDM / Electrónica", image: neonPulse },
  { title: "Fuego Lento", artist: "Milo Reyes", genre: "Reggaeton / Urbano", image: fuegoLento },
  { title: "Camino de Abril", artist: "Luna Ártica", genre: "Indie / Folk", image: caminoDeAbril },
  { title: "Distrito 9", artist: "Kairo Beats", genre: "Hip Hop / Trap", image: distrito9 },
  { title: "Lo Que Queda de Ti", artist: "Sira Vale", genre: "Pop / Balada", image: loQueQuedaDeTi },
  { title: "City Lights", artist: "Noah Grey", genre: "R&B / Soul", image: cityLights },
];

const PROMO_CARDS: PromoCard[] = [
  { title: "Noche de Fuego", badge: "Videoclip", description: "Milo Reyes · Clip urbano", video: videoclipNocheDeFuego, isVideo: true, Icon: Video },
  { title: "Última Luz", badge: "Videoclip", description: "Sira Vale · Clip pop", video: videoclipUltimaLuz, isVideo: true, Icon: Video },
  { title: "Neon Pulse", badge: "Reel", description: "Vera Nova · Teaser electrónico", video: reelNeonPulse, isVideo: true, Icon: Film },
  { title: "Fuego Viral", badge: "TikTok Promo", description: "Milo Reyes · Promo urbana", image: tiktokFuego, isVideo: true, Icon: Music2 },
  { title: "Liquid Dreams", badge: "Canvas", description: "Noah Grey · Loop visual", image: canvasLiquid, isVideo: true, Icon: Layers },
  { title: "Indie Motion", badge: "Story", description: "Luna Ártica · Story promo", image: storyIndie, Icon: Instagram },
  { title: "Urban Flyer", badge: "Flyer", description: "Kairo Beats · Flyer de lanzamiento", image: flyerUrban, Icon: FileImage },
  { title: "Pop Release", badge: "Post", description: "Sira Vale · Post Instagram", image: postPop, Icon: Instagram },
];

const CoverCardItem = ({ card }: { card: CoverCard }) => (
  <div className="group relative shrink-0 w-52 sm:w-60 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-fuchsia-500/20 transition-transform duration-300 hover:scale-[1.03] hover:shadow-fuchsia-500/40">
    <img
      src={card.image}
      alt={`Portada ${card.title} de ${card.artist}`}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.06]"
    />
    <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors duration-300" />
    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium">
      <ImageIcon className="w-3.5 h-3.5" />
      <span>Portada</span>
    </div>
    <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
      <p className="text-white font-semibold text-sm sm:text-base tracking-tight drop-shadow leading-tight">
        {card.title}
      </p>
      <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 drop-shadow">
        {card.artist} · <span className="text-white/60">{card.genre}</span>
      </p>
    </div>
  </div>
);

const PromoCardItem = ({ card }: { card: PromoCard }) => {
  const Icon = card.Icon;
  const hasVideoSource = Boolean(card.video);
  return (
    <div className="group relative shrink-0 w-52 sm:w-60 aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 shadow-xl shadow-purple-500/20 transition-transform duration-300 hover:scale-[1.03] hover:shadow-purple-500/40">
      {hasVideoSource ? (
        <video
          src={card.video}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      ) : (
        <img
          src={card.image}
          alt={`${card.badge} ${card.title}`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-white/5 transition-colors duration-300" />

      {/* Top badge */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-white text-[11px] font-medium">
        <Icon className="w-3.5 h-3.5" />
        <span>{card.badge}</span>
      </div>

      {/* Play icon for video placeholders (not real video sources) */}
      {card.isVideo && !hasVideoSource && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-lg group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </div>
        </div>
      )}

      {/* Bottom overlay + meta */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 bg-gradient-to-t from-black/85 via-black/55 to-transparent">
        <p className="text-white font-semibold text-sm sm:text-base tracking-tight drop-shadow leading-tight">
          {card.title}
        </p>
        <p className="text-white/80 text-[11px] sm:text-xs mt-0.5 drop-shadow">
          {card.description}
        </p>
      </div>
    </div>
  );
};

export const PromoVisualsShowcase = () => {
  const loopedCovers = [...COVER_CARDS, ...COVER_CARDS];
  const loopedPromos = [...PROMO_CARDS, ...PROMO_CARDS];

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
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white/6 to-transparent" />
      <div className="pointer-events-none absolute -top-32 -left-32 w-[32rem] h-[32rem] rounded-full bg-fuchsia-600/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-violet-600/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[44rem] h-[44rem] rounded-full bg-purple-500/15 blur-3xl" />

      {/* Header */}
      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
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

      {/* Bloque 1 — Portadas */}
      <div className="container mx-auto px-4 relative">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-5 sm:mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/85 text-xs sm:text-[13px] font-medium tracking-wide">
              <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
              Portadas para tu lanzamiento
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </ScrollReveal>
      </div>

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
          {loopedCovers.map((card, i) => (
            <CoverCardItem key={`cover-${card.title}-${i}`} card={card} />
          ))}
        </div>
      </div>

      {/* Bloque 2 — Piezas para redes */}
      <div className="container mx-auto px-4 relative mt-8 sm:mt-10">
        <ScrollReveal>
          <div className="flex items-center gap-2 mb-5 sm:mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/85 text-xs sm:text-[13px] font-medium tracking-wide">
              <Film className="w-3.5 h-3.5 text-purple-300" />
              Piezas para moverlo en redes
            </div>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </ScrollReveal>
      </div>

      <div
        className="relative group/marquee2"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="promo-marquee-reverse flex gap-5 py-6 w-max">
          {loopedPromos.map((card, i) => (
            <PromoCardItem key={`promo-${card.title}-${i}`} card={card} />
          ))}
        </div>
      </div>

      {/* CTA único */}
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

      <style>{`
        @keyframes promo-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes promo-marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .promo-marquee {
          animation: promo-marquee 50s linear infinite;
          will-change: transform;
        }
        .promo-marquee-reverse {
          animation: promo-marquee-reverse 55s linear infinite;
          will-change: transform;
        }
        .group\\/marquee:hover .promo-marquee,
        .group\\/marquee2:hover .promo-marquee-reverse {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .promo-marquee,
          .promo-marquee-reverse { animation: none; }
        }
      `}</style>
    </section>
  );
};
