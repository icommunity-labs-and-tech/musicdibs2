import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

export const LanguageSelector = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.resolvedLanguage || i18n.language || "es");

  useEffect(() => {
    const current = i18n.resolvedLanguage || i18n.language;
    if (current && current !== selectedLanguage) {
      setSelectedLanguage(current);
    }
  }, [i18n.resolvedLanguage, i18n.language]);

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
    { code: "es", name: "Español", flag: "🇪🇸" },
  ];

  const currentLanguage = languages.find((lang) => lang.code === selectedLanguage) || languages[0];

  return (
    <div className="relative">
      <Button
        variant="glass"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-lg" aria-hidden>
          {currentLanguage?.flag}
        </span>
        <ChevronDown className="w-4 h-4" />
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg shadow-lg z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => {
                setSelectedLanguage(language.code);
                i18n.changeLanguage(language.code);
                setIsOpen(false);
                try { localStorage.setItem('lang', language.code); } catch {}
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-white hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <span className="text-lg" aria-hidden>{language.flag}</span>
              <span className="text-sm">{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};