import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, TrendingUp, Music, DollarSign } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

const COMPETITORS = [
  { key: "musicdibs", rate: 0.95, color: "from-purple-500 to-pink-500", highlight: true },
  { key: "distrokid", rate: 0.80, color: "from-gray-500 to-gray-600", highlight: false },
  { key: "cdbaby", rate: 0.85, color: "from-gray-500 to-gray-600", highlight: false },
  { key: "tunecore", rate: 0.80, color: "from-gray-500 to-gray-600", highlight: false },
];

// Average pay per stream across major DSPs (weighted average)
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

export const RoyaltiesCalculator = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || i18n.language;
  const [streams, setStreams] = useState(100_000);

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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStreams(Number(e.target.value));
  };

  return (
    <section className="py-20 bg-gradient-to-b from-background to-muted/30 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Calculator className="w-4 h-4" />
              {t("calculator.badge")}
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("calculator.title")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t("calculator.subtitle")}
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <div className="bg-card border border-border rounded-2xl shadow-xl p-6 md:p-10">
            {/* Streams input */}
            <div className="mb-10">
              <label className="flex items-center gap-2 text-foreground font-semibold text-lg mb-4">
                <Music className="w-5 h-5 text-primary" />
                {t("calculator.streams_label")}
              </label>

              {/* Preset buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                {STREAM_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setStreams(preset)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      streams === preset
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
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
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1K</span>
                  <span>5M</span>
                </div>
              </div>

              {/* Current value display */}
              <div className="mt-4 text-center">
                <span className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {formatNumber(streams, lang)}
                </span>
                <span className="text-muted-foreground ml-2 text-lg">streams</span>
              </div>
            </div>

            {/* Results comparison */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-foreground font-semibold text-lg">
                  {t("calculator.results_title")}
                </h3>
              </div>

              {results.map((r) => {
                const maxEarnings = results[0].earnings;
                const barWidth = maxEarnings > 0 ? (r.earnings / maxEarnings) * 100 : 0;

                return (
                  <div
                    key={r.key}
                    className={`relative rounded-xl p-4 transition-all ${
                      r.highlight
                        ? "bg-primary/5 border-2 border-primary/30 shadow-sm"
                        : "bg-muted/50 border border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${r.highlight ? "text-primary text-lg" : "text-foreground"}`}>
                          {t(`calculator.competitors.${r.key}`)}
                        </span>
                        {r.highlight && (
                          <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                            {t("calculator.recommended")}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ({r.percentage}% {t("calculator.royalties")})
                        </span>
                      </div>
                      <span className={`font-bold text-lg ${r.highlight ? "text-primary" : "text-foreground"}`}>
                        {formatCurrency(r.earnings, lang)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${r.color} transition-all duration-700 ease-out`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Advantage callout */}
            {advantage > 0 && (
              <div className="mt-8 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-bold text-lg">
                    {t("calculator.advantage_prefix")}{" "}
                    <span className="text-primary text-xl">{formatCurrency(advantage, lang)}</span>{" "}
                    {t("calculator.advantage_suffix")}
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {t("calculator.advantage_desc")}
                </p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground mt-6 text-center">
              {t("calculator.disclaimer")}
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
