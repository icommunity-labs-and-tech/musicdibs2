import { Shield, Zap, Palette, Globe } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation, Trans } from "react-i18next";

export const WhyChooseSection = () => {
  const { t } = useTranslation();
  const features = [
    {
      icon: Shield,
      title: t("why.features.legal.title"),
      description: t("why.features.legal.desc"),
      color: "from-pink-500 to-purple-600",
      popupContent: (
        <span style={{ whiteSpace: 'pre-line' }}>{t("why.features.legal.popup")}</span>
      )
    },
    {
      icon: Palette,
      title: t("why.features.promo.title"),
      description: t("why.features.promo.desc"),
      color: "from-cyan-500 to-pink-600",
      popupContent: (
        <span style={{ whiteSpace: 'pre-line' }}>{t("why.features.promo.popup")}</span>
      )
    },
    {
      icon: Zap,
      title: t("why.features.instant.title"), 
      description: t("why.features.instant.desc"),
      color: "from-purple-500 to-blue-600",
      popupContent: (
        <>
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
        </>
      )
    },
    {
      icon: Globe,
      title: t("why.features.distribution.title"),
      description: t("why.features.distribution.desc"),
      color: "from-blue-500 to-cyan-600",
      popupContent: (
        <>
          <Trans
            i18nKey="why.features.distribution.popup"
            components={{
              strong1: <span className="font-bold text-primary" />,
              strong2: <span className="font-bold text-primary" />,
            }}
          />
        </>
      )
    }
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

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <StaggerGrid baseDelay={100} staggerDelay={150} scale>
            {features.map((feature, index) => (
              <Dialog key={index}>
                <DialogTrigger asChild>
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col">
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 mx-auto`}>
                      <feature.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-3 text-center">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 text-center leading-relaxed flex-1">
                      {feature.description}
                    </p>
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
            ))}
          </StaggerGrid>
        </div>
      </div>
    </section>
  );
};