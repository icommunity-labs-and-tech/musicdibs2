import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useTranslation } from "react-i18next";
import { LazyYouTube } from "@/components/LazyYouTube";

const TutorialSection = () => {
  const { t } = useTranslation();
  const steps = [
    {
      step: 1,
      title: "Date de alta",
      description: "Regístrate y verifica tu identidad para dar validez legal a tus registros."
    },
    {
      step: 2,
      title: "Registra tu canción",
      description: (
        <>
          Sube tu obra; generamos una huella digital y la registramos en blockchain en segundos. Descarga tu certificado de registro, con sello de tiempo.{' '}
          <a 
            href="https://musicdibs.com/certification/sneaky-ways-latin/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pink-300 hover:text-pink-200 underline"
          >
            Ver ej. certificado
          </a>
          .
        </>
      )
    },
    {
      step: 3,
      title: "Distribuye tu música",
      description: "Llega a Spotify, Apple Music, YouTube y más de 200 plataformas con un solo clic. Controla y monetiza tus lanzamientos desde tu panel."
    }
  ];

  return (
    <section id="tutorial-section" className="py-20 relative overflow-hidden bg-gradient-to-b from-purple-600 via-purple-700 to-purple-800">
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t("tutorial.heading")}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {t("tutorial.subtitle")}
          </p>
        </div>
        
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
            <CardContent className="p-8">
              <Carousel className="w-full">
                <CarouselContent>
                  <CarouselItem>
                    <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                      <LazyYouTube videoId="a4HMb8pV2hQ" title="Tutorial de Registro - Musicdibs" />
                    </div>
                  </CarouselItem>
                  <CarouselItem>
                    <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
                      <LazyYouTube videoId="YS8euOYAdp8" title="Tutorial de Distribución - Musicdibs" />
                    </div>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious className="left-4 bg-white/90 hover:bg-white text-purple-600 border-purple-200 shadow-lg" />
                <CarouselNext className="right-4 bg-white/90 hover:bg-white text-purple-600 border-purple-200 shadow-lg" />
              </Carousel>
            </CardContent>
          </Card>
        </div>

        {/* Steps section */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <span className="text-2xl font-bold text-white">{step.step}</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">
                {t("tutorial.steps.step")} {step.step}: {step.title}
              </h3>
              <p className="text-lg text-white/90 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-8">
            {t("tutorial.ctaTitle")}
          </h3>
          <Button 
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-bold py-4 px-12 rounded-full text-lg shadow-lg transform hover:scale-105 transition-all duration-200"
            onClick={() => {
              document.getElementById('pricing-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            {t("tutorial.ctaButton")}
          </Button>
        </div>
      </div>
    </section>
  );
};

export { TutorialSection };
