import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Handshake, Building2, Users, Mic2, Globe, ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

const partnerTypes = [
  {
    icon: Building2,
    title: "Distribuidoras",
    description: "Integra nuestra tecnología de registro blockchain en tu catálogo. Ofrece a tus artistas protección de autoría certificada como valor añadido a tu servicio de distribución.",
  },
  {
    icon: Users,
    title: "Managers y Agentes",
    description: "Protege las creaciones de tus artistas desde el primer momento. Añade certificación blockchain a tu portfolio de servicios y diferénciate en el mercado.",
  },
  {
    icon: Mic2,
    title: "Sellos Discográficos",
    description: "Asegura los derechos de tu catálogo con tecnología inmutable. Integra nuestras herramientas de registro y verificación en tu flujo de trabajo.",
  },
  {
    icon: Globe,
    title: "Plataformas y Servicios Musicales",
    description: "Desde academias hasta plataformas de sync licensing, cualquier entidad del ecosistema musical puede beneficiarse de acuerdos comerciales y marca blanca.",
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Marca Blanca",
    description: "Personaliza la plataforma con tu imagen corporativa y ofrécela como un servicio propio a tus clientes.",
  },
  {
    icon: Zap,
    title: "Integración API",
    description: "Conecta nuestras herramientas de certificación directamente con tus sistemas y procesos existentes.",
  },
  {
    icon: TrendingUp,
    title: "Modelo de Negocio Flexible",
    description: "Estructuramos acuerdos comerciales adaptados a tu volumen y necesidades específicas.",
  },
];

const Partners = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/20 rounded-full px-5 py-2 mb-6">
              <Handshake className="w-5 h-5 text-pink-400" />
              <span className="text-pink-300 text-sm font-medium">Programa de Partners</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
              Crece con Musicdibs
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Ofrecemos acuerdos comerciales y soluciones de marca blanca para entidades del ecosistema musical que quieran integrar nuestra tecnología blockchain de certificación de autoría.
            </p>
            <Link to="/contact?reason=partner_proposal">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Solicitar información <ArrowRight className="w-5 h-5" />
                </span>
              </Button>
            </Link>
          </div>

          {/* Partner types */}
          <h2 className="text-3xl font-bold text-center mb-12">¿A quién va dirigido?</h2>
          <div className="grid md:grid-cols-2 gap-6 mb-20">
            {partnerTypes.map((type) => (
              <div
                key={type.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center mb-5">
                  <type.icon className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{type.title}</h3>
                <p className="text-white/70 leading-relaxed">{type.description}</p>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <h2 className="text-3xl font-bold text-center mb-12">Ventajas del programa</h2>
          <div className="grid md:grid-cols-3 gap-6 mb-20">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-5">
                  <benefit.icon className="w-7 h-7 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{benefit.title}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-white/10 rounded-2xl p-10 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">¿Listo para ser partner?</h2>
            <p className="text-white/70 mb-8 max-w-lg mx-auto">
              Contáctanos para explorar cómo podemos crear una alianza que beneficie a tus artistas y a tu negocio.
            </p>
            <Link to="/contact?reason=partner_proposal">
              <Button variant="hero" size="xl" className="font-semibold">
                <span className="flex items-center gap-2">
                  Contactar <ArrowRight className="w-5 h-5" />
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
