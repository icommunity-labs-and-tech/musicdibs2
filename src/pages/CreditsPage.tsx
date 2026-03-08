import { CreditStore } from '@/components/dashboard/CreditStore';
import { CreditHistory } from '@/components/dashboard/CreditHistory';

export default function CreditsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-xl font-bold">Planes y créditos</h2>
      <p className="text-sm text-muted-foreground">
        Cada registro de obra consume 1 crédito. Elige el plan que mejor se adapte a ti. Los créditos de las suscripciones se reinician al acabar el periodo.
      </p>
      <CreditStore />
      <CreditHistory />
    </div>
  );
}
