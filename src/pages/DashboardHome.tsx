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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-[1400px]">
      {/* Account Summary - Mobile order 1, Desktop Col 1 Row 1 */}
      <div className="lg:col-span-3 lg:row-start-1 order-1 lg:order-none">
        <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} />
      </div>

      {/* Register Work - Mobile order 2 (Primary Action), Desktop Col 2 Row 1 */}
      <div className="lg:col-span-4 lg:col-start-4 lg:row-start-1 order-2 lg:order-none">
        <RegisterWork summary={summary} />
      </div>

      {/* Verify Registration - Mobile order 3, Desktop Col 1 Row 2 */}
      <div className="lg:col-span-3 lg:row-start-2 order-3 lg:order-none">
        <VerifyRegistration />
      </div>

      {/* Promote Works - Mobile order 4, Desktop Col 2 Row 2 */}
      <div className="lg:col-span-4 lg:col-start-4 lg:row-start-2 order-4 lg:order-none">
        <PromoteWorks />
      </div>

      {/* Credit Store - Mobile order 5, Desktop Col 3 Row 1 */}
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-1 order-5 lg:order-none">
        <CreditStore compact />
      </div>

      {/* Recent Registrations - Mobile order 6, Desktop Col 3 Row 2 */}
      <div className="lg:col-span-5 lg:col-start-8 lg:row-start-2 order-6 lg:order-none">
        <RecentRegistrations />
      </div>
    </div>
  );
}
