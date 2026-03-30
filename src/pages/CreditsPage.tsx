import { useTranslation } from 'react-i18next';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { CreditUsageChart } from '@/components/dashboard/CreditUsageChart';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

export default function CreditsPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-bold">{t('dashboard.creditsPage.title')}</h2>
      <p className="text-sm text-muted-foreground">
        {t('dashboard.creditsPage.description')}
      </p>
      <CreditStore />
      <CreditUsageChart />
      <CreditHistory />
    </div>
  );
}
