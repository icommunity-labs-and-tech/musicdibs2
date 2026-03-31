import { useTranslation } from "react-i18next";

export const PromoBanner = () => {
  const { t } = useTranslation();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 py-2.5 px-4 text-center border-b border-fuchsia-400/30" style={{ background: 'linear-gradient(135deg, #c084fc, #a855f7, #d946ef)' }}>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">💖</span>
          <span className="text-xs font-bold tracking-widest uppercase text-white">{t("promoBanner.label")}</span>
          <span className="text-white/50">|</span>
          <span className="text-sm font-bold text-white">{t("promoBanner.text")}</span>
        </div>
        <div className="text-xs font-mono px-3 py-1 rounded tracking-wider text-fuchsia-900 font-semibold" style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)' }}>
          LOVE20
        </div>
      </div>
    </div>
  );
};
