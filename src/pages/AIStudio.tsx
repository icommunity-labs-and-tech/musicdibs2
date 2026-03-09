import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Sparkles, Music, AlertTriangle, ArrowLeft, Zap, Edit3, Lightbulb, Video } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const AIStudio = () => {
  const modules = [
    {
      title: "Crear Música",
      description: "Genera música original desde cero usando IA. Describe el estilo, mood y características que deseas.",
      icon: Wand2,
      href: "/ai-studio/create",
      available: true,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Editar y Variar",
      description: "Modifica pistas existentes, crea variaciones o aplica inpainting para rellenar secciones.",
      icon: Edit3,
      href: "/ai-studio/edit",
      available: true,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Inspiración",
      description: "Obtén ideas, prompts sugeridos y descubre combinaciones de géneros y moods.",
      icon: Lightbulb,
      href: "/ai-studio/inspire",
      available: true,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Videoclips",
      description: "Genera videoclips musicales con IA. Sube tu pista, describe el estilo visual y obtén un vídeo único.",
      icon: Video,
      href: "/ai-studio/video",
      available: false,
      color: "from-rose-500 to-red-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 pt-24">
        {/* Back Button */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">Powered by Stable Audio 2.5</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            AI MusicDibs Studio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crea música original con inteligencia artificial. Genera, edita y explora nuevos sonidos para tus proyectos creativos.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {modules.map((module) => (
            <Card key={module.title} className={`relative overflow-hidden transition-all duration-300 ${module.available ? 'hover:shadow-lg hover:-translate-y-1' : 'opacity-60'}`}>
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`} />
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  {module.title}
                  {!module.available && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Próximamente</span>
                  )}
                </CardTitle>
                <CardDescription>{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {module.available ? (
                  <Button asChild className="w-full">
                    <Link to={module.href}>
                      <Zap className="w-4 h-4 mr-2" />
                      Comenzar
                    </Link>
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Próximamente
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: Music, title: "Alta Calidad", desc: "Audio de 44.1kHz estéreo" },
            { icon: Zap, title: "Rápido", desc: "Generación en segundos" },
            { icon: Sparkles, title: "Creativo", desc: "Infinitas posibilidades" },
            { icon: Wand2, title: "Fácil", desc: "Solo describe tu idea" }
          ].map((feature) => (
            <div key={feature.title} className="text-center p-6 rounded-xl bg-muted/50">
              <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Legal Notice */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                Uso Responsable y Derechos
              </h3>
              <p className="text-sm text-muted-foreground">
                La música generada por IA está sujeta a los términos de servicio de Stable Audio. 
                Úsala de manera ética y responsable. Las obras generadas pueden registrarse en MusicDibs 
                para proteger tus derechos, pero debes verificar que cumplen con las políticas de uso comercial.
                No generes contenido que infrinja derechos de terceros o que sea ofensivo.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default AIStudio;
