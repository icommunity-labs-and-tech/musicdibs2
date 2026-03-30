import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Sparkles, Music, AlertTriangle, ArrowLeft, Zap, Edit3, Lightbulb, Video, Coins, Image, Mic } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCredits } from "@/hooks/useCredits";
import { FEATURE_COSTS } from "@/lib/featureCosts";

const AIStudio = () => {
  const { credits, hasEnough } = useCredits();
  const modules = [
    {
      title: "Crear Música",
      description: "Genera música original desde cero usando IA. Describe el estilo, mood y características que deseas.",
      icon: Wand2,
      href: "/ai-studio/create",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Editar y Variar",
      description: "Modifica pistas existentes, crea variaciones o aplica inpainting para rellenar secciones.",
      icon: Edit3,
      href: "/ai-studio/edit",
      available: true,
      costsCredits: true,
      featureKey: 'edit_audio' as const,
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Inspiración",
      description: "Obtén ideas, prompts sugeridos y descubre combinaciones de géneros y moods.",
      icon: Lightbulb,
      href: "/ai-studio/inspire",
      available: true,
      costsCredits: false,
      featureKey: 'inspiration' as const,
      color: "from-amber-500 to-orange-500"
    },
    {
      title: "Crea Videoclips",
      description: "Genera videoclips musicales con IA. Describe el estilo visual, sube una imagen o crea desde texto.",
      icon: Video,
      href: "/ai-studio/video",
      available: true,
      costsCredits: true,
      featureKey: 'generate_video' as const,
      color: "from-rose-500 to-red-500"
    },
    {
      title: "Crea Portadas",
      description: "Genera portadas profesionales para tu single o álbum. Texto preciso, estilos artísticos y referencia de artistas.",
      icon: Image,
      href: "/ai-studio/covers",
      available: true,
      costsCredits: true,
      featureKey: 'generate_cover' as const,
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Canta tu canción",
      description: "Genera una pista vocal con tu voz clonada cantando tu letra. Descárgala y mézclala con tu base instrumental.",
      icon: Mic,
      href: "/ai-studio/vocal",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-violet-500 to-purple-600"
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
            <span className="text-sm font-medium">Powered by ElevenLabs AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            AI MusicDibs Studio
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crea música original con inteligencia artificial. Genera, edita y explora nuevos sonidos para tus proyectos creativos.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
          {modules.map((module) => {
            const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
            const disabled = module.costsCredits && !hasEnough(cost);
            return (
            <Card key={module.title} className={`relative overflow-hidden transition-all duration-300 ${disabled ? 'opacity-60 grayscale' : 'hover:shadow-lg hover:-translate-y-1'} ${!module.available ? 'opacity-75' : ''}`}>
              {disabled && (
                <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-[10px]">
                  Sin créditos
                </Badge>
              )}
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
                {module.costsCredits && cost > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Coins className="h-3 w-3" /> {cost} crédito{cost > 1 ? 's' : ''} por uso
                  </span>
                )}
              </CardHeader>
              <CardContent>
                {disabled ? (
                  <Button asChild className="w-full" variant="default">
                    <Link to="/dashboard/credits">
                      <Coins className="w-4 h-4 mr-2" />
                      Comprar créditos
                    </Link>
                  </Button>
                ) : (
                <Button asChild className="w-full" variant={module.available ? "default" : "secondary"}>
                  <Link to={module.href}>
                    <Zap className="w-4 h-4 mr-2" />
                    {module.available ? "Comenzar" : "Ver Preview"}
                  </Link>
                </Button>
                )}
              </CardContent>
            </Card>
            );
          })}
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
