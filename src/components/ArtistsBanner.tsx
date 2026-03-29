import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { useEffect } from "react";

const AnimatedStat = ({ end, suffix, label }: { end: number; suffix: string; label: string }) => {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const { count, start } = useCountUp({ end, duration: 2200 });

  useEffect(() => {
    if (isInView) start();
  }, [isInView]);

  return (
    <div className="text-center" ref={ref}>
      <div className="text-2xl md:text-3xl font-bold text-primary mb-1 tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-gray-300 text-base">{label}</div>
    </div>
  );
};

const ArtistsBanner = () => {
  const { t } = useTranslation();

  return (
    <section className="relative py-16 px-4 overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/lovable-uploads/8a9c1220-8213-4d45-a928-debd5429a44c.png')`,
        }}
      />

      {/* Dark glassmorphism overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-black/60 to-purple-800/30" />

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-purple-500/30 bg-black/70 backdrop-blur-lg p-8 md:p-12 space-y-6 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)] text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            {t("artists.heading1")}
            <br />
            <span className="text-primary">{t("artists.heading2")}</span>
          </h2>

          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            {t("artists.subtext")}
          </p>

          <div className="flex justify-center">
            <Button
              variant="outline"
              size="lg"
              className="border-2 border-primary/50 text-white hover:bg-primary/20 font-bold px-6 py-2 text-base rounded-full"
              onClick={() => {
                const testimonialsSection = document.querySelector('section:nth-of-type(5)');
                testimonialsSection?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t("artists.view_testimonials")}
            </Button>
          </div>

          {/* Animated Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 max-w-3xl mx-auto">
            <AnimatedStat end={100000} suffix="+" label={t("artists.stats.artists")} />
            <AnimatedStat end={1000000} suffix="+" label={t("artists.stats.works")} />
            <AnimatedStat end={50} suffix="+" label={t("artists.stats.countries")} />
          </div>
        </div>
      </div>
    </section>
  );
};

export { ArtistsBanner };
