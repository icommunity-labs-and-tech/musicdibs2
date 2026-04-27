import { Shield, Globe, Sparkles, Megaphone, Music, Sliders, PenLine, Image as ImageIcon, Smartphone, Film, Fingerprint, Link2, FileCheck, Scale, Radio, Headphones, DollarSign, Layers, Users, Star, Palette, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation, Trans } from "react-i18next";

import { Button } from "@/components/ui/button";

const AIMusicStudioPopup = () => {
  const items = [
    { icon: Music, title: "Crear canciones", desc: "Canciones completas, instrumentales o con voz.", color: "from-pink-500 to-fuchsia-500" },
    { icon: Sliders, title: "Masterizar", desc: "Mejora el sonido y déjalo listo para plataformas.", color: "from-fuchsia-500 to-purple-500" },
    { icon: PenLine, title: "Crear letras", desc: "Genera ideas, letras y estructuras en segundos.", color: "from-purple-500 to-violet-500" },
    { icon: ImageIcon, title: "Diseñar portadas", desc: "Arte visual para singles, EPs y álbumes.", color: "from-violet-500 to-indigo-500" },
    { icon: Smartphone, title: "Crear contenido", desc: "Posts, creatividades y piezas para redes.", color: "from-indigo-500 to-blue-500" },
    { icon: Film, title: "Vídeos cortos", desc: "Clips promocionales para Reels, TikTok y Spotify Canvas.", color: "from-blue-500 to-cyan-500" },
  ];

  return (
    <div className="-m-6 p-6 sm:p-8 bg-gradient-to-br from-white via-pink-50/40 to-purple-50/60 rounded-lg">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 blur-xl opacity-40 rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-700 bg-clip-text text-transparent mb-2">
          AI Music Studio
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-md">
          Tu estudio creativo con IA para crear canciones, mejorar tu sonido y preparar todo tu lanzamiento.
        </p>
      </div>

      {/* Grid de capacidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative rounded-xl p-4 bg-white/80 backdrop-blur-sm border border-purple-100 hover:border-purple-300 hover:shadow-md hover:shadow-purple-200/40 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-gray-600 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA contextual */}
      <div className="flex justify-center">
        <DialogClose asChild>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 border-0"
          >
            <a href="/#pricing-section">
              <Sparkles className="w-4 h-4 mr-2" />
              Quiero crear mi canción
            </a>
          </Button>
        </DialogClose>
      </div>
    </div>
  );
};

const IPRegistryPopup = () => {
  const items = [
    { icon: Fingerprint, title: "Huella digital única", desc: "Generamos un hash criptográfico del archivo para identificar tu obra de forma única.", color: "from-purple-500 to-violet-600" },
    { icon: Link2, title: "Registro blockchain", desc: "La evidencia queda sellada con fecha y hora en una red blockchain, sin poder alterarse.", color: "from-violet-500 to-blue-600" },
    { icon: FileCheck, title: "Certificado verificable", desc: "Recibes un comprobante digital con los datos de la obra, hash y enlace de verificación.", color: "from-blue-500 to-cyan-500" },
    { icon: Scale, title: "Evidencia de autoría", desc: "El registro ayuda a demostrar la existencia e integridad de tu obra ante terceros.", color: "from-cyan-500 to-teal-500" },
  ];

  return (
    <div className="-m-6 p-6 sm:p-8 bg-gradient-to-br from-white via-blue-50/40 to-purple-50/60 rounded-lg">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 blur-xl opacity-40 rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-violet-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 via-violet-600 to-blue-700 bg-clip-text text-transparent mb-2">
          Registro de Propiedad Intelectual
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-md">
          Protege tu música en segundos con una evidencia digital verificable registrada en blockchain.
        </p>
      </div>

      {/* Grid de capacidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative rounded-xl p-4 bg-white/80 backdrop-blur-sm border border-blue-100 hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/40 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-gray-600 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Bloque legal */}
      <div className="rounded-xl p-4 bg-slate-50/80 border border-slate-200 mb-5">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Marco internacional de derechos de autor
        </h5>
        <p className="text-xs text-gray-600 leading-relaxed">
          La protección de obras musicales se apoya en marcos internacionales como el{" "}
          <a
            href="https://www.wipo.int/treaties/es/ip/berne/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-700 font-medium"
          >
            Convenio de Berna
          </a>
          , el{" "}
          <a
            href="https://www.wipo.int/treaties/es/ip/wct/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-700 font-medium"
          >
            Tratado de la OMPI
          </a>{" "}
          y la{" "}
          <a
            href="https://digital-strategy.ec.europa.eu/es/policies/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 underline hover:text-purple-700 font-medium"
          >
            Directiva sobre Derechos de Autor en la Era Digital
          </a>
          . Musicdibs añade una capa tecnológica de evidencia digital verificable mediante blockchain.
        </p>
      </div>

      {/* Frase final + CTA */}
      <div className="text-center">
        <p className="text-sm text-gray-700 font-medium mb-4">
          Registra tu obra en segundos. Conserva una prueba digital verificable para siempre.
        </p>
        <DialogClose asChild>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 border-0"
          >
            <a href="/#pricing-section">
              <Shield className="w-4 h-4 mr-2" />
              Quiero registrar mi obra
            </a>
          </Button>
        </DialogClose>
      </div>
    </div>
  );
};

