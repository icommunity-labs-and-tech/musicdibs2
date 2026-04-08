import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Sparkles, Video, ArrowLeft, Palette, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';

import { CoversSection } from './components/CoversSection';
import { CreativesSection } from './components/CreativesSection';
import { SocialVideosSection } from './components/SocialVideosSection';

import { PromoMaterialTour } from '@/components/ai-studio/PromoMaterialTour';

const PromoMaterialPage = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.${key}`);
  const [activeTab, setActiveTab] = useState('covers');

  return (
    <div className="min-h-screen bg-background" key={i18n.language}>
      <Navbar />
      <PromoMaterialTour />
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiStudio.backToDashboard', 'Volver a AI Studio')}
        </Link>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Palette className="w-8 h-8 text-primary" />
              {tr('title')}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              {tr('subtitle')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => window.dispatchEvent(new Event('musicdibs:start-promo-tour'))}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{t('promoMaterialTour.rewatch', { defaultValue: 'Ver tutorial' })}</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="covers" className="gap-1.5 text-xs sm:text-sm" data-tour="pm-covers-tab">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabCovers')}</span>
            </TabsTrigger>
            <TabsTrigger value="creatives" className="gap-1.5 text-xs sm:text-sm" data-tour="pm-creatives-tab">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabCreatives')}</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm" data-tour="pm-videos-tab">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabVideos')}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="covers">
            <CoversSection />
          </TabsContent>

          <TabsContent value="creatives">
            <CreativesSection />
          </TabsContent>

          <TabsContent value="videos">
            <SocialVideosSection />
          </TabsContent>
        </Tabs>
      </main>
      
    </div>
  );
};

export default PromoMaterialPage;
