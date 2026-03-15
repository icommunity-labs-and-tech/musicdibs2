import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { VerifyRegistration } from '@/components/dashboard/VerifyRegistration';
import { PaymentAlertBanner } from '@/components/dashboard/PaymentAlertBanner';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Upload, Shield, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-6 max-w-[1400px]">
      <PaymentAlertBanner />
      {/* KYC verification alert */}
      {summary && summary.kycStatus !== 'verified' && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
              <Shield className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">Verificación de identidad requerida</p>
                <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                  {summary.kycStatus === 'pending' ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> En revisión</>
                  ) : (
                    <><AlertCircle className="h-3 w-3" /> No verificado</>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.kycStatus === 'pending'
                  ? 'Tu verificación de identidad puede tardar hasta 48 horas en estar lista.'
                  : 'Necesitas verificar tu identidad para poder registrar obras. Completa el proceso de verificación KYC.'}
              </p>
            </div>
            {summary.kycStatus === 'unverified' && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-amber-500/30 text-amber-600 hover:bg-amber-500/10 shrink-0"
                onClick={() => navigate('/dashboard/verify-identity')}
              >
                <Shield className="h-3.5 w-3.5" /> Verificar identidad
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Col 1: Account Summary + Verify */}
        <div className="space-y-4">
          <div data-tour="account-summary">
            <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} />
          </div>
          <div data-tour="verify-registration">
            <VerifyRegistration />
          </div>
        </div>

        {/* Col 2: Register CTA + Promote */}
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
          <PromoteWorks />
        </div>

        {/* Col 3: Credit Store */}
        <div className="space-y-4">
          <div data-tour="credit-store">
            <CreditStore compact />
          </div>
        </div>
      </div>

      {/* Full-width Recent Registrations */}
      <div data-tour="recent-registrations">
        <RecentRegistrations />
      </div>
    </div>
  );
}
