import { CreditStore } from '@/components/dashboard/CreditStore';

export default function CreditsPage() {
  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-bold">Comprar créditos</h2>
      <p className="text-sm text-muted-foreground">Cada registro de obra consume 1 crédito. Elige el plan que mejor se adapte a ti.</p>
      <CreditStore />
    </div>
  );
}
