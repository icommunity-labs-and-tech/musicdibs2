import { useState } from 'react';
import { RegisterWork } from '@/components/dashboard/RegisterWork';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import type { DashboardSummary } from '@/types/dashboard';

export default function RegisterPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Registrar obra</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6">
        <RegisterWork summary={summary} />
        <AccountSummary onSummaryLoaded={setSummary} />
      </div>
    </div>
  );
}
