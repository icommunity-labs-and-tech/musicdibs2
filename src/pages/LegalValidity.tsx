import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Shield, Lock, Globe, FileCheck, Link as LinkIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const LegalValidity = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Validez Legal" description="Conoce la validez legal de los certificados blockchain de MusicDibs para proteger tus derechos de autor." path="/legal-validity" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("legalValidity.title")}
          </h1>
          <p className="text-white/70 text-center text-lg mb-16 max-w-2xl mx-auto">
            {t("legalValidity.subtitle")}
          </p>

          {/* Legal Framework */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Shield className="w-6 h-6 text-pink-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t("legalValidity.framework_title")}</h2>
            </div>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">{t("legalValidity.berne_title")}</strong> {t("legalValidity.berne_desc")}{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/berne/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">{t("legalValidity.wipo_title")}</strong> {t("legalValidity.wipo_desc")}{" "}
                  <a href="https://www.wipo.int/treaties/es/ip/wct/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">{t("legalValidity.eu_directive_title")}</strong>.{" "}
                  <a href="https://digital-strategy.ec.europa.eu/es/policies/copyright" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline inline-flex items-center gap-1">
                    {t("legalValidity.view_here")} <LinkIcon className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <FileCheck className="w-5 h-5 text-pink-400 mt-1 shrink-0" />
                <span className="text-white/80">
                  <strong className="text-white">{t("legalValidity.blockchain_regulation_title")}</strong>.
                </span>
              </li>
            </ul>
            <p className="text-white/70 mt-6 border-t border-white/10 pt-6">
              {t("legalValidity.framework_footer")}
            </p>
          </div>

          {/* Blockchain */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Lock className="w-6 h-6 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t("legalValidity.blockchain_title")}</h2>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              <a href="https://www.youtube.com/watch?v=Yn8WGaO__ak" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">{t("legalValidity.blockchain_link_text")}</a>{' '}
              — {t("legalValidity.blockchain_text_1")}
            </p>
            <p className="text-white/80 leading-relaxed">
              {t("legalValidity.blockchain_text_2")}
            </p>
          </div>

          {/* Identity Verification */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">{t("legalValidity.identity_title")}</h2>
            </div>
            <p className="text-white/80 leading-relaxed mb-4">
              {t("legalValidity.identity_text_1")}
            </p>
            <p className="text-white/80 leading-relaxed">
              {t("legalValidity.identity_text_2")}
            </p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default LegalValidity;
