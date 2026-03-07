import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WhyChooseSection } from "@/components/WhyChooseSection";
import { DistributionSection } from "@/components/DistributionSection";
import { ArtistsBanner } from "@/components/ArtistsBanner";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/PricingSection";
import { RoyaltiesCalculator } from "@/components/RoyaltiesCalculator";
import { TutorialSection } from "@/components/TutorialSection";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";

const Index = () => {
  return (
    <div className="min-h-screen">
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
      <WhyChooseSection />
      <DistributionSection />
      <RoyaltiesCalculator />
      <PricingSection />
      <TestimonialsSection />
      <TutorialSection />
      <Footer />
    </div>
  );
};

export default Index;
