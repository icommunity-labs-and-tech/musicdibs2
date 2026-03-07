import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { WhyChooseSection } from "@/components/WhyChooseSection";
import { DistributionSection } from "@/components/DistributionSection";
import { ArtistsBanner } from "@/components/ArtistsBanner";
import { TestimonialsSection } from "@/components/TestimonialsSection";
import { PricingSection } from "@/components/PricingSection";
import { TutorialSection } from "@/components/TutorialSection";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
      <TutorialSection />
      <div className="flex justify-center py-16 bg-gradient-to-br from-[#1a0a2e] via-[#16082a] to-[#0d0618]">
        <a href="https://market.musicdibs.com/" target="_blank" rel="noopener noreferrer">
          <Button variant="hero" size="lg" className="font-semibold group">
            <span className="flex items-center gap-2">
              Accede a nuestro Market
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Button>
        </a>
      </div>
      <Footer />
    </div>
  );
};

export default Index;
