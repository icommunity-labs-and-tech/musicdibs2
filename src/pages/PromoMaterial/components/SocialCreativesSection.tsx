import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Megaphone } from 'lucide-react';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';

export const SocialCreativesSection = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('promoMaterial.social.title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('promoMaterial.social.description')}</p>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          {t('promoMaterial.social.costImage')} · {t('promoMaterial.social.costCopy')}
        </AlertDescription>
      </Alert>

      <PromoteWorks />
    </div>
  );
};
