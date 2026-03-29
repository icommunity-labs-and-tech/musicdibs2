import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation, Trans } from "react-i18next";
import { getFooterLinks } from "@/i18nLinks";
import { Link, useNavigate } from "react-router-dom";
import { ComparisonTable } from "@/components/ComparisonTable";
import { useABTest, trackABClick } from "@/hooks/useABTest";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Base prices in EUR
const BASE_PRICES = {
  annual: 59.90,
  monthly: 6.90,
  individual: 11.90,
  signupFee: 6.90,
};

// Approximate exchange rates from EUR
const CURRENCY_CONFIG: Record<string, { symbol: string; rate: number; position: 'before' | 'after'; decimal: string }> = {
  es: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  en: { symbol: '$', rate: 1.08, position: 'before', decimal: '.' },
  'pt-BR': { symbol: 'R$', rate: 5.50, position: 'before', decimal: ',' },
  fr: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  it: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
  de: { symbol: '€', rate: 1, position: 'after', decimal: ',' },
};

function formatPrice(amount: number, lang: string): string {
  const config = CURRENCY_CONFIG[lang] || CURRENCY_CONFIG['es'];
  const converted = amount * config.rate;
  const [whole, dec] = converted.toFixed(2).split('.');
  const formatted = whole + config.decimal + dec;
  return config.position === 'before'
    ? `${config.symbol}${formatted}`
    : `${formatted} ${config.symbol}`;
}

export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lang = i18n.resolvedLanguage || i18n.language;
  const links = getFooterLinks(lang);

  const handleCheckout = useCallback(async (planId: 'annual' | 'monthly' | 'individual') => {
    if (!user) {
      navigate('/login', { state: { returnTo: '/#pricing-section' } });
      return;
    }
    setLoadingPlan(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-credit-checkout', {
        body: { planId },
      });
      if (error) throw error;
      if (data?.already_subscribed) {
        toast.info(data.message || 'Ya estás suscrito a este plan.');
        return;
      }
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al iniciar el pago');
    } finally {
      setLoadingPlan(null);
    }
  }, [user, navigate]);

  const ctaBuy = useABTest({
    id: 'pricing_cta_buy',
    variants: [
      { text: t("pricing.buyNow"), className: '' },
      { text: '🎶 Quiero distribuir mi música', className: '' },
      { text: 'Comenzar ahora', className: 'bg-yellow-400 text-black hover:bg-yellow-300 border-0' },
    ],
  });

  const prices = useMemo(() => ({
    annual: formatPrice(BASE_PRICES.annual, lang),
    monthly: formatPrice(BASE_PRICES.monthly, lang),
    individual: formatPrice(BASE_PRICES.individual, lang),
    signupFee: formatPrice(BASE_PRICES.signupFee, lang),
  }), [lang]);

  return (
    <section id="pricing-section" className="py-20 px-4 bg-gradient-to-b from-primary/60 via-primary to-purple-600">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          {t("pricing.title")}
        </h2>
        <p className="text-xl text-white/90 mb-12 max-w-4xl mx-auto">
          {t("pricing.subtitle")}
        </p>

        {/* Toggle Switch */}
        <div className="flex items-center justify-center mb-12">
          <span className={`mr-4 text-lg font-medium ${!isAnnual ? 'text-white' : 'text-white/70'}`}>
            {t("pricing.toggleBasic")}
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="relative inline-flex h-8 w-16 items-center rounded-full bg-white/20 transition-colors"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isAnnual ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`ml-4 text-lg font-medium ${isAnnual ? 'text-white' : 'text-white/70'}`}>
            {t("pricing.togglePlus")}
          </span>
        </div>

        {/* Pricing Card */}
        <div className="flex justify-center mb-16">
          <Card className={`w-full max-w-md border-0 text-white ${
            isAnnual 
              ? "bg-gradient-to-b from-pink-500 to-pink-600" 
              : "bg-gradient-to-b from-teal-500 to-teal-600"
          }`}>
            <CardContent className="p-8">
              <div className="text-center mb-6">
                {isAnnual && (
                  <div className="bg-yellow-400 text-pink-600 font-bold text-sm px-4 py-2 rounded-full mb-3 inline-block">
                    {t("pricing.badgeAnnual")}
                  </div>
                )}
                <div className="text-4xl font-bold mb-2">
                  {isAnnual ? prices.annual : prices.monthly}
                  <span className="text-xl font-normal">
                    {isAnnual ? t("pricing.priceAnnualSuffix") : t("pricing.priceMonthlySuffix")}
                  </span>
                </div>
                {!isAnnual && (
                  <p className="text-sm text-white/90">
                    {t("pricing.signupFeeNote_dynamic", { price: prices.signupFee, defaultValue: `${t("pricing.signupFeeNote")}` })}
                  </p>
                )}
              </div>

              <div className="space-y-3 mb-8 text-left">
                {(() => {
                  const featureList = t(`pricing.features.${isAnnual ? 'annual' : 'monthly'}`, { returnObjects: true }) as string[];
                  return featureList.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center mt-0.5 flex-shrink-0">
                        <svg className={`w-3 h-3 ${isAnnual ? 'text-pink-500' : 'text-teal-500'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-sm leading-relaxed">{feature}</span>
                    </div>
                  ));
                })()}
              </div>

              <Button 
                className={`w-full bg-white hover:bg-white/90 font-semibold py-3 rounded-full ${
                  isAnnual ? 'text-pink-600' : 'text-teal-600'
                } ${ctaBuy.className}`}
                disabled={loadingPlan !== null}
                onClick={() => {
                  trackABClick('pricing_cta_buy', ctaBuy.variantIndex, ctaBuy.text);
                  handleCheckout(isAnnual ? 'annual' : 'monthly');
                }}
              >
                {loadingPlan === (isAnnual ? 'annual' : 'monthly') ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                {ctaBuy.text}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Individual Registration Option */}
        <div className="text-center">
          <h3 className="text-2xl font-bold text-white mb-4">
            {t("pricing.indivTitle")}
          </h3>
          <p className="text-lg text-white/90 mb-6">
            {t("pricing.indivSubtitle_dynamic", { price: prices.individual, defaultValue: t("pricing.indivSubtitle") })}
          </p>
          <Button 
            variant="outline" 
            className="bg-transparent border-2 border-teal-400 text-teal-400 hover:bg-teal-400 hover:text-white px-8 py-3 rounded-full font-semibold"
            disabled={loadingPlan !== null}
            onClick={() => handleCheckout('individual')}
          >
            {loadingPlan === 'individual' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
            {t("pricing.indivButton")}
          </Button>
          
          {/* Legal Text */}
          <div className="mt-12 max-w-4xl mx-auto text-white/80 text-sm space-y-4">
            <p className="font-medium text-lg text-white">
              <Trans i18nKey="pricing.legalPros" components={{ contact: <Link to="/contact" className="text-teal-400 hover:text-teal-300 underline" /> }} />
            </p>
            
            <div className="space-y-2">
            
            <p className="leading-relaxed text-xs">
              {t("pricing.conditionsText")}
            </p>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <ComparisonTable />
      </div>
    </section>
  );
};