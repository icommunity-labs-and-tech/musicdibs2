import { CreditStore } from '@/components/dashboard/CreditStore';

export default function CreditsPage() {
  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-bold">Créditos</h2>
      <CreditStore />
    </div>
  );
}
