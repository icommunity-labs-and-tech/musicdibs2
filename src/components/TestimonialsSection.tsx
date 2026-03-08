import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { useTranslation } from "react-i18next";
import { LazyYouTube } from "@/components/LazyYouTube";

const TestimonialsSection = () => {
  const [currentVideo, setCurrentVideo] = useState(0);
  const { t } = useTranslation();
  
  const testimonials = [
    {
      name: "Erika Bada",
      title: "Bada Sessions",
      videoId: "CnS6IblpMzY"
    },
    {
      name: "Christian",
      title: "ChristianVib", 
      videoId: "KodixKxB0C8"
    },
    {
      name: "Gr3go",
      title: "Taller de música online",
      videoId: "O7f3tdP6NjI"
    },
    {
      name: "Nico Astegiano",
      title: "Nico Astegiano Youtube",
      videoId: "3Nok9jcbbuM"
    },
    {
      name: "Matias Martinez",
      title: "Matzz",
      videoId: "rq7ndp10DXA"
    }
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-gradient-to-b from-purple-600/80 via-purple-700/70 to-primary/60">
      
      
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              {t("testimonials.heading")}
            </h2>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delay={200}>
          <div className="max-w-2xl mx-auto">
          <Card className="bg-card/80 backdrop-blur-sm border-border shadow-2xl">
            <CardContent className="p-8">
              <div className="aspect-video mb-6 rounded-lg overflow-hidden shadow-lg">
                <LazyYouTube 
                  videoId={testimonials[currentVideo].videoId} 
                  title={t("testimonials.videoTitle", { name: testimonials[currentVideo].name })} 
                />
              </div>
              
              <div className="text-center mb-6">
                <h3 className="text-2xl font-semibold text-foreground mb-2">
                  {testimonials[currentVideo].name}
                </h3>
                <p className="text-lg text-muted-foreground">
                  {testimonials[currentVideo].title}
                </p>
              </div>
              
              {/* Navigation dots */}
              <div className="flex justify-center space-x-3">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentVideo(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentVideo 
                        ? 'bg-primary scale-125' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`View testimonial ${index + 1}`}
                  />
                ))}
              </div>
            </CardContent>
            </Card>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export { TestimonialsSection };