import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";

const MESSAGES: Record<string, string> = {
  es: "No salgas de esta pestaña mientras se está generando el archivo, ya que pueden perderse los créditos.",
  en: "Do not leave this tab while the file is being generated, as the credits may be lost.",
  pt: "Não saia desta aba enquanto o arquivo está sendo gerado, pois os créditos podem ser perdidos.",
};

export function GenerationWarning({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "es").slice(0, 2);
  const message = MESSAGES[lang] || MESSAGES.es;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border-2 border-amber-500 bg-amber-100 dark:bg-amber-900/50 dark:border-amber-400 px-4 py-3 mt-3 shadow-md ${className}`}
      role="alert"
    >
      <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-300" />
      <span className="text-sm md:text-base font-bold text-amber-900 dark:text-amber-100 leading-snug uppercase tracking-wide">
        {message}
      </span>
    </div>
  );
}
