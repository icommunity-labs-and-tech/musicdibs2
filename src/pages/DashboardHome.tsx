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
    <div className="space-y-4 max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Account Summary + Verify + Promote */}
        <div className="space-y-4">
          <div data-tour="account-summary">
            <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} />
          </div>
          <div data-tour="verify-registration">
            <VerifyRegistration />
          </div>
          <PromoteWorks />
        </div>

        {/* Col 2: Register Work */}
        <div className="space-y-4">
          <div data-tour="register-work">
            <RegisterWork summary={summary} />
          </div>
        </div>

        {/* Col 3: Credit Store + Recent Registrations */}
        <div className="space-y-4">
          <div data-tour="credit-store">
            <CreditStore compact />
          </div>
          <div data-tour="recent-registrations">
            <RecentRegistrations />
          </div>
        </div>
      </div>
    </div>
  );
}
