import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { useTranslation } from 'react-i18next';

export default function PromotePage() {
  const { i18n } = useTranslation();
  return (
    <div className="max-w-3xl space-y-4" key={i18n.language}>
      <PromoteWorks />
    </div>
  );
}
