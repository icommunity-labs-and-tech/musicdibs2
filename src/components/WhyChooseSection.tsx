import { Shield, Globe, Sparkles, Megaphone, Music, Sliders, PenLine, Image as ImageIcon, Smartphone, Film } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation, Trans } from "react-i18next";

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
          Crea, mejora y promociona tu música con IA desde un solo lugar.
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

      {/* Frase final destacada */}
      <div className="relative rounded-xl p-4 bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600 shadow-lg shadow-purple-500/20">
        <p className="text-center text-white font-semibold text-sm sm:text-base">
          De la idea al lanzamiento, sin saltar entre herramientas.
        </p>
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
      featured: false,
      popupContent: (
        <Trans
          i18nKey="why.features.instant.popup"
          components={{
            strong1: <span className="font-bold text-primary" />,
            strong2: <span className="font-bold text-primary" />,
            a1: (
              <a
                href="https://www.wipo.int/treaties/es/ip/berne/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              />
            ),
            a2: (
              <a
                href="https://www.wipo.int/treaties/es/ip/wct/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              />
            ),
            a3: (
              <a
                href="https://digital-strategy.ec.europa.eu/es/policies/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
              />
            ),
          }}
        />
      ),
    },
    {
      icon: Globe,
      title: t("why.features.distribution.title"), // "Distribución Global"
      description: t("why.features.distribution.desc"),
      color: "from-blue-500 to-cyan-500",
      featured: false,
      popupContent: (
        <Trans
          i18nKey="why.features.distribution.popup"
          components={{
            strong1: <span className="font-bold text-primary" />,
            strong2: <span className="font-bold text-primary" />,
          }}
        />
      ),
    },
    {
      icon: Megaphone,
      title: t("why.features.promo.title"), // "Promoción en RRSS"
      description: t("why.features.promo.desc"),
      color: "from-cyan-500 to-pink-500",
      featured: false,
      popupContent: (
        <span style={{ whiteSpace: 'pre-line' }}>{t("why.features.promo.popup")}</span>
      ),
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-purple-900 to-purple-800">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("why.heading")}
            </h2>
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
