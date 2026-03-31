import { lazy, Suspense } from "react";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ArtistsBanner } from "@/components/ArtistsBanner";
import { SEO } from "@/components/SEO";

// Lazy-load below-fold sections to reduce initial JS and improve TTI
const WhyChooseSection = lazy(() => import("@/components/WhyChooseSection").then(m => ({ default: m.WhyChooseSection })));
const DistributionSection = lazy(() => import("@/components/DistributionSection").then(m => ({ default: m.DistributionSection })));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const PricingSection = lazy(() => import("@/components/PricingSection").then(m => ({ default: m.PricingSection })));
const RoyaltiesCalculator = lazy(() => import("@/components/RoyaltiesCalculator").then(m => ({ default: m.RoyaltiesCalculator })));
const TutorialSection = lazy(() => import("@/components/TutorialSection").then(m => ({ default: m.TutorialSection })));
const ManagerBannerSection = lazy(() => import("@/components/ManagerBannerSection").then(m => ({ default: m.ManagerBannerSection })));
const Footer = lazy(() => import("@/components/Footer").then(m => ({ default: m.Footer })));

const Index = () => {
  return (
    <div className="min-h-screen page-bg">
      <SEO
        title="MusicDibs - Registro y Distribución Musical"
        description="Distribuye tu música en Spotify, Apple Music, YouTube Music y más de 150 plataformas digitales. Protege tus derechos con certificación blockchain."
        path="/"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MusicDibs",
            url: "https://musicdibs.com",
            logo: "https://musicdibs.com/lovable-uploads/b347ac8a-e7a2-4c60-a54e-6bc186ef2ce3.png",
            description: "Plataforma de registro y distribución musical digital con certificación blockchain.",
            sameAs: [
              "https://www.youtube.com/@Musicdibs",
              "https://www.instagram.com/musicdibs",
              "https://www.tiktok.com/@musicdibs"
            ],
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              availableLanguage: ["Spanish", "English", "Portuguese", "French", "Italian", "German"]
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "MusicDibs",
            description: "Registro de obras con certificación blockchain y distribución en más de 150 plataformas digitales.",
            brand: { "@type": "Brand", name: "MusicDibs" },
            offers: [
              {
                "@type": "Offer",
                name: "Essential",
                price: "2.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Professional",
                price: "4.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              },
              {
                "@type": "Offer",
                name: "Premium",
                price: "9.99",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock"
              }
            ]
          }
        ]}
      />
      <Navbar />
      <HeroSection />
      <ArtistsBanner />
      <Suspense fallback={null}>
        <WhyChooseSection />
        <DistributionSection />
        <TestimonialsSection />
        <RoyaltiesCalculator />
        <PricingSection />
        <ManagerBannerSection />
        <TutorialSection />
        <Footer />
      </Suspense>
    </div>
  );
};

export default Index;
