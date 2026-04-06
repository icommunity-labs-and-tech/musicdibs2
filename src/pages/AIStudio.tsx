import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wand2, Sparkles, Music, AlertTriangle, ArrowLeft, Zap, Lightbulb, Coins, Image, Mic, ArrowRight, Headphones } from "lucide-react";
import { PricingLink } from "@/components/dashboard/PricingPopup";
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
      features: [
        "aiStudio.createMusic.feature1",
        "aiStudio.createMusic.feature2",
        "aiStudio.createMusic.feature3",
      ],
      icon: Music,
      href: "/ai-studio/create",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-violet-500 to-purple-500",
      creditsLabel: "aiStudio.createMusic.credits",
    },
    {
      titleKey: "aiStudio.modules.editModify.title",
      descKey: "aiStudio.modules.editModify.desc",
      features: [
        "aiStudio.master.feature1",
        "aiStudio.master.feature2",
        "aiStudio.master.feature3",
      ],
      icon: Headphones,
      href: "/ai-studio/edit",
      available: true,
      costsCredits: true,
      featureKey: 'edit_audio' as const,
      color: "from-blue-500 to-cyan-500",
      creditsLabel: "aiStudio.master.credits",
    },
  ];

  const secondaryModules = [
    {
      titleKey: "aiStudio.modules.singYourSong.title",
      descKey: "aiStudio.modules.singYourSong.desc",
      icon: Mic,
      href: "/ai-studio/vocal",
      available: true,
      costsCredits: true,
      featureKey: 'generate_audio' as const,
      color: "from-violet-500 to-purple-600",
      creditsLabel: "aiStudio.voiceTools.credits",
    },
    {
      titleKey: "aiStudio.modules.createCovers.title",
      descKey: "aiStudio.modules.createCovers.desc",
      icon: Image,
      href: "/ai-studio/promo-material",
      available: true,
      costsCredits: true,
      featureKey: 'generate_cover' as const,
      color: "from-emerald-500 to-teal-500",
      creditsLabel: "aiStudio.promoMaterial.credits",
    },
    {
      titleKey: "aiStudio.modules.inspire.title",
      descKey: "aiStudio.modules.inspire.desc",
      icon: Lightbulb,
      href: "/ai-studio/inspire",
      available: true,
      costsCredits: false,
      featureKey: 'inspiration' as const,
      color: "from-amber-500 to-orange-500",
      creditsLabel: "aiStudio.free",
    },
  ];

  const renderMainCard = (module: typeof mainModules[0]) => {
    const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
    const disabled = !module.available || (module.costsCredits && !hasEnough(cost));

    return (
      <Card
        key={module.titleKey}
        className={`relative overflow-hidden transition-all duration-300 flex flex-col ${
          disabled ? 'opacity-60 grayscale' : 'hover:shadow-xl hover:-translate-y-1'
        }`}
      >
        <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${module.color}`} />

        {module.costsCredits && !hasEnough(cost) && (
          <Badge variant="destructive" className="absolute top-4 right-4 z-10 text-[10px]">
            {t('aiStudio.noCredits')}
          </Badge>
        )}

        <CardHeader className="flex-1 pb-2">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${module.color} flex items-center justify-center mb-4`}>
            <module.icon className="w-7 h-7 text-white" />
          </div>
          <CardTitle className="text-xl">{t(module.titleKey)}</CardTitle>
          <CardDescription className="text-sm">{t(module.descKey)}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Features list */}
          <ul className="space-y-2">
            {module.features.map((fKey, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                <span>{t(fKey)}</span>
              </li>
            ))}
          </ul>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <Badge variant="outline" className="text-xs font-normal">
              {t(module.creditsLabel)}
            </Badge>
            {disabled ? (
              <Button asChild size="sm" variant="default">
                <Link to="/dashboard/credits">
                  <Coins className="w-4 h-4 mr-1.5" />
                  {t('aiStudio.buyCredits')}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="default">
                <Link to={module.href}>
                  {t('aiStudio.startBtn')}
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Link>
              </Button>
            )}
          </div>

          {module.costsCredits && cost > 0 && (
            <span className="text-center"><PricingLink /></span>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSecondaryCard = (module: typeof secondaryModules[0]) => {
    const cost = module.featureKey ? FEATURE_COSTS[module.featureKey] : 0;
    const disabled = !module.available || (module.costsCredits && !hasEnough(cost));

    return (
      <Card
        key={module.titleKey}
        className={`relative overflow-hidden transition-all duration-300 flex flex-col ${
          disabled ? 'opacity-60 grayscale' : 'hover:shadow-lg hover:-translate-y-1'
        }`}
      >
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${module.color}`} />

        {!module.costsCredits && (
          <Badge className="absolute top-3 right-3 z-10 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white border-0">
            {t('aiStudio.free', 'Gratis')}
          </Badge>
        )}
        {module.costsCredits && !hasEnough(cost) && (
          <Badge variant="destructive" className="absolute top-3 right-3 z-10 text-[10px]">
            {t('aiStudio.noCredits')}
          </Badge>
        )}

        <CardHeader className="flex-1 pb-2">
          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center mb-3`}>
            <module.icon className="w-5 h-5 text-white" />
          </div>
          <CardTitle className="text-base">{t(module.titleKey)}</CardTitle>
          <CardDescription className="text-sm line-clamp-2">{t(module.descKey)}</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-[10px] font-normal">
              {t(module.creditsLabel)}
            </Badge>
            {disabled ? (
              <Button asChild size="sm" variant="default">
                <Link to="/dashboard/credits">
                  <Coins className="w-3.5 h-3.5 mr-1" />
                  {t('aiStudio.buyCredits')}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="default">
                <Link to={module.href}>
                  {t('aiStudio.startBtn')}
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

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
        <div className="text-center mb-12">
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

        {/* Row 1: Main modules — 2 large cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {mainModules.map(renderMainCard)}
        </div>

        {/* Row 2: Secondary modules — 3 compact cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {secondaryModules.map(renderSecondaryCard)}
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
