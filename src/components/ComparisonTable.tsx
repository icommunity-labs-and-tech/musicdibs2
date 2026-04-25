import { useTranslation } from "react-i18next";
import { Check, X, Sparkles, Minus } from "lucide-react";

const competitors = [
  "musicdibs",
  "suno",
  "ozone",
  "distrokid",
  "traditional",
] as const;

type Cell = "yes" | "no" | "partial";

const featureRows: { key: string; values: [Cell, Cell, Cell, Cell, Cell] }[] = [
  { key: "create_ai",        values: ["yes", "yes",     "no", "no", "no"] },
  { key: "mastering",        values: ["yes", "partial", "yes", "no", "no"] },
  { key: "lyrics",           values: ["yes", "partial", "no", "no", "no"] },
  { key: "covers",           values: ["yes", "no",      "no", "no", "no"] },
  { key: "videos",           values: ["yes", "no",      "no", "no", "no"] },
  { key: "ip_register",      values: ["yes", "no",      "no", "no", "yes"] },
  { key: "blockchain_cert",  values: ["yes", "no",      "no", "no", "no"] },
  { key: "distribution",     values: ["yes", "no",      "no", "yes", "no"] },
  { key: "social_promo",     values: ["yes", "no",      "no", "no", "no"] },
  { key: "all_in_one",       values: ["yes", "no",      "no", "no", "no"] },
];

function CellValue({
  value,
  t,
  isHero,
}: {
  value: Cell;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
  isHero: boolean;
}) {
  if (value === "yes") {
    return (
      <Check
        className={`mx-auto ${
          isHero ? "w-7 h-7 text-emerald-300" : "w-6 h-6 text-emerald-400"
        }`}
        strokeWidth={3}
      />
    );
  }
  if (value === "no") {
    return (
      <X
        className="mx-auto w-6 h-6 text-rose-400/80"
        strokeWidth={3}
      />
    );
  }
  // partial
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
      style={{
        background: "rgba(251,191,36,0.15)",
        border: "1px solid rgba(251,191,36,0.45)",
        color: "#fcd34d",
      }}
    >
      <Minus className="w-3 h-3" strokeWidth={3} />
      {t("compare.partial", "Parcial")}
    </span>
  );
}

export const ComparisonTable = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-3">
            {t("compare.title")}
          </h3>
          <p className="text-white/75 text-base md:text-lg max-w-2xl mx-auto">
            {t("compare.subtitle")}
          </p>
        </div>

        {/* Glass dark premium card */}
        <div
          className="relative rounded-2xl overflow-hidden backdrop-blur-xl"
          style={{
            background:
              "linear-gradient(160deg, rgba(30,16,55,0.85) 0%, rgba(20,12,45,0.9) 50%, rgba(35,20,65,0.85) 100%)",
            border: "1px solid rgba(168,85,247,0.25)",
            boxShadow:
              "0 25px 70px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(236,72,153,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[860px]">
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 100%)",
                  }}
                >
                  <th className="text-left px-5 pt-7 pb-5 text-white/60 font-semibold text-xs uppercase tracking-widest min-w-[210px]">
                    {t("compare.feature")}
                  </th>
                  {competitors.map((c) => {
                    const isHero = c === "musicdibs";
                    return (
                      <th
                        key={c}
                        className={`px-3 ${isHero ? "pt-5" : "pt-9"} pb-5 text-center min-w-[140px] align-bottom`}
                        style={
                          isHero
                            ? {
                                background:
                                  "linear-gradient(180deg, rgba(236,72,153,0.18) 0%, rgba(168,85,247,0.18) 100%)",
                                borderLeft:
                                  "1px solid rgba(236,72,153,0.55)",
                                borderRight:
                                  "1px solid rgba(236,72,153,0.55)",
                                boxShadow:
                                  "inset 0 1px 0 rgba(236,72,153,0.45)",
                              }
                            : undefined
                        }
                      >
                        {isHero && (
                          <div className="flex justify-center mb-2">
                            <span
                              className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-white whitespace-nowrap"
                              style={{
                                background:
                                  "linear-gradient(90deg, #ec4899, #a855f7)",
                                boxShadow:
                                  "0 6px 18px rgba(236,72,153,0.55)",
                              }}
                            >
                              <Sparkles className="w-3 h-3" />
                              {t("compare.recommended", "Todo en uno")}
                            </span>
                          </div>
                        )}
                        <span
                          className={`block font-bold ${
                            isHero
                              ? "text-base md:text-lg bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent"
                              : "text-sm md:text-[15px] text-white/70"
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
                        background: isAlt
                          ? "rgba(255,255,255,0.03)"
                          : "transparent",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <td className="px-5 py-4 text-white/90 font-medium text-sm md:text-[15px] text-left">
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
                                      "linear-gradient(180deg, rgba(236,72,153,0.10) 0%, rgba(168,85,247,0.10) 100%)",
                                    borderLeft:
                                      "1px solid rgba(236,72,153,0.55)",
                                    borderRight:
                                      "1px solid rgba(236,72,153,0.55)",
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
                  <td className="p-0" />
                  {competitors.map((c, idx) => (
                    <td
                      key={c}
                      className="p-0"
                      style={
                        idx === 0
                          ? {
                              borderLeft: "1px solid rgba(236,72,153,0.55)",
                              borderRight: "1px solid rgba(236,72,153,0.55)",
                              borderBottom:
                                "1px solid rgba(236,72,153,0.55)",
                              height: 0,
                            }
                          : undefined
                      }
                    />
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-white/55 text-xs md:text-sm text-center mt-6 max-w-2xl mx-auto">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};
