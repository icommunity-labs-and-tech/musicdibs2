import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Sparkles, Music, AlertTriangle, ArrowLeft, Zap, Edit3, Lightbulb, Video, Coins, Image, Mic } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCredits } from "@/hooks/useCredits";
import { FEATURE_COSTS } from "@/lib/featureCosts";
import { useTranslation } from "react-i18next";

const AIStudio = () => {
  const { credits, hasEnough } = useCredits();
  const { t } = useTranslation();

  const mainModules = [
    {
      titleKey: "aiStudio.modules.createMusic.title",
      descKey: "aiStudio.modules.createMusic.desc",
      icon: Wand2,
      href: "/ai-studio/create",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-purple-500 to-pink-500"
    },
    {
      titleKey: "aiStudio.modules.editModify.title",
      descKey: "aiStudio.modules.editModify.desc",
      icon: Edit3,
      href: "/ai-studio/edit",
      available: true,
      costsCredits: true,
      featureKey: 'edit_audio' as const,
      color: "from-blue-500 to-cyan-500"
    },
    {
      titleKey: "aiStudio.modules.inspire.title",
      descKey: "aiStudio.modules.inspire.desc",
      icon: Lightbulb,
      href: "/ai-studio/inspire",
      available: true,
      costsCredits: false,
      featureKey: 'inspiration' as const,
      color: "from-amber-500 to-orange-500"
    },
    {
      titleKey: "aiStudio.modules.singYourSong.title",
      descKey: "aiStudio.modules.singYourSong.desc",
      icon: Mic,
      href: "/ai-studio/vocal",
      available: false,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-violet-500 to-purple-600"
    }
  ];

  const promoModules = [
    {
      titleKey: "aiStudio.modules.createVideoclips.title",
      descKey: "aiStudio.modules.createVideoclips.desc",
      icon: Video,
      href: "/ai-studio/video",
      available: true,
      costsCredits: true,
      featureKey: 'generate_video' as const,
      color: "from-rose-500 to-red-500"
    },
    {
      titleKey: "aiStudio.modules.createCovers.title",
      descKey: "aiStudio.modules.createCovers.desc",
      icon: Image,
      href: "/ai-studio/covers",
      available: true,
      costsCredits: true,
      featureKey: 'generate_cover' as const,
      color: "from-emerald-500 to-teal-500"
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12 pt-24">
        {/* Back Button */}
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiStudio.backToDashboard')}
        </Link>

        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">{t('aiStudio.poweredBy')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            {t('aiStudio.pageTitle')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('aiStudio.pageSubtitle')}
          </p>
        </div>

        {/* Main Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {mainModules.map((module) => {
            const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
            const disabled = !module.available || (module.costsCredits && !hasEnough(cost));
            return (
            <Card key={module.titleKey} className={`relative overflow-hidden transition-all duration-300 ${disabled ? 'opacity-50 grayscale pointer-events-none' : 'hover:shadow-lg hover:-translate-y-1'}`}>
              {!module.available && (
                <Badge variant="secondary" className="absolute top-3 right-3 z-10 text-[10px]">
                  {t('aiStudio.comingSoon')}
                </Badge>
              )}
              {module.available && !hasEnough(cost) && module.costsCredits && (
                <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-[10px]">
                  {t('aiStudio.noCredits')}
                </Badge>
              )}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`} />
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                  <module.icon className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  {t(module.titleKey)}
                  {!module.available && (
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{t('aiStudio.comingSoon')}</span>
                  )}
                </CardTitle>
                <CardDescription>{t(module.descKey)}</CardDescription>
                {module.costsCredits && cost > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Coins className="h-3 w-3" /> {cost} {cost > 1 ? t('aiStudio.creditsPerUse') : t('aiStudio.creditPerUse')}
                  </span>
                )}
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant={module.available ? "default" : "secondary"} disabled={disabled}>
                  <Zap className="w-4 h-4 mr-2" />
                  {module.available ? t('aiStudio.startBtn') : t('aiStudio.comingSoon')}
                </Button>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Promo Material Group */}
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 mb-16">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('aiStudio.promoGroupTitle', 'Genera material promocional')}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {promoModules.map((module) => {
              const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
              const disabled = module.costsCredits && !hasEnough(cost);
              return (
              <Card key={module.titleKey} className={`relative overflow-hidden transition-all duration-300 ${disabled ? 'opacity-60 grayscale' : 'hover:shadow-lg hover:-translate-y-1'}`}>
                {disabled && (
                  <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-[10px]">
                    {t('aiStudio.noCredits')}
                  </Badge>
                )}
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`} />
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
                    <module.icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle>{t(module.titleKey)}</CardTitle>
                  <CardDescription>{t(module.descKey)}</CardDescription>
                  {module.costsCredits && cost > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Coins className="h-3 w-3" /> {cost} {cost > 1 ? t('aiStudio.creditsPerUse') : t('aiStudio.creditPerUse')}
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  {disabled ? (
                    <Button asChild className="w-full" variant="default">
                      <Link to="/dashboard/credits">
                        <Coins className="w-4 h-4 mr-2" />
                        {t('aiStudio.buyCredits')}
                      </Link>
                    </Button>
                  ) : (
                  <Button asChild className="w-full" variant="default">
                    <Link to={module.href}>
                      <Zap className="w-4 h-4 mr-2" />
                      {t('aiStudio.startBtn')}
                    </Link>
                  </Button>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: Music, key: 'highQuality' },
            { icon: Zap, key: 'fast' },
            { icon: Sparkles, key: 'creative' },
            { icon: Wand2, key: 'easy' }
          ].map((feature) => (
            <div key={feature.key} className="text-center p-6 rounded-xl bg-muted/50">
              <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">{t(`aiStudio.features.${feature.key}.title`)}</h3>
              <p className="text-sm text-muted-foreground">{t(`aiStudio.features.${feature.key}.desc`)}</p>
            </div>
          ))}
        </div>

        {/* Legal Notice */}
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-start gap-4 pt-6">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
                {t('aiStudio.legalTitle')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('aiStudio.legalText')}
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
