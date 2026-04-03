import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export const FlyersSection = () => {
  const { t } = useTranslation();
  const tr = (key: string) => t(`promoMaterial.flyers.${key}`);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{tr('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{tr('description')}</p>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">{tr('comingSoon')}</h3>
          <p className="text-sm text-muted-foreground/70 mt-2 max-w-sm">
            {tr('comingSoonDesc')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
