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
      />
      <Navbar />
      <HeroSection />
      <WhyChooseSection />
      <DistributionSection />
      <ArtistsBanner />
      <TestimonialsSection />
      <PricingSection />
      <RoyaltiesCalculator />
      <TutorialSection />
      <Footer />
    </div>
  );
};

export default Index;
