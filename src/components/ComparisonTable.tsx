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
          isHero ? "w-7 h-7 text-emerald-600" : "w-6 h-6 text-emerald-500"
        }`}
        strokeWidth={3}
      />
    );
  if (value === "no")
    return (
      <X
        className={`mx-auto ${
          isHero ? "w-7 h-7 text-rose-600" : "w-6 h-6 text-rose-500"
        }`}
        strokeWidth={3}
      />
    );
  if (value === "paid")
    return (
      <span className="text-amber-600 text-sm font-semibold">
        {t("compare.paid")}
      </span>
    );
  if (value === "highlight")
    return (
      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-700 font-bold text-[11px] sm:text-xs uppercase tracking-wide">
        {t("compare.included")}
      </span>
    );
  return (
    <span
      className={`font-bold ${
        isHero
          ? "text-slate-900 text-base sm:text-lg"
          : "text-slate-700 text-sm sm:text-base"
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
          <p className="text-white/80 text-base md:text-lg max-w-2xl mx-auto">
            {t("compare.subtitle")}
          </p>
        </div>

        {/* Light card on dark section */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "#ffffff",
            boxShadow:
              "0 25px 60px -15px rgba(0,0,0,0.45), 0 0 0 1px rgba(168,85,247,0.15)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[680px]">
              <thead>
                <tr style={{ background: "#f8f7fc" }}>
                  <th className="text-left px-5 py-5 text-slate-500 font-semibold text-xs uppercase tracking-wider min-w-[200px]">
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
                                  "linear-gradient(180deg, #fdf2fa 0%, #f5ecfd 100%)",
                                borderLeft: "2px solid #ec4899",
                                borderRight: "2px solid #ec4899",
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
                                  "0 4px 14px rgba(236,72,153,0.45)",
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
                              ? "text-base md:text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
                              : "text-sm md:text-base text-slate-600"
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
                      style={{
                        background: isAlt ? "#faf9fc" : "#ffffff",
                        borderTop: "1px solid #ececf3",
                      }}
                    >
                      <td className="px-5 py-4 text-slate-800 font-semibold text-sm md:text-base text-left">
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
                                    background: isAlt
                                      ? "linear-gradient(180deg, #fdf2fa 0%, #f5ecfd 100%)"
                                      : "linear-gradient(180deg, #fef5fb 0%, #f8f0fe 100%)",
                                    borderLeft: "2px solid #ec4899",
                                    borderRight: "2px solid #ec4899",
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
                {/* Bottom border for hero column */}
                <tr>
                  <td colSpan={5} style={{ height: 0, padding: 0 }}>
                    <div className="h-0" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-white/60 text-xs md:text-sm text-center mt-6 max-w-2xl mx-auto">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};
