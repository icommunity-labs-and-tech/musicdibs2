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

const Index = () => {
  return (
    <div className="min-h-screen">
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
