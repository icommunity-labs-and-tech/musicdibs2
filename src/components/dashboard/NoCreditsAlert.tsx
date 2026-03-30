import { Link } from 'react-router-dom';
import { AlertCircle, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface NoCreditsAlertProps {
  message?: string;
}

export function NoCreditsAlert({ message }: NoCreditsAlertProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
      <AlertCircle className="h-8 w-8 text-destructive" />
      <p className="text-sm font-medium text-destructive">{message || t('dashboard.noCredits.message')}</p>
      <Button asChild variant="default" size="sm">
        <Link to="/dashboard/credits">
          <Coins className="h-4 w-4 mr-1.5" />
          {t('dashboard.noCredits.buyCredits')}
        </Link>
      </Button>
    </div>
  );
}