const GlobalDistributionPopup = () => {
  const items = [
    { icon: Radio, title: "200+ plataformas", desc: "Publica tu música en Spotify, Apple Music, YouTube, Amazon Music, TikTok y muchas más.", color: "from-blue-500 to-cyan-500" },
    { icon: Headphones, title: "Llega a nuevos oyentes", desc: "Haz que tus canciones estén disponibles para fans, playlists y audiencias de todo el mundo.", color: "from-cyan-500 to-teal-500" },
    { icon: DollarSign, title: "Gana royalties", desc: "Monetiza tus reproducciones y conserva el control de tus lanzamientos.", color: "from-teal-500 to-emerald-500" },
    { icon: Layers, title: "Desde Musicdibs", desc: "Crea, registra y distribuye tus canciones desde una misma plataforma, sin cambiar de herramienta.", color: "from-indigo-500 to-blue-600" },
  ];

  return (
    <div className="-m-6 p-6 sm:p-8 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/60 rounded-lg">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 blur-xl opacity-40 rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Globe className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent mb-2">
          Distribución Global
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-md">
          Lanza tu música en Spotify, Apple Music, YouTube y más de 200 plataformas digitales desde un solo lugar.
        </p>
      </div>

      {/* Grid de capacidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative rounded-xl p-4 bg-white/80 backdrop-blur-sm border border-blue-100 hover:border-blue-300 hover:shadow-md hover:shadow-blue-200/40 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-gray-600 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA contextual */}
      <div className="flex justify-center">
        <DialogClose asChild>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 border-0"
          >
            <a href="/#pricing-section">
              <Globe className="w-4 h-4 mr-2" />
              Quiero distribuir mi música
            </a>
          </Button>
        </DialogClose>
      </div>
    </div>
  );
};

