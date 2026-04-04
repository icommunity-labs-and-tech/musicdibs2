import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect, useCallback } from "react";
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
  const [hidden, setHidden] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const lastScrollY = useRef(0);
  const closeTimeout = useRef<number | null>(null);
  const ticking = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAiStudio = location.pathname.startsWith('/ai-studio');

  // Pages with light/white backgrounds need dark navbar text
  const lightBgPages = ['/ai-studio', '/terms', '/privacy', '/cookies', '/sla'];
  const isLightBg = lightBgPages.some(p => location.pathname.startsWith(p));

  // Text color classes based on background
  const navText = isLightBg ? 'text-foreground/80 hover:text-foreground' : 'text-white/80 hover:text-white';
  const navTextStrong = isLightBg ? 'text-foreground hover:text-foreground' : 'text-white hover:text-white';
  const navTextMuted = isLightBg ? 'text-foreground/70 hover:text-foreground' : 'text-white/70 hover:text-white';
  const navIconColor = isLightBg ? 'text-foreground/70 hover:text-foreground hover:bg-foreground/10' : 'text-white/70 hover:text-white hover:bg-white/10';
  const mobileToggleColor = isLightBg ? 'text-foreground' : 'text-white';

  const handleScroll = useCallback(() => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      // Scrolled state
      setScrolled(currentY > 50);
      
      // Auto-hide: hide when scrolling down past 100px, show when scrolling up
      if (currentY > 100) {
        setHidden(currentY > lastScrollY.current && currentY - lastScrollY.current > 5);
      } else {
        setHidden(false);
      }
      
      // Progress bar
      setScrollProgress(docHeight > 0 ? Math.min(currentY / docHeight, 1) : 0);
      
      lastScrollY.current = currentY;
      ticking.current = false;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Always show navbar when mobile menu is open
  const isHidden = hidden && !mobileOpen;

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

  const { theme, toggleTheme } = useTheme();

  // Hide navbar on dashboard and AI Studio pages
  if (isDashboard || isAiStudio) return null;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isHidden ? '-translate-y-full' : 'translate-y-0'
      } ${scrolled ? 'nav-scrolled bg-black/80 backdrop-blur-md shadow-lg' : 'bg-transparent'} ${isLightBg && scrolled ? '!bg-background/95 !shadow-md' : ''}`}
    >
      {/* Reading progress bar */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-pink-500 via-purple-500 to-primary transition-none"
        style={{ width: `${scrollProgress * 100}%` }}
      />

      <div className="px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" 
              alt="by iCommunity" 
              className="h-12 w-auto"
              width={69}
              height={48}
              fetchPriority="high"
            />
          </Link>

          {/* Desktop navigation links */}
          <div className="hidden lg:flex items-center space-x-8">
            <button onClick={() => scrollToSection('services-section')} className={`${navText} transition-colors`}>
              {t('nav.services')}
            </button>
            <button onClick={() => scrollToSection('pricing-section')} className={`${navText} transition-colors`}>
              {t('nav.pricing')}
            </button>
            <button onClick={() => scrollToSection('tutorial-section')} className={`${navText} transition-colors`}>
              {t('nav.howItWorks')}
            </button>
            <Link to="/marketing" className={`${navText} transition-colors`}>{t('nav.marketing', 'Marketing y Promos')}</Link>
            <Link to="/faq" className={`${navText} transition-colors`}>{t('nav.faq')}</Link>
            
            <Link to="/news" className={`${navText} transition-colors`}>{t('nav.news')}</Link>

            <div className={`w-px h-5 ${isLightBg ? 'bg-foreground/20' : 'bg-white/20'}`} />

            <Link to="/contact" className={`${navText} transition-colors`}>{t('nav.contact')}</Link>
            <Link to="/partners" className={`${navText} transition-colors`}>{t('nav.partners', 'Hazte Partner')}</Link>
          </div>

          {/* Language + CTA + Mobile toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full ${navIconColor} transition-all`}
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
                    <Link to="/login" className="block px-4 py-2 hover:bg-gray-100 font-medium" onClick={() => setServicesOpen(false)}>
                      {t('nav.login')}
                    </Link>
                  </li>
                  <li className="border-t border-gray-100 my-1" />
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
              className={`lg:hidden ${mobileToggleColor} p-2`}
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className={`lg:hidden mx-6 mb-4 rounded-xl ${isLightBg ? 'bg-background/95 border-border' : 'bg-black/70 border-white/10'} backdrop-blur-lg border p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
          <button onClick={() => scrollToSection('services-section')} className={`block w-full text-left ${navText} py-2 transition-colors`}>
            {t('nav.services')}
          </button>
          <button onClick={() => scrollToSection('pricing-section')} className={`block w-full text-left ${navText} py-2 transition-colors`}>
            {t('nav.pricing')}
          </button>
          <button onClick={() => scrollToSection('tutorial-section')} className={`block w-full text-left ${navText} py-2 transition-colors`}>
            {t('nav.howItWorks')}
          </button>
          <Link to="/marketing" onClick={() => setMobileOpen(false)} className={`block ${navText} py-2 transition-colors`}>{t('nav.marketing', 'Marketing y Promos')}</Link>
          <Link to="/faq" onClick={() => setMobileOpen(false)} className={`block ${navText} py-2 transition-colors`}>{t('nav.faq')}</Link>
          
          <Link to="/news" onClick={() => setMobileOpen(false)} className={`block ${navText} py-2 transition-colors`}>{t('nav.news')}</Link>

          <div className={`w-full h-px ${isLightBg ? 'bg-border' : 'bg-white/10'}`} />

          <Link to="/contact" onClick={() => setMobileOpen(false)} className={`block ${navText} py-2 transition-colors`}>{t('nav.contact')}</Link>
          <Link to="/partners" onClick={() => setMobileOpen(false)} className={`block ${navText} py-2 transition-colors`}>{t('nav.partners', 'Hazte Partner')}</Link>

          {/* Access to services accordion */}
          <div className={`border-t ${isLightBg ? 'border-border' : 'border-white/10'} pt-3 mt-2`}>
            <button
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
              className={`flex items-center justify-between w-full font-semibold ${navTextStrong} py-2 transition-colors`}
            >
              {t('nav.accessServices')}
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileServicesOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileServicesOpen && (
              <div className="pl-4 space-y-2 mt-1">
                <Link to="/login" onClick={() => setMobileOpen(false)} className={`block ${navTextMuted} py-1 transition-colors font-medium`}>{t('nav.login')}</Link>
                
                <a href={links.market} target="_blank" rel="noopener noreferrer" className={`block ${navTextMuted} py-1 transition-colors`}>{t('nav.market')}</a>
                <Link to="/verify" onClick={() => setMobileOpen(false)} className={`block ${navTextMuted} py-1 transition-colors`}>{t('nav.verifier')}</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
