import { useTranslation } from "react-i18next";
import { Check, X, Minus } from "lucide-react";

const competitors = ["musicdibs", "distrokid", "cdbaby", "tunecore"] as const;

const featureRows = [
  { key: "royalties", values: ["95%", "80%", "85%", "80%"] },
  { key: "annual_fee", values: ["highlight", "yes", "no", "yes"] },
  { key: "per_release_fee", values: ["no", "no", "yes", "yes"] },
  { key: "blockchain_cert", values: ["yes", "no", "no", "no"] },
  { key: "social_promo", values: ["yes", "no", "no", "no"] },
  { key: "cover_design", values: ["yes", "no", "no", "no"] },
  { key: "unlimited_releases", values: ["yes", "yes", "no", "no"] },
  { key: "youtube_content_id", values: ["yes", "paid", "paid", "paid"] },
  { key: "copyright_protection", values: ["yes", "no", "no", "no"] },
  { key: "platforms", values: ["220+", "150+", "150+", "150+"] },
] as const;

function CellValue({ value, t }: { value: string; t: (key: string) => string }) {
  if (value === "yes") return <Check className="w-5 h-5 text-emerald-400 mx-auto" />;
  if (value === "no") return <X className="w-5 h-5 text-red-400/60 mx-auto" />;
  if (value === "paid") return <span className="text-yellow-400 text-xs font-medium">{t("compare.paid")}</span>;
  if (value === "highlight") return <span className="text-emerald-400 font-bold text-sm">{t("compare.included")}</span>;
  return <span className="text-white font-semibold text-sm">{value}</span>;
}

export const ComparisonTable = () => {
  const { t } = useTranslation();

  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h3 className="text-3xl md:text-4xl font-bold text-white text-center mb-3">
          {t("compare.title")}
        </h3>
        <p className="text-white/70 text-center mb-10 max-w-2xl mx-auto">
          {t("compare.subtitle")}
        </p>

        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            {/* Header */}
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-white/60 font-medium min-w-[160px]">
                  {t("compare.feature")}
                </th>
                {competitors.map((c) => (
                  <th
                    key={c}
                    className={`p-4 text-center min-w-[110px] ${
                      c === "musicdibs"
                        ? "bg-pink-500/20 border-x border-pink-500/30"
                        : ""
                    }`}
                  >
                    <span
                      className={`font-bold text-sm ${
                        c === "musicdibs" ? "text-pink-400" : "text-white/80"
                      }`}
                    >
                      {t(`compare.competitors.${c}`)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {featureRows.map((row, i) => (
                <tr
                  key={row.key}
                  className={`border-b border-white/5 ${
                    i % 2 === 0 ? "bg-white/[0.02]" : ""
                  }`}
                >
                  <td className="p-4 text-white/80 font-medium">
                    {t(`compare.features.${row.key}`)}
                  </td>
                  {row.values.map((val, j) => (
                    <td
                      key={j}
                      className={`p-4 text-center ${
                        j === 0
                          ? "bg-pink-500/10 border-x border-pink-500/20"
                          : ""
                      }`}
                    >
                      <CellValue value={val} t={t} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-white/40 text-xs text-center mt-4">
          {t("compare.disclaimer")}
        </p>
      </div>
    </section>
  );
};
