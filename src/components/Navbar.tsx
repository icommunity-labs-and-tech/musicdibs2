import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./LanguageSelector";
import { useTheme } from "./ThemeProvider";
import { getNavLinks } from "@/i18nLinks";
import { Menu, X, ChevronDown, Sun, Moon } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export const Navbar = () => {
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeTimeout = useRef<number | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const scrollToSection = (sectionId: string) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } else {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 px-6 py-4 transition-all duration-300 ${scrolled ? 'nav-scrolled bg-black/80 backdrop-blur-md shadow-lg' : 'bg-transparent'}`}>
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
          <button onClick={() => scrollToSection('services-section')} className="text-white/80 hover:text-white transition-colors">
            {t('nav.services')}
          </button>
          <button onClick={() => scrollToSection('pricing-section')} className="text-white/80 hover:text-white transition-colors">
            {t('nav.pricing')}
          </button>
          <button onClick={() => scrollToSection('tutorial-section')} className="text-white/80 hover:text-white transition-colors">
            {t('nav.howItWorks')}
          </button>
          <Link to="/marketing" className="text-white/80 hover:text-white transition-colors">{t('nav.marketing', 'Marketing y Promos')}</Link>
          <Link to="/faq" className="text-white/80 hover:text-white transition-colors">{t('nav.faq')}</Link>
          
          <Link to="/news" className="text-white/80 hover:text-white transition-colors">{t('nav.news')}</Link>

          <div className="w-px h-5 bg-white/20" />

          <Link to="/contact" className="text-white/80 hover:text-white transition-colors">{t('nav.contact')}</Link>
          <Link to="/partners" className="text-white/80 hover:text-white transition-colors">{t('nav.partners', 'Hazte Partner')}</Link>
        </div>

        {/* Language + CTA + Mobile toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </button>
          <LanguageSelector />
          <div
            className="relative hidden lg:block"
            onMouseEnter={openServices}
            onMouseLeave={closeServicesWithDelay}
          >
            <Button 
              variant="glass" 
              className="font-semibold flex items-center gap-1.5"
            >
              {t('nav.accessServices')}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
            </Button>
            <div
              onMouseEnter={openServices}
              onMouseLeave={closeServicesWithDelay}
              className={`absolute right-0 top-full mt-1 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/10 z-50 ${servicesOpen ? "block" : "hidden"}`}
            >
              <ul className="py-2 text-sm text-gray-700">
                <li>
                  <a href={links.login} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100 font-medium">
                    {t('nav.login')}
                  </a>
                </li>
                <li className="border-t border-gray-100 my-1" />
                <li>
                  <a href="https://dist.musicdibs.com/" target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100 font-medium">
                    {t('nav.distribution')}
                  </a>
                </li>
                <li>
                  <a href={links.market} target="_blank" rel="noopener noreferrer" className="block px-4 py-2 hover:bg-gray-100">
                    {t('nav.market')}
                  </a>
                </li>
                <li>
                  <Link to="/verify" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setServicesOpen(false)}>
                    {t('nav.verifier')}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
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
          <button onClick={() => scrollToSection('services-section')} className="block w-full text-left text-white/90 hover:text-white py-2 transition-colors">
            {t('nav.services')}
          </button>
          <button onClick={() => scrollToSection('pricing-section')} className="block w-full text-left text-white/90 hover:text-white py-2 transition-colors">
            {t('nav.pricing')}
          </button>
          <button onClick={() => scrollToSection('tutorial-section')} className="block w-full text-left text-white/90 hover:text-white py-2 transition-colors">
            {t('nav.howItWorks')}
          </button>
          <Link to="/marketing" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.marketing', 'Marketing y Promos')}</Link>
          <Link to="/faq" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.faq')}</Link>
          
          <Link to="/news" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.news')}</Link>

          <div className="w-full h-px bg-white/10" />

          <Link to="/contact" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.contact')}</Link>
          <Link to="/partners" onClick={() => setMobileOpen(false)} className="block text-white/90 hover:text-white py-2 transition-colors">{t('nav.partners', 'Hazte Partner')}</Link>

          {/* Access to services accordion */}
          <div className="border-t border-white/10 pt-3 mt-2">
            <button
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              className="flex items-center justify-between w-full font-semibold text-white py-2 transition-colors"
            >
              {t('nav.accessServices')}
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileServicesOpen && (
              <div className="pl-4 space-y-2 mt-1">
                <a href={links.login} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors font-medium">{t('nav.login')}</a>
                <a href={links.distribution.info} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors font-medium">{t('nav.distribution')}</a>
                <a href={links.market} target="_blank" rel="noopener noreferrer" className="block text-white/70 hover:text-white py-1 transition-colors">{t('nav.market')}</a>
                <Link to="/verify" onClick={() => setMobileOpen(false)} className="block text-white/70 hover:text-white py-1 transition-colors">{t('nav.verifier')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};