import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";

const SLA = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Acuerdo de Nivel de Servicio" description="Consulta el SLA de MusicDibs: compromisos de disponibilidad, soporte y calidad del servicio." path="/sla" />
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t('sla.title')}
          </h1>

          <div className="prose prose-invert prose-pink max-w-none space-y-8">
            {/* Intro */}
            <p className="text-white/80 leading-relaxed">
              {t('sla.intro')}
            </p>

            <p className="text-white/80 leading-relaxed">
              {t('sla.validity')}
            </p>

            <p className="text-white/80 leading-relaxed">
              {t('sla.availability_note')}
            </p>

            {/* Purpose */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('sla.purpose_title')}</h2>

            <h3 className="text-xl font-semibold text-pink-300">{t('sla.covered_services_title')}</h3>
            <p className="text-white/80">{t('sla.covered_services_intro')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.service_1')}</li>
              <li>{t('sla.service_2')}</li>
              <li>{t('sla.service_3')}</li>
              <li>{t('sla.service_4')}</li>
              <li>{t('sla.service_5')}</li>
            </ul>

            {/* SLA Categories */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.categories_title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/20 text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.table_service')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.table_annual')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.table_monthly')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.table_single')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.annual_sub')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">✓</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.monthly_sub')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">✓</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">Single</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80"></td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Definitions */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.definitions_title')}</h3>
            <ul className="list-disc pl-6 text-white/80 space-y-3">
              <li><strong className="text-white">{t('sla.def_specialists')}:</strong> {t('sla.def_specialists_desc')}</li>
              <li><strong className="text-white">{t('sla.def_success')}:</strong> {t('sla.def_success_desc')}</li>
              <li><strong className="text-white">{t('sla.def_reports')}:</strong> {t('sla.def_reports_desc')}</li>
              <li><strong className="text-white">{t('sla.def_info')}:</strong> {t('sla.def_info_desc')}</li>
              <li><strong className="text-white">{t('sla.def_roadmap')}:</strong> {t('sla.def_roadmap_desc')}</li>
              <li><strong className="text-white">{t('sla.def_features')}:</strong> {t('sla.def_features_desc')}</li>
            </ul>

            {/* Availability */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('sla.availability_title')}</h2>

            <h3 className="text-xl font-semibold text-pink-300">{t('sla.time_availability_title')}</h3>
            <p className="text-white/80">{t('sla.time_availability_desc')}</p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/20 text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.table_service')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.operating_hours')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.annual_availability')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.annual_sub')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">24x7x365</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">98%</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.monthly_sub')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">24x7x365</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">98%</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">Single</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">24x7x365</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">58%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-white/80">{t('sla.availability_definition')}</p>

            {/* Maintenance */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.maintenance_title')}</h3>
            <p className="text-white/80">{t('sla.maintenance_desc')}</p>

            {/* Limitation */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.limitation_title')}</h3>
            <p className="text-white/80">{t('sla.limitation_intro')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.limitation_1')}</li>
              <li>{t('sla.limitation_2')}</li>
              <li>{t('sla.limitation_3')}</li>
              <li>{t('sla.limitation_4')}</li>
              <li>{t('sla.limitation_5')}</li>
            </ul>

            {/* Support */}
            <h2 className="text-2xl font-bold text-white mt-10">{t('sla.support_title')}</h2>
            <p className="text-white/80">{t('sla.support_intro')}</p>

            <h3 className="text-xl font-semibold text-pink-300">{t('sla.priorities_title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/20 text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.severity')}</th>
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.definition')}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P1</td>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.p1_desc')}</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P2</td>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.p2_desc')}</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P3</td>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.p3_desc')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Response times */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.response_times_title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/20 text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.response_time')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.monthly_sub')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.annual_sub')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">Single</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P1</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;24h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;24h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;24h</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P2</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;12h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;12h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;12h</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80 font-semibold">P3</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;4h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;4h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">&lt;4h</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-white/60 text-sm">{t('sla.response_times_note')}</p>

            {/* Support services */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.support_services_title')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-white/20 text-sm">
                <thead>
                  <tr className="bg-white/10">
                    <th className="border border-white/20 px-4 py-2 text-left">{t('sla.support_type')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.annual_sub')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">{t('sla.monthly_sub')}</th>
                    <th className="border border-white/20 px-4 py-2 text-center">Single</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.tech_support')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">1h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">4h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">12h</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.doubts')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">4h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">6h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">24h</td>
                  </tr>
                  <tr>
                    <td className="border border-white/20 px-4 py-2 text-white/80">{t('sla.other')}</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">4h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">6h</td>
                    <td className="border border-white/20 px-4 py-2 text-center text-white/80">24h</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Contact channels */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.contact_channels_title')}</h3>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.contact_channel_web')}</li>
              <li>{t('sla.contact_channel_email')}: <a href="mailto:info@musicdibs.com" className="text-pink-400 hover:text-pink-300 underline">info@musicdibs.com</a></li>
            </ul>

            {/* Scheduled outages */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.outages_title')}</h3>
            <p className="text-white/80">{t('sla.outages_intro')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.outage_1')}</li>
              <li>{t('sla.outage_2')}</li>
              <li>{t('sla.outage_3')}</li>
              <li>{t('sla.outage_4')}</li>
            </ul>
            <p className="text-white/80">{t('sla.outages_notification')}</p>

            <p className="text-white/80 mt-4">{t('sla.exclusions_intro')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.exclusion_1')}</li>
              <li>{t('sla.exclusion_2')}</li>
            </ul>

            {/* Incident info */}
            <h3 className="text-xl font-semibold text-pink-300">{t('sla.incident_title')}</h3>
            <p className="text-white/80">{t('sla.incident_intro')}</p>
            <p className="text-white/80">{t('sla.incident_note')}</p>
            <ul className="list-disc pl-6 text-white/80 space-y-2">
              <li>{t('sla.incident_1')}</li>
              <li>{t('sla.incident_2')}</li>
              <li>{t('sla.incident_3')}</li>
              <li>{t('sla.incident_4')}</li>
              <li>{t('sla.incident_5')}</li>
              <li>{t('sla.incident_6')}</li>
              <li>{t('sla.incident_7')}</li>
              <li>{t('sla.incident_8')}</li>
              <li>{t('sla.incident_9')}</li>
              <li>{t('sla.incident_10')}</li>
            </ul>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SLA;
