import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";

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

function CellValue({ value, t }: { value: string; t: (key: string) => string }) {
  if (value === "yes") return <Check className="w-4 h-4 text-emerald-400 mx-auto" />;
  if (value === "no") return <X className="w-4 h-4 text-red-400 mx-auto" />;
  if (value === "paid") return <span className="text-yellow-300 text-[11px] font-medium">{t("compare.paid")}</span>;
  if (value === "highlight") return <span className="text-emerald-400 font-bold text-xs">{t("compare.included")}</span>;
  return <span className="text-white font-semibold text-xs">{value}</span>;
}

export const ComparisonTable = () => {
  const { t } = useTranslation();

  return (
    <section className="pt-12 pb-4 px-2">
      <div className="max-w-3xl mx-auto">
        <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-2">
          {t("compare.title")}
        </h3>
        <p className="text-white/60 text-center mb-6 text-sm max-w-xl mx-auto">
          {t("compare.subtitle")}
        </p>

        <div className="overflow-x-auto rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-3 py-2.5 text-white/50 font-medium text-[11px] uppercase tracking-wider min-w-[120px]">
                  {t("compare.feature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c}
                    className={`px-2 py-2.5 text-center min-w-[80px] ${
                      c === "musicdibs" ? "bg-pink-500/15" : ""
                    }`}
                  >
                    <span className={`font-bold text-xs ${c === "musicdibs" ? "text-pink-400" : "text-white/60"}`}>
                      {t(`compare.competitors.${c}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                >
                  <td className="px-3 py-2 text-white font-medium text-xs text-left">
                    {t(`compare.features.${row.key}`)}
                  </td>
                  {row.values.map((val, j) => (
                    <td
                      key={j}
                      className={`px-2 py-2 text-center ${j === 0 ? "bg-pink-500/10" : ""}`}
                    >
                      <CellValue value={val} t={t} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-white text-[10px] text-center mt-3">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};