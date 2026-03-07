import { Music, Users, ShoppingCart, Zap } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useTranslation } from "react-i18next";
import { getNavLinks } from "@/i18nLinks";

export const DistributionSection = () => {
  const { t, i18n } = useTranslation();
  const links = getNavLinks(i18n.resolvedLanguage || i18n.language);
  return (
    <section 
      className="py-20 bg-gradient-to-br from-purple-600 via-purple-700 to-pink-600 relative overflow-hidden"
      style={{
        backgroundImage: `url(/lovable-uploads/8b326f67-4441-49bb-b3f4-d2f9a297c964.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 via-purple-700/90 to-pink-600/90"></div>
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        {/* Section header */}
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {t("distro.heading")}
            </h2>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              {t("distro.subheading")}
            </p>
          </div>
        </ScrollReveal>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Distribución Mundial */}
          <ScrollReveal delay={200}>
            <a 
              href={links.distribution.access} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer hover:scale-105">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mr-4">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white">{t("distro.world.title")}</h3>
              </div>
              <p className="text-white/80 mb-6 text-lg">
                {t("distro.world.desc")}
              </p>
              
              {/* Platform logos */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-20">
                  <img 
                    src="/lovable-uploads/af219155-433f-402d-a220-28088ee5c7ea.png" 
                    alt="Spotify" 
                    className="h-12 w-auto object-contain"
                  />
                </div>
                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                  <img 
                    src="/lovable-uploads/3b78a760-1f1a-49bc-9d35-4d2df3b0abe5.png" 
                    alt="Apple Music" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                  <img 
                    src="/lovable-uploads/130ddbf0-73ca-4e46-a7ad-a985a06ddfdf.png" 
                    alt="Amazon Music" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                  <img 
                    src="/lovable-uploads/cacf57b3-f050-4740-89ea-541e5f512ed6.png" 
                    alt="Deezer" 
                    className="h-8 w-auto object-contain"
                  />
                </div>
              </div>
              </div>
            </a>
          </ScrollReveal>

          {/* Promoción en Redes Sociales */}
          <ScrollReveal delay={300}>
          <Link to="/marketing" className="block">
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer hover:scale-105">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center mr-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">{t("distro.social.title")}</h3>
            </div>
            <p className="text-white/80 mb-6 text-lg">
              {t("distro.social.desc")}
            </p>
            
            {/* Social media images */}
            <div className="flex justify-center space-x-6">
              <div className="w-32 h-40 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                <img 
                  src="/lovable-uploads/ff17291e-4f59-4201-8e1b-8964a98b22f6.png" 
                  alt="Instagram Promotion" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="w-32 h-40 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300">
                <img 
                  src="/lovable-uploads/6a1dd10b-22a7-4382-990a-94d322fcae13.png" 
                  alt="TikTok Promotion" 
                  className="w-full h-full object-cover"
                />
              </div>
              </div>
            </div>
          </Link>
          </ScrollReveal>

          {/* Marketplace */}
          <ScrollReveal delay={400}>
            <a 
              href={links.market} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block"
            >
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer hover:scale-105">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center mb-6">
                  <ShoppingCart className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t("distro.market.title")}</h3>
                <p className="text-white/80 text-lg">
                  {t("distro.market.desc")}
                </p>
              </div>
              </div>
            </a>
          </ScrollReveal>

          {/* NFTs & Marketing */}
          <ScrollReveal delay={500}>
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-pink-500 flex items-center justify-center mb-6">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">{t("distro.nfts.title")}</h3>
                <p className="text-white/80 text-lg">
                  {t("distro.nfts.desc")}
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};