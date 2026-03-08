import { useState } from 'react';
import { RegisterWork } from '@/components/dashboard/RegisterWork';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import type { DashboardSummary } from '@/types/dashboard';

export default function RegisterPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-xl font-bold">Registrar obra</h2>
      <AccountSummary onSummaryLoaded={setSummary} />
      <RegisterWork summary={summary} />
    </div>
  );
}
