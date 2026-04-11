import { useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Upload, Search, Megaphone, ShoppingBag, User,
  CreditCard, LifeBuoy, Music, LogOut, Mic, Sparkles, Shield,
  HelpCircle, Users, BarChart3, Settings2, Rocket, Briefcase,
  ClipboardList, ChevronDown, Palette, Lock, FolderOpen,
} from 'lucide-react';
import { DistributionInfoModal } from '@/components/DistributionInfoModal';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useKycGuard } from '@/hooks/useKycGuard';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

type GroupId = 'manager' | 'principal' | 'cuenta' | 'admin';

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut, isAdmin, isManager } = useAuth();
  const { guardRegister } = useKycGuard();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('Free');
  const { t, i18n } = useTranslation();
  const tr = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const managerItems = useMemo(() => [
    { title: tr('dashboard.sidebar.managerPanel', 'Panel Manager'), url: '/dashboard/manager', icon: Briefcase },
    { title: tr('dashboard.sidebar.myArtists', 'Mis Artistas'), url: '/dashboard/manager/artists', icon: Users },
    { title: tr('dashboard.sidebar.registerWorkNav', 'Registrar Obra'), url: '/dashboard/manager/register', icon: Upload, kycGuarded: true },
    { title: tr('dashboard.sidebar.registeredWorks', 'Obras Registradas'), url: '/dashboard/manager/works', icon: ClipboardList },
  ], [i18n.resolvedLanguage, t]);

  const mainItems = useMemo(() => [
    { title: tr('dashboard.sidebar.launchHit', 'Lanza tu primer hit 🚀'), url: '/dashboard/launch', icon: Rocket, highlight: true, launchOnly: true },
    { title: tr('dashboard.sidebar.controlPanel', 'Panel de control'), url: '/dashboard', icon: LayoutDashboard },
    { title: 'AI MusicDibs Studio', url: '/ai-studio', icon: Sparkles },
    { title: tr('dashboard.sidebar.registerWork', 'Registrar obra'), url: '/dashboard/register', icon: Upload, hideForManager: true, kycGuarded: true },
    { title: tr('dashboard.sidebar.distributeMusic', 'Distribuir tu música'), url: '#distribute', icon: Palette, hideForManager: true, isDistribute: true },
    { title: tr('dashboard.sidebar.promotion', 'Promoción RRSS'), url: '/dashboard/promotion', icon: Megaphone, hideForManager: true, tourId: 'promotion' },
    
    { title: tr('dashboard.sidebar.mediaLibrary', 'Biblioteca multimedia'), url: '/dashboard/media-library', icon: FolderOpen },
  ], [i18n.resolvedLanguage, t]);

  const accountItems = useMemo(() => [
    { title: tr('dashboard.sidebar.profile', 'Perfil'), url: '/dashboard/profile', icon: User },
    { title: tr('dashboard.sidebar.verifyIdentity', 'Verificar identidad'), url: '/dashboard/verify-identity', icon: User, kycOnly: true },
    { title: tr('dashboard.sidebar.verifyRegistrations', 'Verificar registros'), url: '/dashboard/verify', icon: Search },
    { title: tr('dashboard.sidebar.plansCredits', 'Planes y créditos'), url: '/dashboard/credits', icon: ShoppingBag },
    { title: tr('dashboard.sidebar.billing', 'Facturación'), url: '/dashboard/billing', icon: CreditCard },
    { title: tr('dashboard.sidebar.support', 'Soporte'), url: '/dashboard/support', icon: LifeBuoy },
  ], [i18n.resolvedLanguage, t]);

  const adminItems = useMemo(() => [
    { title: tr('dashboard.sidebar.users', 'Usuarios'), url: '/dashboard/admin/users', icon: Users },
    { title: tr('dashboard.sidebar.credits', 'Créditos'), url: '/dashboard/admin/credits', icon: CreditCard },
    { title: tr('dashboard.sidebar.works', 'Obras'), url: '/dashboard/admin/works', icon: Music },
    { title: tr('dashboard.sidebar.metrics', 'Métricas'), url: '/dashboard/admin/metrics', icon: BarChart3 },
    { title: 'Campañas', url: '/dashboard/admin/campaigns', icon: Megaphone },
    { title: tr('dashboard.sidebar.system', 'Sistema'), url: '/dashboard/admin/system', icon: Settings2 },
    { title: tr('dashboard.sidebar.premiumPromos', 'Promos Premium'), url: '/dashboard/admin/premium-promos', icon: Megaphone },
    { title: 'Costes Features', url: '/dashboard/admin/feature-costs', icon: Settings2 },
    { title: 'Rentabilidad APIs', url: '/dashboard/admin/api-costs', icon: BarChart3 },
    { title: '📊 Métricas Producto', url: '/dashboard/admin/product-metrics', icon: BarChart3 },
  ], [i18n.resolvedLanguage, t]);

  // Determine which group is active based on current route
  const activeGroup = useMemo<GroupId>(() => {
    const p = location.pathname;
    if (isManager && managerItems.some(i => p === i.url || p.startsWith(i.url + '/'))) return 'manager';
    if (isAdmin && adminItems.some(i => p === i.url || p.startsWith(i.url + '/'))) return 'admin';
    if (accountItems.some(i => p === i.url || p.startsWith(i.url + '/'))) return 'cuenta';
    return 'principal';
  }, [location.pathname, isAdmin, isManager]);

  const [openGroup, setOpenGroup] = useState<GroupId>(activeGroup);

  // Sync open group when route changes
  useEffect(() => { setOpenGroup(activeGroup); }, [activeGroup]);

  const toggleGroup = (id: GroupId) => {
    setOpenGroup(prev => prev === id ? id : id); // always open clicked group (accordion)
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('kyc_status, subscription_plan')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        setKycStatus(data?.kyc_status || 'unverified');
        setSubscriptionPlan(data?.subscription_plan || 'Free');
      });

    const channel = supabase
      .channel('sidebar-kyc')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.kyc_status) setKycStatus(payload.new.kyc_status);
        if (payload.new?.subscription_plan) setSubscriptionPlan(payload.new.subscription_plan);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const isActive = (path: string) =>
    path === '/dashboard'
      ? location.pathname === '/dashboard'
      : location.pathname.startsWith(path);

  const filteredMainItems = mainItems.filter(item => {
    if ((item as any).kycOnly && kycStatus === 'verified') return false;
    if ((item as any).launchOnly && isManager) return false;
    if ((item as any).hideForManager && isManager) return false;
    return true;
  });

  const renderMenuItem = (item: typeof mainItems[0], activeClass = 'bg-primary/10 text-primary font-medium') => {
    const isHighlight = !!(item as any).highlight && !isManager;
    const isDistribute = !!(item as any).isDistribute;
    const isKycGuarded = !!(item as any).kycGuarded;

    if (isDistribute) {
      const isAnnual = subscriptionPlan === 'Annual';
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild>
            <button
              onClick={() => isAnnual ? setShowDistributionModal(true) : undefined}
              disabled={!isAnnual}
              className={`flex items-center w-full rounded-md px-2 py-1.5 text-sm ${isAnnual ? 'hover:bg-muted/50' : 'opacity-50 cursor-not-allowed'}`}
              title={!isAnnual ? t('dashboard.distribute.annualOnly', { defaultValue: 'Disponible solo con suscripción anual' }) : undefined}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
              {!collapsed && !isAnnual && <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    if (isKycGuarded) {
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)} data-tour={(item as any).tourId || undefined}>
            <button
              onClick={() => guardRegister(item.url)}
              className="flex items-center w-full rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </button>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }

    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)} data-tour={(item as any).tourId || undefined}>
          <NavLink
            to={item.url}
            end={item.url === '/dashboard'}
            className={`hover:bg-muted/50 ${isHighlight ? 'text-violet-500 font-bold' : ''}`}
            activeClassName={activeClass}
          >
            <item.icon className={`mr-2 h-4 w-4 ${isHighlight ? 'text-violet-500' : ''}`} />
            {!collapsed && (
              <span className="flex items-center gap-2 flex-1">
                {item.title}
                {isHighlight && !isActive(item.url) && (
                  <span className="ml-auto rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-500 leading-none">
                    {tr('dashboard.sidebar.new', 'NUEVO')}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderCollapsibleGroup = (id: GroupId, label: string, items: any[], activeClass?: string) => (
    <Collapsible open={openGroup === id} onOpenChange={() => toggleGroup(id)}>
      <SidebarGroup>
        <CollapsibleTrigger asChild>
          <SidebarGroupLabel className="cursor-pointer select-none flex items-center justify-between pr-2 hover:text-foreground transition-colors">
            <span>{label}</span>
            {!collapsed && (
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${openGroup === id ? 'rotate-0' : '-rotate-90'}`} />
            )}
          </SidebarGroupLabel>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => renderMenuItem(item, activeClass))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );

  return (
    <>
    <Sidebar collapsible="icon" className="border-r border-border/40">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Music className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && <span className="font-bold text-base">MusicDibs</span>}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isManager && renderCollapsibleGroup('manager', tr('dashboard.sidebar.manager', 'Manager'), managerItems)}

        {renderCollapsibleGroup('principal', tr('dashboard.sidebar.principal', 'Principal'), filteredMainItems)}

        {renderCollapsibleGroup('cuenta', tr('dashboard.sidebar.account', 'Cuenta'), accountItems)}

        {isAdmin && renderCollapsibleGroup('admin', tr('dashboard.sidebar.admin', 'Administración'), adminItems, 'bg-pink-500/10 text-pink-400 font-medium')}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-1">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => { window.dispatchEvent(new CustomEvent('musicdibs:start-tour')); }}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          {!collapsed && <span>{tr('dashboard.sidebar.panelGuide', 'Tutorial guiado')}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => { await signOut(); navigate('/login'); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>{tr('dashboard.sidebar.logout', 'Cerrar sesión')}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
    <DistributionInfoModal open={showDistributionModal} onOpenChange={setShowDistributionModal} />
    </>
  );
}