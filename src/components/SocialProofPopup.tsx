import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { X, Music, ShieldCheck } from "lucide-react";

interface NotificationData {
  name: string;
  city: string;
  action: "registered" | "certified" | "distributed";
  timeAgo: string;
}

const NAMES_BY_LANG: Record<string, string[]> = {
  es: [
    "Carlos",
    "María",
    "Alejandro",
    "Lucía",
    "Diego",
    "Valentina",
    "Andrés",
    "Sofía",
    "Pablo",
    "Camila",
    "Javier",
    "Laura",
    "Mateo",
    "Ana",
  ],
  en: [
    "James",
    "Emma",
    "Liam",
    "Olivia",
    "Noah",
    "Ava",
    "Marcus",
    "Sophia",
    "Tyler",
    "Mia",
    "Ethan",
    "Chloe",
    "Ryan",
    "Zoe",
  ],
  "pt-BR": [
    "Lucas",
    "Beatriz",
    "Gabriel",
    "Mariana",
    "Pedro",
    "Isabela",
    "Rafael",
    "Larissa",
    "Gustavo",
    "Camila",
    "Thiago",
    "Julia",
  ],
  fr: ["Lucas", "Léa", "Hugo", "Manon", "Louis", "Camille", "Nathan", "Chloé", "Théo", "Emma", "Raphaël", "Jade"],
  it: [
    "Marco",
    "Giulia",
    "Luca",
    "Chiara",
    "Alessandro",
    "Francesca",
    "Matteo",
    "Sara",
    "Lorenzo",
    "Elena",
    "Andrea",
    "Valentina",
  ],
  de: ["Lukas", "Anna", "Felix", "Sophie", "Maximilian", "Marie", "Leon", "Lena", "Jonas", "Laura", "Tim", "Hannah"],
};

const CITIES_BY_LANG: Record<string, string[]> = {
  es: [
    "Madrid",
    "Barcelona",
    "Buenos Aires",
    "Ciudad de México",
    "Bogotá",
    "Lima",
    "Santiago",
    "Medellín",
    "Sevilla",
    "Valencia",
  ],
  en: ["London", "New York", "Los Angeles", "Toronto", "Sydney", "Miami", "Chicago", "Austin", "Nashville", "Atlanta"],
  "pt-BR": [
    "São Paulo",
    "Rio de Janeiro",
    "Lisboa",
    "Porto",
    "Belo Horizonte",
    "Curitiba",
    "Brasília",
    "Salvador",
    "Recife",
    "Fortaleza",
  ],
  fr: ["Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse", "Montréal", "Bruxelles", "Nice", "Nantes", "Strasbourg"],
  it: ["Milano", "Roma", "Napoli", "Torino", "Firenze", "Bologna", "Palermo", "Genova", "Venezia", "Bari"],
  de: ["Berlin", "München", "Hamburg", "Köln", "Frankfurt", "Wien", "Zürich", "Stuttgart", "Düsseldorf", "Leipzig"],
};

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const APP_ROUTE_PREFIXES = ["/dashboard", "/admin", "/manager", "/ia-studio", "/ai-studio"];

const SocialProofPopup = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [data, setData] = useState<NotificationData | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const isAppRoute = APP_ROUTE_PREFIXES.some((p) => location.pathname.startsWith(p));

  const lang = i18n.resolvedLanguage || i18n.language || "es";
  const langKey = lang.startsWith("pt") ? "pt-BR" : NAMES_BY_LANG[lang] ? lang : "en";

  const generateNotification = useCallback((): NotificationData => {
    const actions: NotificationData["action"][] = ["registered", "certified", "distributed"];
    const timeKeys = ["just_now", "minutes_ago", "minutes_ago_5", "minutes_ago_10"];
    return {
      name: pick(NAMES_BY_LANG[langKey]),
      city: pick(CITIES_BY_LANG[langKey]),
      action: pick(actions),
      timeAgo: pick(timeKeys),
    };
  }, [langKey]);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
  };

  const permanentDismiss = () => {
    dismiss();
    setDismissed(true);
  };

  useEffect(() => {
    if (dismissed || isAppRoute) return;

    const initialTimer = setTimeout(() => {
      setData(generateNotification());
      setVisible(true);
      setTimeout(() => dismiss(), 6000);
    }, 15000);

    const interval = setInterval(
      () => {
        if (dismissed) return;
        setData(generateNotification());
        setExiting(false);
        setVisible(true);
        setTimeout(() => dismiss(), 6000);
      },
      30000 + Math.random() * 30000,
    );

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [dismissed, generateNotification, isAppRoute]);

  if (!visible || !data || dismissed || isAppRoute) return null;

  const actionIcon = data.action === "distributed" ? Music : ShieldCheck;
  const ActionIcon = actionIcon;

  return (
    <div
      className={`fixed bottom-20 left-4 z-40 max-w-xs w-full transition-all duration-300 ${
        exiting ? "translate-y-4 opacity-0" : "translate-y-0 opacity-100 animate-fade-in"
      }`}
    >
      <div className="bg-background/80 backdrop-blur-xl border border-border/40 rounded-2xl p-4 shadow-2xl">
        <button
          onClick={permanentDismiss}
          className="absolute top-2 right-2 text-muted-foreground/60 hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <ActionIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground text-sm font-medium leading-snug">
              <span className="font-bold">{data.name}</span>{" "}
              <span className="text-muted-foreground">{t("privacy.social_proof.from")}</span>{" "}
              <span className="font-bold">{data.city}</span>{" "}
              <span className="text-muted-foreground">{t(`privacy.social_proof.action_${data.action}`)}</span>
            </p>
            <p className="text-muted-foreground/70 text-xs mt-1">{t(`privacy.social_proof.${data.timeAgo}`)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export { SocialProofPopup };
