import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, TrendingUp, Music, DollarSign } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";
import { useInView } from "@/hooks/useInView";
import { useAnimatedValue } from "@/hooks/useAnimatedValue";

const COMPETITORS = [
  { key: "musicdibs", rate: 0.95, highlight: true },
  { key: "distrokid", rate: 0.80, highlight: false },
  { key: "cdbaby", rate: 0.85, highlight: false },
  { key: "tunecore", rate: 0.80, highlight: false },
];

const AVG_PAY_PER_STREAM = 0.004;

const formatNumber = (n: number, lang: string) => {
  const locale = lang === "es" ? "es-ES" : lang === "pt-BR" ? "pt-BR" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : lang === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale).format(n);
};

const formatCurrency = (n: number, lang: string) => {
  const locale = lang === "es" ? "es-ES" : lang === "pt-BR" ? "pt-BR" : lang === "fr" ? "fr-FR" : lang === "it" ? "it-IT" : lang === "de" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
};

const STREAM_PRESETS = [10_000, 50_000, 100_000, 500_000, 1_000_000];

const AnimatedCurrency = ({ value, lang }: { value: number; lang: string }) => {
  const animated = useAnimatedValue(value, 600);
  return <>{formatCurrency(animated, lang)}</>;
};

export const RoyaltiesCalculator = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const [streams, setStreams] = useState(100_000);

  const { ref: barsRef, isInView: barsVisible } = useInView({ threshold: 0.3 });

  const results = useMemo(() => {
    const grossRevenue = streams * AVG_PAY_PER_STREAM;
    return COMPETITORS.map((c) => ({
      ...c,
      earnings: grossRevenue * c.rate,
      percentage: c.rate * 100,
    }));
  }, [streams]);

  const musicdibsEarnings = results[0].earnings;
  const bestCompetitorEarnings = Math.max(...results.slice(1).map((r) => r.earnings));
  const advantage = musicdibsEarnings - bestCompetitorEarnings;

  // Animated values
  const animatedStreams = useAnimatedValue(streams, 500);
  const animatedAdvantage = useAnimatedValue(advantage, 700);

  const rafSlider = useRef<number | null>(null);
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number(e.currentTarget.value);
    if (rafSlider.current) cancelAnimationFrame(rafSlider.current);
    rafSlider.current = requestAnimationFrame(() => {
      setStreams(nextValue);
      rafSlider.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafSlider.current) cancelAnimationFrame(rafSlider.current);
    };
  }, []);

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-purple-900 to-purple-800">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-purple-500 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-pink-500 blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4"
              style={{ background: "rgba(168,85,247,0.2)", color: "#C4B5FD" }}
            >
              <Calculator className="w-4 h-4" />
              {t("calculator.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {t("calculator.title")}
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#C4B5FD" }}>
              {t("calculator.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div
            className="rounded-2xl p-6 md:p-10"
            style={{
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "16px",
            }}
          >
            {/* Streams input */}
            <div className="mb-10">
              <label className="flex items-center gap-2 font-semibold text-lg mb-4 text-white">
                <Music className="w-5 h-5" style={{ color: "#A855F7" }} />
                {t("calculator.streams_label")}
              </label>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {STREAM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setStreams(preset)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={
                      streams === preset
                        ? { background: "#A855F7", color: "#FFFFFF", boxShadow: "0 0 12px rgba(168,85,247,0.5)" }
                        : { background: "rgba(255,255,255,0.1)", color: "#C4B5FD" }
                    }
                  >
                    {formatNumber(preset, lang)}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="relative">
                <input
                  type="range"
                  min={1000}
                  max={5000000}
                  step={1000}
                  value={streams}
                  onChange={handleSliderChange}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#A855F7] [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.6)] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#A855F7] [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-[0_0_10px_rgba(168,85,247,0.6)] [&::-moz-range-thumb]:cursor-pointer"
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    accentColor: "#A855F7",
                  }}
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: "#C4B5FD" }}>
                  <span>1K</span>
                  <span>5M</span>
                </div>
              </div>

              {/* Current value display */}
              <div className="mt-4 text-center">
                <span
                  className="text-4xl font-bold bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(90deg, #A855F7, #E879F9)" }}
                >
                  {formatNumber(Math.round(animatedStreams), lang)}
                </span>
                <span className="ml-2 text-lg" style={{ color: "#C4B5FD" }}>{t('calcStreams.unit')}</span>
              </div>
            </div>

            {/* Results comparison */}
            <div className="space-y-3" ref={barsRef}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" style={{ color: "#A855F7" }} />
                <h3 className="text-white font-semibold text-lg">
                  {t("calculator.results_title")}
                </h3>
              </div>

              {results.map((r, index) => {
                const maxEarnings = results[0].earnings;
                const barWidth = maxEarnings > 0 ? (r.earnings / maxEarnings) * 100 : 0;
                const animatedWidth = barsVisible ? barWidth : 0;
                const delay = index * 150;

                return (
                  <div
                    key={r.key}
                    className="rounded-xl p-4 transition-all duration-500 ease-out"
                    style={{
                      ...(r.highlight
                        ? {
                            background: "rgba(168,85,247,0.12)",
                            border: "1px solid rgba(168,85,247,0.35)",
                          }
                        : {
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }),
                      opacity: barsVisible ? 1 : 0,
                      transform: barsVisible ? "translateY(0)" : "translateY(12px)",
                      transitionDelay: `${delay}ms`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold ${r.highlight ? "text-lg" : ""}`}
                          style={{ color: "#FFFFFF" }}
                        >
                          {t(`calculator.competitors.${r.key}`)}
                        </span>
                        {r.highlight && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ background: "#A855F7" }}
                          >
                            {t("calculator.recommended")}
                          </span>
                        )}
                        <span className="text-xs" style={{ color: "#C4B5FD" }}>
                          ({r.percentage}% {t("calculator.royalties")})
                        </span>
                      </div>
                      <span
                        className="font-bold text-lg"
                        style={{ color: "#FFFFFF" }}
                      >
                        <AnimatedCurrency value={r.earnings} lang={lang} />
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${animatedWidth}%`,
                          transition: `width 1s ease-out ${delay + 200}ms`,
                          ...(r.highlight
                            ? {
                                background: "linear-gradient(90deg, #A855F7, #7C3AED)",
                                boxShadow: barsVisible ? "0 0 12px rgba(168,85,247,0.6)" : "none",
                              }
                            : {
                                background: "rgba(255,255,255,0.25)",
                              }),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advantage callout */}
            {advantage > 0 && (
              <div
                className="mt-8 rounded-xl p-5 text-center"
                style={{
                  background: "rgba(168,85,247,0.1)",
                  border: "1px solid rgba(168,85,247,0.25)",
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5" style={{ color: "#A855F7" }} />
                  <span className="text-white font-bold text-lg">
                    {t("calculator.advantage_prefix")}{" "}
                    <span className="text-xl" style={{ color: "#A855F7" }}>{formatCurrency(animatedAdvantage, lang)}</span>{" "}
                    {t("calculator.advantage_suffix")}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#C4B5FD" }}>
                  {t("calculator.advantage_desc")}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs mt-6 text-center" style={{ color: "rgba(196,181,253,0.6)" }}>
              {t("calculator.disclaimer")}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
