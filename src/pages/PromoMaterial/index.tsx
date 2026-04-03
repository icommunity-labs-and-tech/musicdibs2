import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Image, Sparkles, Video, Megaphone, ArrowLeft, Palette } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { CoversSection } from './components/CoversSection';
import { CreativesSection } from './components/CreativesSection';
import { SocialVideosSection } from './components/SocialVideosSection';
import { PostersSection } from './components/PostersSection';

const PromoMaterialPage = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.${key}`);
  const [activeTab, setActiveTab] = useState('covers');

  return (
    <div className="min-h-screen bg-background" key={i18n.language}>
      <Navbar />
      <main className="container mx-auto px-4 py-12 pt-24">
        <Link to="/ai-studio" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          {t('aiStudio.backToDashboard', 'Volver a AI Studio')}
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Palette className="w-8 h-8 text-primary" />
            {tr('title')}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {tr('subtitle')}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-xl">
            <TabsTrigger value="covers" className="gap-1.5 text-xs sm:text-sm">
              <Image className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabCovers')}</span>
            </TabsTrigger>
            <TabsTrigger value="creatives" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabCreatives')}</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 text-xs sm:text-sm">
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabVideos')}</span>
            </TabsTrigger>
            <TabsTrigger value="posters" className="gap-1.5 text-xs sm:text-sm">
              <Megaphone className="w-4 h-4" />
              <span className="hidden sm:inline">{tr('tabPosters')}</span>
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

          <TabsContent value="posters">
            <PostersSection />
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default PromoMaterialPage;
