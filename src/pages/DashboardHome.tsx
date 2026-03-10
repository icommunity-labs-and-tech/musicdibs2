import { useState, useEffect } from 'react';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { RegisterWork } from '@/components/dashboard/RegisterWork';
import { VerifyRegistration } from '@/components/dashboard/VerifyRegistration';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardSummary } from '@/types/dashboard';

export default function DashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const check = () => {
      supabase.functions.invoke('check-subscription').then(({ data, error }) => {
        if (error) console.error('[check-subscription]', error);
        else {
          setSubscriptionEnd(data?.subscription_end ?? null);
        }
      });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-[1400px]">
      {/* Col 1: Account Summary + Verify Registration */}
      <div className="space-y-4">
        <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} />
        <VerifyRegistration />
      </div>

      {/* Col 2: Register Work + Promote Works */}
      <div className="space-y-4">
        <RegisterWork summary={summary} />
        <PromoteWorks />
      </div>

      {/* Col 3: Credit Store + Recent Registrations */}
      <div className="space-y-4">
        <CreditStore compact />
        <RecentRegistrations />
      </div>
    </div>
  );
}
