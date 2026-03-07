import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const Privacy = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Política de Privacidad" description="Política de privacidad de MusicDibs. Cómo protegemos y tratamos tus datos personales." path="/privacy" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t('privacy.title')}
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            {/* Legal Notice */}
            <h2 className="text-2xl font-bold text-white">{t('privacy.legal_notice_title')}</h2>
            <p className="text-white/80 leading-relaxed">{t('privacy.legal_notice_1')}</p>
            <p className="text-white/80">
              {t('privacy.legal_notice_contact')}: <a href="mailto:hello@icommunity.io" className="text-pink-400 hover:text-pink-300 underline">hello@iCommunity.io</a>
            </p>
            <p className="text-white/80">{t('privacy.legal_notice_2')}</p>
            <p className="text-white/80">{t('privacy.legal_notice_3')}</p>
            <p className="text-white/80">{t('privacy.legal_notice_4')}</p>
            <p className="text-white/80">{t('privacy.legal_notice_5')}</p>

            {/* Intellectual Property */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('privacy.ip_title')}</h2>
            <p className="text-white/80">{t('privacy.ip_1')}</p>
            <p className="text-white/80">{t('privacy.ip_2')}</p>
            <p className="text-white/80">{t('privacy.ip_3')}</p>
            <p className="text-white/80">{t('privacy.ip_4')}</p>
            <p className="text-white/80">{t('privacy.ip_5')}</p>
            <p className="text-white/80">{t('privacy.ip_6')}</p>
            <p className="text-white/80">{t('privacy.ip_7')}</p>

            {/* Registration and Contents */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('privacy.registration_title')}</h2>
            <p className="text-white/80">{t('privacy.registration_1')}</p>
            <p className="text-white/80">{t('privacy.registration_2')}</p>
            <p className="text-white/80">{t('privacy.registration_3')}</p>
            <p className="text-white/80">{t('privacy.registration_4')}</p>
            <p className="text-white/80">{t('privacy.registration_5')}</p>
            <p className="text-white/80">{t('privacy.registration_6')}</p>
            <p className="text-white/80">{t('privacy.registration_7')}</p>
            <p className="text-white/80">{t('privacy.registration_8')}</p>

            {/* Privacy and Data Protection */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('privacy.data_protection_title')}</h2>
            <p className="text-white/80">{t('privacy.data_protection_1')}</p>
            <p className="text-white/80">{t('privacy.data_protection_2')}</p>
            <p className="text-white/80">{t('privacy.data_protection_3')}</p>

            {/* Data We Collect */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('privacy.data_collect_title')}</h2>
            <p className="text-white/80">{t('privacy.data_collect_1')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_obtained_title')}</h3>
            <p className="text-white/80">{t('privacy.data_obtained_1')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_purpose_title')}</h3>
            <p className="text-white/80">{t('privacy.data_purpose_1')}</p>
            <p className="text-white/80">{t('privacy.data_purpose_2')}</p>
            <p className="text-white/80">{t('privacy.data_purpose_3')}</p>
            <p className="text-white/80">{t('privacy.data_purpose_4')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_retention_title')}</h3>
            <p className="text-white/80">{t('privacy.data_retention_1')}</p>
            <p className="text-white/80">{t('privacy.data_retention_2')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_legitimacy_title')}</h3>
            <p className="text-white/80">{t('privacy.data_legitimacy_1')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_recipients_title')}</h3>
            <p className="text-white/80">{t('privacy.data_recipients_1')}</p>
            <p className="text-white/80">{t('privacy.data_recipients_2')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('privacy.data_rights_title')}</h3>
            <p className="text-white/80">{t('privacy.data_rights_1')}</p>
            <p className="text-white/80">
              {t('privacy.data_rights_2')}: <a href="mailto:hello@icommunity.io" className="text-pink-400 hover:text-pink-300 underline">hello@icommunity.io</a>
            </p>
            <p className="text-white/80">{t('privacy.data_rights_3')}</p>
            <p className="text-white/80">{t('privacy.data_rights_4')}</p>

            {/* Contest Terms */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('privacy.contest_title')}</h2>

            <h3 className="text-xl font-semibold text-pink-300">1. {t('privacy.contest_org_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_org_desc')}</p>

            <h3 className="text-xl font-semibold text-pink-300">2. {t('privacy.contest_categories_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_categories_intro')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-1">
              <li>Rock</li>
              <li>Latina</li>
              <li>Urban</li>
              <li>Pop</li>
              <li>{t('privacy.contest_electronics')}</li>
              <li>{t('privacy.contest_other')}</li>
            </ul>
            <p className="text-white/80">{t('privacy.contest_peoples_choice')}</p>
            <p className="text-white/80">{t('privacy.contest_prizes')}</p>

            <h3 className="text-xl font-semibold text-pink-300">3. {t('privacy.contest_requirements_title')}</h3>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('privacy.contest_req_1')}</li>
              <li>{t('privacy.contest_req_2')}</li>
              <li>{t('privacy.contest_req_3')}</li>
            </ul>

            <h3 className="text-xl font-semibold text-pink-300">4. {t('privacy.contest_selection_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_selection_desc')}</p>

            <h3 className="text-xl font-semibold text-pink-300">5. {t('privacy.contest_ceremony_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_ceremony_desc')}</p>

            <h3 className="text-xl font-semibold text-pink-300">6. {t('privacy.contest_general_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_general_desc')}</p>

            <h3 className="text-xl font-semibold text-pink-300">7. {t('privacy.contest_data_title')}</h3>
            <p className="text-white/80">{t('privacy.contest_data_desc')}</p>

            {/* Copyright */}
            <div className="border-t border-white/20 pt-6 mt-10">
              <p className="text-white/60 text-sm">©iCommunity Labs Tech S.L. {t('privacy.all_rights')}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Privacy;
