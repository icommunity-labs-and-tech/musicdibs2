import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { RegistrationWizard } from '@/components/dashboard/register/RegistrationWizard';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardSummary } from '@/types/dashboard';

export default function RegisterPage() {
  const { isManager } = useAuth();
  if (isManager) return <Navigate to="/dashboard/manager/register" replace />;
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
