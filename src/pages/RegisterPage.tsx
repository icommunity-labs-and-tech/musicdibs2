import { useState } from 'react';
import { RegistrationWizard } from '@/components/dashboard/register/RegistrationWizard';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import type { DashboardSummary } from '@/types/dashboard';

export default function RegisterPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-xl font-bold">Registrar obra</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <RegistrationWizard summary={summary} />
        <div className="hidden lg:block">
          <AccountSummary onSummaryLoaded={setSummary} />
        </div>
      </div>
    </div>
  );
}
