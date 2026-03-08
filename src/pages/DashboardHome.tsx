import { useState } from 'react';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { RegisterWork } from '@/components/dashboard/RegisterWork';
import { VerifyRegistration } from '@/components/dashboard/VerifyRegistration';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import type { DashboardSummary } from '@/types/dashboard';

export default function DashboardHome() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AccountSummary onSummaryLoaded={setSummary} />
      <PromoteWorks />
      <CreditStore />
      <RegisterWork summary={summary} />
      <VerifyRegistration />
      <RecentRegistrations />
    </div>
  );
}
