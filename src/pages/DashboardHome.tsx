import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { VerifyRegistration } from '@/components/dashboard/VerifyRegistration';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { DashboardSummary } from '@/types/dashboard';

export default function DashboardHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

        {/* Col 2: Register CTA */}
        <div className="space-y-4">
          <div data-tour="register-work">
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Registrar una nueva obra</h3>
                  <p className="text-sm text-muted-foreground">
                    Inicia el proceso de registro y protección de tu obra paso a paso.
                  </p>
                </div>
                <Button variant="hero" onClick={() => navigate('/dashboard/register')} className="w-full">
                  Ir al registro
                </Button>
              </CardContent>
            </Card>
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

