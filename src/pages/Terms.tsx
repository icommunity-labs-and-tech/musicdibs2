import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const Terms = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Términos y Condiciones" description="Términos y condiciones de uso de MusicDibs. Lee nuestras condiciones antes de usar el servicio." path="/terms" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("terms.title")}
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            <h2 className="text-2xl font-bold text-white">{t("terms.general_purchase_title")}</h2>
            <h3 className="text-xl font-semibold text-pink-300">{t("terms.general_conditions_title")}</h3>
            <p className="text-white/80 leading-relaxed">
              {t("terms.general_conditions_text")}
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("terms.refund_title")}</h2>
            <p className="text-white/80">{t("terms.refund_intro")}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.purchase_process_title")}</h3>
            <p className="text-white/80">{t("terms.purchase_process_text")}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.warranty_title")}</h3>
            <p className="text-white/80">
              {t("terms.warranty_text")}{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              {t("terms.warranty_text_end")}
            </p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.cancellation_title")}</h3>
            <p className="text-white/80">
              {t("terms.cancellation_text")}{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              {t("terms.cancellation_text_end")}
            </p>
            <p className="text-white/80">
              <strong>{t("terms.cancellation_important")}</strong>
            </p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.refunds_title")}</h3>
            <p className="text-white/80">
              {t("terms.refunds_text")} <strong>{t("terms.refunds_promo")}</strong> {t("terms.refunds_request")}{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>{' '}
              {t("terms.refunds_request_end")}
            </p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("terms.subscription_title")}</h2>
            <p className="text-white/80">{t("terms.subscription_text")}</p>
            <p className="text-white/80">
              <strong>{t("terms.subscription_important")}</strong>
            </p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.abuse_title")}</h3>
            <p className="text-white/80">{t("terms.abuse_text")}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t("terms.nfts_title")}</h3>
            <p className="text-white/80">{t("terms.nfts_text")}</p>

            <h2 className="text-2xl font-bold text-white mt-10">{t("terms.icom_title")}</h2>
            <p className="text-white/80">
              {t("terms.icom_text")}{' '}
              <a href="https://www.icommunity.io/icom/en/" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 underline">icommunity.io/icom</a>.
            </p>
            <p className="text-white/80">{t("terms.icom_steps_intro")}</p>
            <ol className="list-decimal pl-6 text-white/80 space-y-2">
              <li>{t("terms.icom_step1")}</li>
              <li>{t("terms.icom_step2")}</li>
            </ol>

            <h2 className="text-2xl font-bold text-white mt-10">{t("terms.offers_title")}</h2>
            <p className="text-white/80">{t("terms.offers_text")}</p>

            <h3 className="text-xl font-semibold text-pink-300 mt-10">{t("terms.contact_title")}</h3>
            <p className="text-white/80">
              {t("terms.contact_text")}{' '}
              <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a>
            </p>

            <div className="border-t border-white/20 pt-6 mt-10">
              <p className="text-white/60 text-sm">{t("terms.copyright")}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Terms;
