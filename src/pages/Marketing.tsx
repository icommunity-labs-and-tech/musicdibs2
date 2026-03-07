import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Palette, Megaphone, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";

const Marketing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const goToContact = () => {
    navigate("/contact?reason=marketing_interest");
  };

  return (
    <div className="min-h-screen page-bg">
      <SEO title="Marketing y Promoción" description="Impulsa tu música con servicios profesionales de diseño de portadas, vídeos y promoción en redes sociales." path="/marketing" />
      <Navbar />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {t("marketing.heading", "Servicios de Marketing")}
          </h1>
          <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto">
            {t("marketing.subheading", "Impulsa tu música con servicios profesionales de diseño y promoción.")}
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Service 1 — Covers & Videos */}
          <div className="relative group bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col hover:border-pink-500/40 transition-colors duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mb-6">
              <Palette className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-4">
              {t("marketing.covers_title", "Creación de portadas y vídeos")}
            </h2>
            <p className="text-white/70 leading-relaxed mb-8 flex-1">
              {t(
                "marketing.covers_desc",
                "Diseñamos portadas profesionales y vídeos promocionales para tus lanzamientos y distribución. Dale a tu música la imagen que merece con material visual de alta calidad, listo para todas las plataformas."
              )}
            </p>
            <Button variant="hero" size="lg" className="w-full font-semibold group/btn" onClick={goToContact}>
              <span className="flex items-center gap-2 justify-center">
                {t("marketing.cta", "Me interesa")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </span>
            </Button>
          </div>

          {/* Service 2 — Social Media Promos */}
          <div className="relative group bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col hover:border-pink-500/40 transition-colors duration-300">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-4">
              {t("marketing.promos_title", "Planes de promoción en RRSS")}
            </h2>
            <p className="text-white/70 leading-relaxed mb-8 flex-1">
              {t(
                "marketing.promos_desc",
                "Llega a más de 300.000 seguidores con planes de promoción adicionales en nuestras redes sociales. Amplifica el alcance de tu música más allá de lo incluido en tu suscripción, con campañas diseñadas para maximizar tu visibilidad."
              )}
            </p>
            <Button variant="hero" size="lg" className="w-full font-semibold group/btn" onClick={goToContact}>
              <span className="flex items-center gap-2 justify-center">
                {t("marketing.cta", "Me interesa")}
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </span>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Marketing;
