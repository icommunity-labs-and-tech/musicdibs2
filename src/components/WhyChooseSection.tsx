import { Shield, Globe, Sparkles, Megaphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation, Trans } from "react-i18next";

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
      popupContent: (
        <span style={{ whiteSpace: 'pre-line' }}>{t("why.features.legal.popup")}</span>
      ),
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
                      className={`group relative rounded-2xl p-6 border transition-all duration-300 cursor-pointer h-full flex flex-col overflow-hidden ${
                        isFeatured
                          ? "bg-gradient-to-br from-white/15 to-white/5 border-white/30 hover:border-white/50 shadow-[0_10px_40px_-10px_rgba(217,70,239,0.5)] hover:shadow-[0_15px_50px_-10px_rgba(217,70,239,0.7)] hover:-translate-y-1"
                          : "bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/15 hover:scale-[1.03]"
                      }`}
                    >
                      {/* Featured ambient glow */}
                      {isFeatured && (
                        <>
                          <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-fuchsia-500/30 blur-3xl" />
                          <div className="pointer-events-none absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-purple-500/30 blur-3xl" />
                          <div className="absolute top-3 right-3 z-10">
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-lg">
                              <Sparkles className="w-3 h-3" /> Core
                            </span>
                          </div>
                        </>
                      )}

                      {/* Step indicator */}
                      <div className="relative z-10 mb-3 flex items-center justify-center">
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isFeatured ? "text-pink-200" : "text-white/50"
                          }`}
                        >
                          Paso {index + 1}
                        </span>
                      </div>

                      {/* Icon */}
                      <div
                        className={`relative z-10 mx-auto mb-4 flex items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} ${
                          isFeatured ? "w-20 h-20 shadow-xl" : "w-16 h-16"
                        }`}
                      >
                        <feature.icon
                          className={`text-white ${isFeatured ? "w-10 h-10" : "w-8 h-8"}`}
                        />
                      </div>

                      {/* Title */}
                      <h3
                        className={`relative z-10 font-bold text-white mb-3 text-center ${
                          isFeatured ? "text-2xl" : "text-xl"
                        }`}
                      >
                        {feature.title}
                      </h3>

                      {/* Description */}
                      <p
                        className={`relative z-10 text-center leading-relaxed flex-1 ${
                          isFeatured ? "text-white/85 text-base" : "text-white/70 text-sm"
                        }`}
                      >
                        {feature.description}
                      </p>

                      {/* Subtle CTA on featured */}
                      {isFeatured && (
                        <div className="relative z-10 mt-4 text-center">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-pink-200 group-hover:text-pink-100 transition-colors">
                            Descubre más
                            <span className="transition-transform group-hover:translate-x-0.5">→</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-semibold mb-4">
                        {feature.title}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="text-foreground leading-relaxed text-base">
                      {feature.popupContent}
                    </div>
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
