import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Handshake, Building2, Users, Mic2, Globe, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useTranslation } from "react-i18next";

const partnerTypeIcons = [Building2, Users, Mic2, Globe];
const partnerTypeKeys = ['distributors', 'managers', 'labels', 'platforms'] as const;
const benefitIcons = [Shield, Zap, TrendingUp];
const benefitKeys = ['whitelabel', 'api', 'flexible'] as const;

const Partners = () => {
  const { t } = useTranslation();
  const p = (key: string) => t(`privacy.partners_page.${key}`);

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Partners" description={p('subtitle')} path="/partners" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-5 py-2 mb-6">
              <Handshake className="w-5 h-5 text-pink-400" />
              <span className="text-pink-300 text-sm font-medium">{p('badge')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              {p('title')}
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              {p('subtitle')}
            </p>
            <Link to="/contact?reason=partner_proposal">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  {p('cta')} <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>

          {/* Partner types */}
          <h2 className="text-3xl font-bold text-center mb-12">{p('who_title')}</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {partnerTypeKeys.map((key, i) => {
              const Icon = partnerTypeIcons[i];
              return (
                <div
                  key={key}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{p(`types.${key}.title`)}</h3>
                  <p className="text-white/70 leading-relaxed">{p(`types.${key}.desc`)}</p>
                </div>
              );
            })}
          </div>

          {/* Benefits */}
          <h2 className="text-3xl font-bold text-center mb-12">{p('benefits_title')}</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {benefitKeys.map((key, i) => {
              const Icon = benefitIcons[i];
              return (
                <div
                  key={key}
                  className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-5">
                    <Icon className="w-7 h-7 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3">{p(`benefits.${key}.title`)}</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{p(`benefits.${key}.desc`)}</p>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-white/10 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{p('cta_title')}</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              {p('cta_desc')}
            </p>
            <Link to="/contact?reason=partner_proposal">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  {p('cta_button')} <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Partners;
