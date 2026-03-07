import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  type?: string;
}

const BASE_URL = "https://musicdibs.com";
const OG_IMAGE = "/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png";

export const SEO = ({ title, description, path = "/", type = "website" }: SEOProps) => {
  const url = `${BASE_URL}${path}`;
  const fullTitle = path === "/" ? title : `${title} | MusicDibs`;
  const imageUrl = `${BASE_URL}${OG_IMAGE}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content="MusicDibs" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
    </Helmet>
  );
};
