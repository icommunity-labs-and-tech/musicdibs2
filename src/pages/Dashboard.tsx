import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import { Button } from '@/components/ui/button';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PromoteWorks } from '@/components/dashboard/PromoteWorks';
import { CreditStore } from '@/components/dashboard/CreditStore';
import { VerifyRegistration } from '@/components/dashboard/VerifyRegistration';
import { RecentRegistrations } from '@/components/dashboard/RecentRegistrations';
import { Card, CardContent } from '@/components/ui/card';
import { Music, LogOut, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DashboardSummary } from '@/types/dashboard';

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { guardRegister } = useKycGuard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading]);

  // Sync subscription status with Stripe on dashboard load
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return; // skip if no valid session
      supabase.functions.invoke('check-subscription').then(({ data, error }) => {
        if (error) console.error('[check-subscription]', error);
        else {
          console.log('[check-subscription]', data);
          if (!data?.auth_error) {
            setSubscriptionEnd(data?.subscription_end ?? null);
          }
        }
      });
    };
    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [user]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0618 100%)' }}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg">MusicDibs</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate('/login'); }}>
              <LogOut className="h-4 w-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      {/* Dashboard Grid */}
      <main className="container py-6">
        <h1 className="text-xl font-bold mb-6">Panel de control</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Row 1 */}
          <AccountSummary onSummaryLoaded={setSummary} subscriptionEnd={subscriptionEnd} />
          <PromoteWorks />
          <CreditStore />

          {/* Row 2 */}
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
              <Button variant="hero" onClick={() => guardRegister()} className="w-full">
                Ir al registro
              </Button>
            </CardContent>
          </Card>
          <VerifyRegistration />
          <RecentRegistrations />
        </div>
      </main>
    </div>
  );
}
