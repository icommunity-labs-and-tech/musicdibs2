import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { lazy, Suspense } from 'react';

// Reuse the existing AIStudioCovers page content
const AIStudioCoversContent = lazy(() => import('@/pages/AIStudioCovers').then(m => ({ default: m.default })));

export const CoversSection = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('promoMaterial.covers.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('promoMaterial.covers.description')}</p>
      </div>
      <Suspense fallback={<div className="h-64 flex items-center justify-center text-muted-foreground">Cargando...</div>}>
        <AIStudioCoversContent />
      </Suspense>
    </div>
  );
};
