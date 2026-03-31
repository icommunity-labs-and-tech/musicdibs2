import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useInView } from "@/hooks/useInView";
import { useCountUp } from "@/hooks/useCountUp";
import { useABTest, trackABClick } from "@/hooks/useABTest";
import { useEffect } from "react";

const AnimatedStat = ({ end, suffix, label }: { end: number; suffix: string; label: string }) => {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const { count, start } = useCountUp({ end, duration: 2200 });

  useEffect(() => {
    if (isInView) start();
  }, [isInView]);

  return (
    <div className="text-center" ref={ref}>
      <div className="text-2xl md:text-3xl font-bold text-yellow-300 mb-1 drop-shadow-lg tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-white/95 text-base drop-shadow-md">{label}</div>
    </div>
  );
};

const ArtistsBanner = () => {
  const { t } = useTranslation();

  const ctaJoin = useABTest({
    id: 'artists_cta_join',
    variants: [
      { text: t("artists.join_now"), className: '' },
      { text: t('artistsAB.joinFreeToday'), className: '' },
      { text: t('artistsAB.startCareer'), className: 'bg-yellow-400 text-black hover:bg-yellow-300' },
    ],
  });

  const ctaTestimonials = useABTest({
    id: 'artists_cta_testimonials',
    variants: [
      { text: t("artists.view_testimonials"), className: '' },
      { text: t('artistsAB.whoTrusts'), className: '' },
    ],
  });

  return (
    <section className="relative bg-gradient-to-r from-pink-500 via-pink-600 to-pink-700 py-12 overflow-hidden">
      {/* Artists background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/lovable-uploads/8a9c1220-8213-4d45-a928-debd5429a44c.png')`
        }}
      />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-600/80 via-pink-700/80 to-purple-700/80" />

      {/* Background pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)
          `,
          backgroundSize: '100px 100px, 150px 150px'
        }} />
      </div>

      {/* Floating elements */}
      <div className="absolute top-6 left-6 w-12 h-12 border-2 border-white/20 rounded-full animate-pulse" />
      <div className="absolute top-8 right-8 w-8 h-8 bg-white/10 rounded-lg rotate-45 animate-pulse" />
      <div className="absolute bottom-6 left-12 w-6 h-6 border border-white/30 rotate-12 animate-pulse" />
      <div className="absolute bottom-8 right-6 w-16 h-16 border border-white/20 rounded-full animate-pulse" />

      <div className="relative z-10 container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-3 leading-tight drop-shadow-lg">
          {t("artists.heading1")}
          <br />
          <span className="text-yellow-300">{t("artists.heading2")}</span>
        </h2>
        
        <p className="text-lg md:text-xl text-white/95 mb-6 font-medium drop-shadow-md">
          {t("artists.subtext")}
        </p>

        <div className="flex justify-center items-center">
          <Button 
            variant="outline" 
            size="lg"
            className={`border-2 border-white text-pink-600 hover:bg-white hover:text-pink-600 font-bold px-6 py-2 text-base rounded-full ${ctaTestimonials.className}`}
            onClick={() => {
              trackABClick('artists_cta_testimonials', ctaTestimonials.variantIndex, ctaTestimonials.text);
              const testimonialsSection = document.querySelector('section:nth-of-type(5)');
              testimonialsSection?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {ctaTestimonials.text}
          </Button>
        </div>

        {/* Animated Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-3xl mx-auto">
          <AnimatedStat end={100000} suffix="+" label={t("artists.stats.artists")} />
          <AnimatedStat end={1000000} suffix="+" label={t("artists.stats.works")} />
          <AnimatedStat end={50} suffix="+" label={t("artists.stats.countries")} />
        </div>
      </div>
    </section>
  );
};

export { ArtistsBanner };
