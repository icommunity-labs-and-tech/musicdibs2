import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
  image?: string;
  locale?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const BASE_URL = "https://musicdibs.com";
const DEFAULT_OG_IMAGE = "/og-image.png";

const LOCALE_MAP: Record<string, string> = {
  es: "es_ES",
  en: "en_US",
  "pt-BR": "pt_BR",
  fr: "fr_FR",
  it: "it_IT",
  de: "de_DE",
};

const ALL_LOCALES = Object.values(LOCALE_MAP);

export const SEO = ({
  title,
  description,
  path = "/",
  type = "website",
  image,
  locale,
  jsonLd,
}: SEOProps) => {
  const url = `${BASE_URL}${path}`;
  const fullTitle = path === "/" ? title : `${title} | Musicdibs`;
  const imageUrl = image
    ? (image.startsWith("http") ? image : `${BASE_URL}${image}`)
    : `${BASE_URL}${DEFAULT_OG_IMAGE}`;

  const ogLocale = locale ? (LOCALE_MAP[locale] || "es_ES") : "es_ES";
  const alternateLocales = ALL_LOCALES.filter((l) => l !== ogLocale);

  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Musicdibs" />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((alt) => (
        <meta key={alt} property="og:locale:alternate" content={alt} />
      ))}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@musicdibs" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
