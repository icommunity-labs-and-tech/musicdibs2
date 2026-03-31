import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useTranslation } from "react-i18next";
import { getFooterLinks } from "@/i18nLinks";
import { useParallax } from "@/hooks/useParallax";

export const HeroSection = () => {
  const { t, i18n } = useTranslation();
  const footerLinks = getFooterLinks(i18n.resolvedLanguage || i18n.language);
  const { offset } = useParallax({ speed: 0.4 });
  const { offset: bgOffset } = useParallax({ speed: 0.15 });

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video background with parallax */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        poster="/lovable-uploads/8a9c1220-8213-4d45-a928-debd5429a44c.png"
        onError={(e) => console.error("Video failed to load:", e)}
        className="absolute inset-0 w-full h-full object-cover will-change-transform"
        style={{ transform: `translateY(${offset * 0.5}px) scale(1.1)` }}
      >
        <source src="/hero-video-new.mp4" type="video/mp4" />
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      {/* Background with gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/50 via-purple-700/50 to-pink-600/50">
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Background pattern/texture overlay with parallax */}
      <div
        className="absolute inset-0 opacity-20 will-change-transform"
        style={{ transform: `translateY(${bgOffset}px)` }}
      >
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-pink-300/20 blur-lg"></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 rounded-full bg-purple-300/10 blur-xl"></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 rounded-full bg-white/10 blur-lg"></div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Main heading */}
        <ScrollReveal delay={200}>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            {t("hero.title")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-300">
              {t("hero.highlight")}
            </span>
          </h1>
        </ScrollReveal>

        {/* Subtitle */}
        <ScrollReveal delay={400}>
          <p className="text-xl md:text-2xl text-white mb-8 max-w-3xl mx-auto leading-relaxed">
            {t("hero.subtitle_prefix")} {t("hero.subtitle_strong")}{" "}
            <a
              href="/legal-validity"
              className="text-pink-300 hover:text-pink-200 underline transition-colors text-xs md:text-sm"
            >
              {t("hero.legal_more")}
            </a>
          </p>
        </ScrollReveal>

        {/* CTA buttons with A/B testing */}
        <ScrollReveal delay={600}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="hero"
              size="xl"
              className="font-semibold"
              onClick={() => {
                document.getElementById("pricing-section")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("hero.cta_start")}
            </Button>
            <Button
              variant="blue"
              size="xl"
              className="font-semibold"
              onClick={() => {
                const tutorialSection = document.querySelector("section:nth-of-type(7)");
                tutorialSection?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("hero.cta_how")}
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
