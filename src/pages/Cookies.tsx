import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const Cookies = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Política de Cookies" description="Política de cookies de MusicDibs. Información sobre las cookies que utilizamos en nuestra web." path="/cookies" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("cookies.title")}
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            <p className="text-white/80 leading-relaxed">{t("cookies.intro")}</p>

            <h2 className="text-2xl font-bold text-white">{t("cookies.what_title")}</h2>
            <p className="text-white/80">{t("cookies.what_text")}</p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("cookies.types_title")}</h2>
            <p className="text-white/80">
              {t("cookies.types_text")}{' '}
              <a href="https://www.aepd.es/sites/default/files/2020-07/guia-cookies.pdf" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">{t("cookies.types_link")}</a>.
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("cookies.used_title")}</h2>
            <p className="text-white/80">{t("cookies.used_intro")}</p>
            <p className="text-white/80">
              <strong>{t("cookies.technical_title")}</strong> {t("cookies.technical_text")}
            </p>
            <p className="text-white/80">
              <strong>{t("cookies.personalization_title")}</strong> {t("cookies.personalization_text")}
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("cookies.acceptance_title")}</h2>
            <p className="text-white/80">{t("cookies.acceptance_text")}</p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("cookies.modify_title")}</h2>
            <p className="text-white/80">{t("cookies.modify_text")}</p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("cookies.updates_title")}</h2>
            <p className="text-white/80">{t("cookies.updates_text")}</p>

            <p className="text-white/80 mt-6">{t("cookies.date")}</p>

            <div className="border-t border-white/20 pt-6 mt-10">
              <p className="text-white/60 text-sm">{t("cookies.copyright")}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Cookies;
