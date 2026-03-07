import { Button } from "@/components/ui/button";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import { getNavLinks } from "@/i18nLinks";
import { Menu, X, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export const Navbar = () => {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const closeTimeout = useRef<number | null>(null);
  const closeTimeout = useRef<number | null>(null);

  const openServices = () => {
    if (closeTimeout.current) {
      window.clearTimeout(closeTimeout.current);
      closeTimeout.current = null;
    }
    setServicesOpen(true);
  };

  const closeServicesWithDelay = () => {
    closeTimeout.current = window.setTimeout(() => {
      setServicesOpen(false);
    }, 150);
  };

  const { t, i18n } = useTranslation();
  const links = getNavLinks(i18n.resolvedLanguage || i18n.language);

  const scrollToPricing = () => {
    setMobileOpen(false);
    const pricingSection = document.querySelector('section:nth-of-type(6)');
    pricingSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="absolute top-10 left-0 right-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img 
            src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" 
            alt="by iCommunity" 
            className="h-12 w-auto"
          />
        </Link>

        {/* Desktop navigation links */}
        <div className="hidden lg:flex items-center space-x-8">
          <button onClick={scrollToPricing} className="text-white/80 hover:text-white transition-colors">
            {t('nav.pricing')}
          </button>
          <a href={links.faq} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.faq')}</a>
          
          <a href={links.news} target="_blank" rel="noopener noreferrer" className="text-white/80 hover:text-white transition-colors">{t('nav.news')}</a>

          {/* Servicios dropdown */}
          <div
            className="relative"
            onMouseEnter={openServices}
            onMouseLeave={closeServicesWithDelay}
          >
            <button
              className="text-white/80 hover:text-white transition-colors flex items-center gap-1"
              aria-haspopup="menu"
              aria-expanded={servicesOpen}
            >
              {t('nav.services')}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </button>
            <div
              onMouseEnter={openServices}
              onMouseLeave={closeServicesWithDelay}
              className={`absolute left-0 top-full w-56 rounded-md bg-white shadow-lg ring-1 ring-black/10 z-50 ${servicesOpen ? "block" : "hidden"}`}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li>
                  <a href={links.distribution.info} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100">
                    {t('nav.distribution')}
                  </a>
                </li>
                <li>
                  <a href={links.market} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100">
                    {t('nav.market')}
                  </a>
                </li>
                <li>
                  <a href={links.verifier} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100">
                    {t('nav.verifier')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <Link to="/contact" className="text-white/80 hover:text-white transition-colors">{t('nav.contact')}</Link>
        </div>

        {/* Language + CTA + Mobile toggle */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <Button 
            variant="glass" 
            className="font-semibold hidden lg:inline-flex"
            onClick={() => window.open(links.login, '_blank')}
          >
            {t('nav.login')}
          </Button>
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden mt-4 rounded-xl bg-black/70 backdrop-blur-lg border border-white/10 p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <button onClick={scrollToPricing} className="block w-full text-left text-white/90 hover:text-white py-2 transition-colors">
            {t('nav.pricing')}
          </button>
          <a href={links.faq} target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.faq')}</a>
          
          <a href={links.news} target="_blank" rel="noopener noreferrer" className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.news')}</a>

          {/* Services accordion */}
          <div>
            <button
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              className="flex items-center justify-between w-full text-white/90 hover:text-white py-2 transition-colors"
            >
              {t('nav.services')}
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileServicesOpen && (
              <div className="pl-4 space-y-2 mt-1">
                <a href={links.distribution.info} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors">{t('nav.distribution')}</a>
                <a href={links.market} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors">{t('nav.market')}</a>
                <a href={links.verifier} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors">{t('nav.verifier')}</a>
              </div>
            )}
          </div>

          <Link to="/contact" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.contact')}</Link>

          <Button
            variant="glass" 
            className="font-semibold w-full mt-2"
            onClick={() => { setMobileOpen(false); window.open(links.login, '_blank'); }}
          >
            {t('nav.login')}
          </Button>
        </div>
      )}
    </nav>
  );
};