import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

export const SummerPromoPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md w-[95vw] sm:w-full mx-auto border-none text-white overflow-hidden p-0" style={{ background: 'linear-gradient(160deg, #c084fc, #a855f7 40%, #d946ef)' }}>
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 z-10 text-pink-200 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="p-8 sm:p-10 relative">
          {/* Decorative hearts */}
          <div className="absolute top-3 left-6 text-3xl opacity-60 animate-pulse">💗</div>
          <div className="absolute top-8 right-8 text-2xl opacity-50 animate-pulse" style={{ animationDelay: '0.5s' }}>💖</div>
          <div className="absolute bottom-6 left-8 text-xl opacity-40 animate-pulse" style={{ animationDelay: '1s' }}>❤️</div>
          <div className="absolute bottom-10 right-6 text-2xl opacity-50 animate-pulse" style={{ animationDelay: '0.3s' }}>💕</div>
          
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent"></div>
          
          <div className="text-center relative z-10">
            {/* Valentine's badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="text-2xl">💖</span>
              <span className="text-xs font-bold tracking-[0.3em] uppercase text-white">{t("summerPromo.title")}</span>
              <span className="text-2xl">💖</span>
            </div>
            
            {/* Discount */}
            <div className="mb-6">
              <div className="text-6xl sm:text-7xl font-bold tracking-tight mb-2 text-white drop-shadow-lg">
                {t("summerPromo.discount")}
              </div>
              <div className="text-sm font-bold text-white tracking-wide">
                {t("summerPromo.onAllSubs")}
              </div>
            </div>
            
            {/* Coupon code */}
            <div className="mb-6">
              <div className="text-xs text-white font-bold mb-2 tracking-wider uppercase">
                {t("summerPromo.discountCode")}
              </div>
              <div className="inline-block px-6 py-3 font-mono text-lg tracking-widest rounded font-semibold text-fuchsia-900" style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)' }}>
                {t("summerPromo.code")}
              </div>
            </div>
            
            {/* Instructions */}
            <p className="text-sm text-white font-bold">
              {t("summerPromo.enterCoupon")}
            </p>
          </div>
          
          {/* Bottom accent */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-300/50 to-transparent"></div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
