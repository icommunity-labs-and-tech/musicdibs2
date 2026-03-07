import { useTranslation } from "react-i18next";
import { getFooterLinks } from "@/i18nLinks";
import { Link } from "react-router-dom";

const Footer = () => {
  const { t, i18n } = useTranslation();
  const links = getFooterLinks(i18n.resolvedLanguage || i18n.language);
  return (
    <footer className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-pink-800 text-white overflow-hidden">
      {/* Geometric pattern background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 25% 25%, rgba(255, 182, 193, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(138, 43, 226, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(255, 20, 147, 0.2) 0%, transparent 50%),
            linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%)
          `,
          backgroundSize: '100px 100px, 150px 150px, 200px 200px, 50px 50px'
        }} />
        
        {/* Floating geometric shapes */}
        <div className="absolute top-10 left-10 w-20 h-20 border border-pink-400/30 rounded-full animate-pulse" />
        <div className="absolute top-20 right-20 w-16 h-16 bg-purple-500/20 rounded-lg rotate-45 animate-pulse" />
        <div className="absolute bottom-20 left-20 w-12 h-12 border-2 border-pink-300/40 rotate-12 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-24 h-24 border border-purple-400/30 rounded-full animate-pulse" />
      </div>
      
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Logo and Links */}
          <div className="space-y-6">
            <div className="mb-6">
              <a href="https://icommunity.io/" target="_blank" rel="noopener noreferrer">
                <img 
                  src="/lovable-uploads/eca60bb5-0409-4e18-bc0a-0e93aeabee3d.png" 
                  alt="MusicDIBS Logo" 
                  className="h-16 w-auto"
                />
              </a>
            </div>
            <div className="space-y-3">
              <a href={links.left.verify} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Verificar registro
              </a>
              <a href={links.left.legal} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Tecnología y validez legal
              </a>
              <a href={links.left.support} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Soporte
              </a>
              <a href={links.left.partners} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Partners
              </a>
              <a href={links.left.mediaKit} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Media Kit
              </a>
              <Link to="/contact" className="block text-white/80 hover:text-white transition-colors">
                {t('nav.contact')}
              </Link>
            </div>
          </div>

          {/* Middle Column - Corporate Links */}
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white mb-4">Corporativo</h3>
            <div className="space-y-3">
              <a href={links.corporate.contact} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Contacto
              </a>
              <a href={links.corporate.dibs} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                DIBS Token
              </a>
              <a href={links.corporate.sla} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Acuerdo de nivel de servicios
              </a>
              <a href={links.corporate.privacy} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Política de privacidad y protección de datos
              </a>
              <a href={links.corporate.terms} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Términos y condiciones
              </a>
              <a href={links.corporate.cookies} target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white transition-colors">
                Política de cookies
              </a>
            </div>
          </div>

          {/* Right Column - Social Media */}
          <div className="space-y-6">
            {/* Social Media Icons */}
            <div className="flex space-x-4">
              <a href="https://twitter.com/musicdibs" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/musicdibs/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <img src="/lovable-uploads/08188aae-4d50-4395-aeb1-8a4b2f6c6c6a.png" alt="Instagram" className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@musicdibs_" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
              <a href="https://www.youtube.com/@Musicdibs" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/20 pt-6">
          <div className="text-white/60 text-sm text-center">
            Versión 1.3.0
          </div>
        </div>
      </div>
    </footer>
  );
};

export { Footer };