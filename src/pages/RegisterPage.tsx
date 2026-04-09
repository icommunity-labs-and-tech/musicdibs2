import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { RegistrationWizard } from '@/components/dashboard/register/RegistrationWizard';
import { AccountSummary } from '@/components/dashboard/AccountSummary';
import { PricingPopup } from '@/components/dashboard/PricingPopup';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import type { DashboardSummary } from '@/types/dashboard';
import { Loader2, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const { isManager } = useAuth();
  const { isVerified, kycLoading } = useKycGuard();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);

  if (isManager) return <Navigate to="/dashboard/manager/register" replace />;

  // While checking KYC status, show a loader
  if (kycLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // If not verified, redirect to verify-identity
  if (!isVerified) {
    return <Navigate to="/dashboard/verify-identity" replace />;
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Registrar obra</h2>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => setPricingOpen(true)}>
          <Coins className="h-4 w-4" />
          Ver precios
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <RegistrationWizard summary={summary} />
        <div className="hidden lg:block">
          <AccountSummary onSummaryLoaded={setSummary} />
        </div>
      </div>
      <PricingPopup open={pricingOpen} onOpenChange={setPricingOpen} />
    </div>
  );
}
