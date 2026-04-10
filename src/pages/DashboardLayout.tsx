import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useKycGuard } from '@/hooks/useKycGuard';
import { NotificationsProvider } from '@/hooks/useNotifications';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { NotificationToaster } from '@/components/dashboard/NotificationToaster';
import { CreditBadge } from '@/components/dashboard/CreditBadge';
import { DashboardTour } from '@/components/dashboard/DashboardTour';
import { Button } from '@/components/ui/button';
import { Loader2, Plus } from 'lucide-react';
import { useUsageTracking } from '@/hooks/useUsageTracking';

export default function DashboardLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { guardRegister } = useKycGuard();
  useUsageTracking(); // auto-tracks login_after_purchase on mount

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!user) return null;

  return (
    <NotificationsProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <DashboardSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header className="sticky top-0 z-50 h-12 flex items-center justify-between border-b border-border/40 bg-background/95 backdrop-blur-sm px-4">
              <div className="flex items-center">
                <SidebarTrigger className="mr-3" />
                <h1 className="text-sm font-semibold text-muted-foreground">Panel de control</h1>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="hero"
                  size="sm"
                  className="hidden md:inline-flex h-8 text-xs rounded-full px-4"
                  onClick={() => guardRegister()}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Registrar obra
                </Button>
                <CreditBadge />
                <NotificationBell />
              </div>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
        <DashboardTour />
        <NotificationToaster />
      </SidebarProvider>
    </NotificationsProvider>
  );
}
