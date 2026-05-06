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
    <p
      className={`flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400 mt-2 ${className}`}
      role="note"
    >
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
      <span>{message}</span>
    </p>
  );
}
