import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import { getNavLinks } from "@/i18nLinks";

export const Navbar = () => {
  const [distOpen, setDistOpen] = useState(false);
  const closeTimeout = useRef<number | null>(null);

  const openDist = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setDistOpen(true);
  };

  const closeDistWithDelay = () => {
    closeTimeout.current = window.setTimeout(() => {
      setDistOpen(false);
    }, 150);
  };

  const { t, i18n } = useTranslation();
  const links = getNavLinks(i18n.resolvedLanguage || i18n.language);
  return (
    <nav className="absolute top-10 left-0 right-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" 
            alt="by iCommunity" 
            className="h-12 w-auto"
          />
        </div>

        {/* Navigation links */}
        <div className="hidden md:flex items-center space-x-8">
          <button 
            onClick={() => {
              const pricingSection = document.querySelector('section:nth-of-type(6)');
              pricingSection?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-white/80 hover:text-white transition-colors"
          >
            {t('nav.pricing')}
          </button>
          <a href={links.faq} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.faq')}</a>
          <a href={links.support} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.support')}</a>
          <a href={links.news} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.news')}</a>

          {/* Distribución with submenu */}
          <div
            className="relative"
            onMouseEnter={openDist}
            onMouseLeave={closeDistWithDelay}
         >
            <button
              className="text-white/80 hover:text-white transition-colors"
              aria-haspopup="menu"
              aria-expanded={distOpen}
            >
              {t('nav.distribution')}
            </button>
            <div
              onMouseEnter={openDist}
              onMouseLeave={closeDistWithDelay}
              className={`absolute left-0 top-full w-56 rounded-md bg-white shadow-lg ring-1 ring-black/10 z-50 ${distOpen ? "block" : "hidden"}`}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li>
                  <a
                    href={links.distribution.access}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    {t('nav.access')}
                  </a>
                </li>
                <li>
                  <a
                    href={links.distribution.info}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-2 hover:bg-gray-100"
                  >
                    {t('nav.info')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <a href={links.market} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.market')}</a>
          <a href={links.dibs} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.dibs')}</a>
          <a href={links.verifier} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.verifier')}</a>
        </div>

        {/* Language + CTA */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Button 
            variant="glass" 
            className="font-semibold"
            onClick={() => window.open(links.login, '_blank')}
          >
            {t('nav.login')}
          </Button>
        </div>
      </div>
    </nav>
  );
};