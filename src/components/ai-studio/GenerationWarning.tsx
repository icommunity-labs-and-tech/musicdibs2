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
      className={`flex items-start gap-2 rounded-md border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-500 px-3 py-2 mt-2 ${className}`}
      role="note"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="text-xs font-medium text-amber-800 dark:text-amber-200 leading-snug">
        {message}
      </span>
    </div>
  );
}
