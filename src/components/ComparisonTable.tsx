import { useTranslation } from "react-i18next";
import { Check, X, Sparkles } from "lucide-react";

const competitors = ["musicdibs", "distrokid", "cdbaby", "tunecore"] as const;

const featureRows = [
  { key: "royalties", values: ["95%", "80%", "85%", "80%"] },
  { key: "annual_fee", values: ["highlight", "yes", "no", "yes"] },
  { key: "per_release_fee", values: ["highlight", "no", "yes", "yes"] },
  { key: "blockchain_cert", values: ["yes", "no", "no", "no"] },
  { key: "social_promo", values: ["yes", "no", "no", "no"] },
  { key: "cover_design", values: ["yes", "no", "no", "no"] },
  { key: "unlimited_releases", values: ["yes", "yes", "no", "no"] },
  { key: "copyright_protection", values: ["yes", "no", "no", "no"] },
  { key: "platforms", values: ["220+", "150+", "150+", "150+"] },
] as const;

function CellValue({
  value,
  t,
  isHero,
}: {
  value: string;
  t: (key: string) => string;
  isHero: boolean;
}) {
  if (value === "yes")
    return (
      <Check
        className={`mx-auto ${
          isHero ? "w-6 h-6 text-emerald-400" : "w-5 h-5 text-emerald-400/90"
        }`}
        strokeWidth={3}
      />
    );
  if (value === "no")
    return (
      <X
        className={`mx-auto ${
          isHero ? "w-6 h-6 text-red-400" : "w-5 h-5 text-red-400/80"
        }`}
        strokeWidth={3}
      />
    );
  if (value === "paid")
    return (
      <span className="text-yellow-300 text-xs sm:text-sm font-semibold">
        {t("compare.paid")}
      </span>
    );
  if (value === "highlight")
    return (
      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/40 text-emerald-300 font-bold text-[11px] sm:text-xs uppercase tracking-wide">
        {t("compare.included")}
      </span>
    );
  return (
    <span
      className={`font-bold ${
        isHero ? "text-white text-base sm:text-lg" : "text-white/85 text-sm sm:text-base"
      }`}
    >
      {value}
    </span>
  );
}

export const ComparisonTable = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {t("compare.title")}
          </h3>
          <p className="text-white/70 text-base md:text-lg max-w-2xl mx-auto">
            {t("compare.subtitle")}
          </p>
        </div>

        {/* Table card */}
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow:
              "0 20px 60px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left px-5 py-5 text-white/50 font-semibold text-xs uppercase tracking-wider min-w-[200px]">
                    {t("compare.feature")}
                  </th>
                  {competitors.map((c) => {
                    const isHero = c === "musicdibs";
                    return (
                      <th
                        key={c}
                        className="px-3 py-5 text-center min-w-[120px] relative"
                        style={
                          isHero
                            ? {
                                background:
                                  "linear-gradient(180deg, rgba(236,72,153,0.22) 0%, rgba(168,85,247,0.18) 100%)",
                                borderLeft: "1px solid rgba(236,72,153,0.4)",
                                borderRight: "1px solid rgba(236,72,153,0.4)",
                              }
                            : undefined
                        }
                      >
                        {isHero && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                            <span
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap"
                              style={{
                                background:
                                  "linear-gradient(90deg, #ec4899, #a855f7)",
                                boxShadow:
                                  "0 4px 14px rgba(236,72,153,0.5)",
                              }}
                            >
                              <Sparkles className="w-3 h-3" />
                              {t("compare.recommended", "Recomendado")}
                            </span>
                          </div>
                        )}
                        <span
                          className={`font-bold ${
                            isHero
                              ? "text-base md:text-lg text-white"
                              : "text-sm md:text-base text-white/60"
                          }`}
                        >
                          {t(`compare.competitors.${c}`)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {featureRows.map((row, i) => {
                  const isAlt = i % 2 === 1;
                  return (
                    <tr
                      key={row.key}
                      className="border-t border-white/[0.06]"
                      style={
                        isAlt
                          ? { background: "rgba(255,255,255,0.025)" }
                          : undefined
                      }
                    >
                      <td className="px-5 py-4 text-white/90 font-medium text-sm md:text-base text-left">
                        {t(`compare.features.${row.key}`)}
                      </td>
                      {row.values.map((val, j) => {
                        const isHero = j === 0;
                        return (
                          <td
                            key={j}
                            className="px-3 py-4 text-center"
                            style={
                              isHero
                                ? {
                                    background:
                                      "linear-gradient(180deg, rgba(236,72,153,0.10) 0%, rgba(168,85,247,0.08) 100%)",
                                    borderLeft:
                                      "1px solid rgba(236,72,153,0.25)",
                                    borderRight:
                                      "1px solid rgba(236,72,153,0.25)",
                                  }
                                : undefined
                            }
                          >
                            <CellValue value={val} t={t} isHero={isHero} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-white/50 text-xs md:text-sm text-center mt-6 max-w-2xl mx-auto">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};
