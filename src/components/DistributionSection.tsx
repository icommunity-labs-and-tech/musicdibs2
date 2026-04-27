import { Music, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal, StaggerGrid } from "@/components/ScrollReveal";
import { useTranslation } from "react-i18next";


export const DistributionSection = () => {
  const { t } = useTranslation();
  return (
    <section 
      id="services-section"
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
          <StaggerGrid baseDelay={100} staggerDelay={150} scale>
            {/* Distribución Mundial */}
            <a href="#pricing-section" className="block">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer hover:scale-105">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center mr-4">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{t("distro.world.title")}</h3>
                </div>
                <p className="text-white/80 mb-6 text-lg">{t("distro.world.desc")}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-20">
                    <img src="/lovable-uploads/af219155-433f-402d-a220-28088ee5c7ea.png" alt="Spotify" className="h-12 w-auto object-contain" width={90} height={46} loading="lazy" />
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                    <img src="/lovable-uploads/3b78a760-1f1a-49bc-9d35-4d2df3b0abe5.png" alt="Apple Music" className="h-8 w-auto object-contain" width={104} height={30} loading="lazy" />
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                    <img src="/lovable-uploads/130ddbf0-73ca-4e46-a7ad-a985a06ddfdf.png" alt="Amazon Music" className="h-8 w-auto object-contain" width={104} height={30} loading="lazy" />
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 flex items-center justify-center h-16">
                    <img src="/lovable-uploads/cacf57b3-f050-4740-89ea-541e5f512ed6.png" alt="Deezer" className="h-8 w-auto object-contain" width={104} height={30} loading="lazy" />
                  </div>
                </div>

                <div className="flex justify-center mt-6">
                  <Button variant="hero" size="lg" className="font-semibold">
                    <span className="flex items-center gap-2">
                      {t("distro.world.cta", "Saber más")}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
            </a>

            {/* Promoción en Redes Sociales */}
            <a href="#pricing-section" className="block">
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-pointer hover:scale-105">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 rounded-full bg-pink-500 flex items-center justify-center mr-4">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{t("distro.social.title")}</h3>
                </div>
                <p className="text-white/80 mb-6 text-lg">{t("distro.social.desc")}</p>
                
                <div className="flex justify-center space-x-6">
                  <a
                    href="https://www.instagram.com/musicdibs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-32 h-40 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 block"
                    aria-label="Instagram @musicdibs"
                  >
                    <img src="/lovable-uploads/ff17291e-4f59-4201-8e1b-8964a98b22f6.png" alt="Instagram Promotion" className="w-full h-full object-cover" width={122} height={152} loading="lazy" />
                  </a>
                  <a
                    href="https://www.tiktok.com/@musicdibs_"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="w-32 h-40 rounded-xl overflow-hidden hover:scale-105 transition-transform duration-300 block"
                    aria-label="TikTok @musicdibs_"
                  >
                    <img src="/lovable-uploads/6a1dd10b-22a7-4382-990a-94d322fcae13.png" alt="TikTok Promotion" className="w-full h-full object-cover" width={122} height={152} loading="lazy" />
                  </a>
                </div>

                <div className="flex justify-center mt-6">
                  <Button variant="hero" size="lg" className="font-semibold">
                    <span className="flex items-center gap-2">
                      {t("distro.social.cta", "Saber más")}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Button>
                </div>
              </div>
            </a>

          </StaggerGrid>
        </div>
      </div>
    </section>
  );
};