const SocialPromoPopup = () => {
  const items = [
    { icon: Users, title: "Comunidad +200k", desc: "Da visibilidad a tu música en nuestros canales oficiales de TikTok e Instagram.", color: "from-pink-500 to-rose-500" },
    { icon: Star, title: "Promoción destacada", desc: "Publicamos tu canción o contenido promocional para ayudarte a ganar exposición.", color: "from-rose-500 to-orange-500" },
    { icon: Palette, title: "Creatividad personalizada", desc: "Preparamos el formato visual más adecuado para cada red social y tipo de lanzamiento.", color: "from-orange-500 to-fuchsia-500" },
    { icon: TrendingUp, title: "Más visibilidad", desc: "Llega a una audiencia interesada en música emergente, urbana e independiente.", color: "from-fuchsia-500 to-purple-500" },
  ];

  return (
    <div className="-m-6 p-6 sm:p-8 bg-gradient-to-br from-white via-pink-50/40 to-orange-50/60 rounded-lg">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-orange-500 blur-xl opacity-40 rounded-full" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
            <Megaphone className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 bg-clip-text text-transparent mb-2">
          Promoción en RRSS
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-md">
          Impulsa tus lanzamientos en TikTok e Instagram con visibilidad en la comunidad de Musicdibs.
        </p>
      </div>

      {/* Grid de capacidades */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {items.map((item, i) => (
          <div
            key={i}
            className="group relative rounded-xl p-4 bg-white/80 backdrop-blur-sm border border-pink-100 hover:border-pink-300 hover:shadow-md hover:shadow-pink-200/40 transition-all duration-300"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform`}>
              <item.icon className="w-5 h-5 text-white" />
            </div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h4>
            <p className="text-xs text-gray-600 leading-snug">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA contextual */}
      <div className="flex justify-center">
        <DialogClose asChild>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 hover:from-pink-600 hover:via-fuchsia-600 hover:to-purple-700 text-white shadow-lg shadow-purple-500/30 border-0"
          >
            <a href="/#pricing-section">
              <Megaphone className="w-4 h-4 mr-2" />
              Quiero promocionar mi lanzamiento
            </a>
          </Button>
        </DialogClose>
      </div>
    </div>
  );
};

export const WhyChooseSection = () => {
  const { t } = useTranslation();

  // Order represents the real product flow:
  // 1) Create with AI  →  2) Register IP  →  3) Distribute  →  4) Promote
  const features = [
    {
      icon: Sparkles,
      title: t("why.features.legal.title"), // "AI Music Studio"
      description: t("why.features.legal.desc"),
      color: "from-pink-500 via-fuchsia-500 to-purple-600",
      featured: true,
      popupContent: <AIMusicStudioPopup />,
    },
    {
      icon: Shield,
      title: t("why.features.instant.title"), // "Registro de PI"
      description: t("why.features.instant.desc"),
      color: "from-purple-500 to-blue-600",
      featured: true,
      popupContent: <IPRegistryPopup />,
    },
    {
      icon: Globe,
      title: t("why.features.distribution.title"), // "Distribución Global"
      description: t("why.features.distribution.desc"),
      color: "from-blue-500 to-cyan-500",
      featured: true,
      popupContent: <GlobalDistributionPopup />,
    },
    {
      icon: Megaphone,
      title: t("why.features.promo.title"), // "Promoción en RRSS"
      description: t("why.features.promo.desc"),
      color: "from-cyan-500 to-pink-500",
      featured: true,
      popupContent: <SocialPromoPopup />,
    },
  ];

  return (
    <section id="all-in-one-section" className="py-20 bg-gradient-to-b from-purple-900 to-purple-800">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("why.heading")}
            </h2>
            <p className="text-lg md:text-xl text-white/85 max-w-5xl mx-auto leading-relaxed whitespace-pre-line">
              {t("why.subheading")}
            </p>
          </div>
        </ScrollReveal>

        {/* Features grid — flow: Create → Register → Distribute → Promote */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StaggerGrid baseDelay={100} staggerDelay={150} scale>
            {features.map((feature, index) => {
              const isFeatured = feature.featured;
              return (
                <Dialog key={index}>
                  <DialogTrigger asChild>
                    <div
                      className="group relative rounded-2xl p-6 border transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:scale-[1.03]"
                    >
                      {/* Step indicator */}
                      <div className="relative z-10 mb-3 flex items-center justify-center">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
                          Paso {index + 1}
                        </span>
                      </div>

                      {/* Icon */}
                      <div
                        className={`relative z-10 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} w-16 h-16`}
                      >
                        <feature.icon className="text-white w-8 h-8" />
                      </div>

                      {/* Title */}
                      <h3 className="relative z-10 font-bold text-white mb-3 text-center text-xl">
                        {feature.title}
                      </h3>

                      {/* Description */}
                      <p className="relative z-10 text-center leading-relaxed flex-1 text-white/70 text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </DialogTrigger>
                  <DialogContent className={isFeatured ? "max-w-3xl p-6 border-0" : "max-w-2xl"}>
                    {isFeatured ? (
                      <>
                        <DialogTitle className="sr-only">{feature.title}</DialogTitle>
                        {feature.popupContent}
                      </>
                    ) : (
                      <>
                        <DialogHeader>
                          <DialogTitle className="text-xl font-semibold mb-4">
                            {feature.title}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="text-foreground leading-relaxed text-base">
                          {feature.popupContent}
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              );
            })}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
};
