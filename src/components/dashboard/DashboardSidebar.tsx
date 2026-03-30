import { useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard, Upload, Search, Megaphone, ShoppingBag, User,
  CreditCard, LifeBuoy, Music, LogOut, Mic, Sparkles, Shield,
  HelpCircle, Users, BarChart3, Settings2, Rocket, Briefcase,
  ClipboardList, UserCircle, ChevronDown,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, SidebarHeader, useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

type GroupId = 'manager' | 'principal' | 'cuenta' | 'admin';

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const { t } = useTranslation();

  const managerItems = useMemo(() => [
    { title: t('dashboard.sidebar.managerPanel'), url: '/dashboard/manager', icon: Briefcase },
    { title: t('dashboard.sidebar.myArtists'), url: '/dashboard/manager/artists', icon: Users },
    { title: t('dashboard.sidebar.registerWorkNav'), url: '/dashboard/manager/register', icon: Upload },
    { title: t('dashboard.sidebar.registeredWorks'), url: '/dashboard/manager/works', icon: ClipboardList },
  ], [t]);

  const mainItems = useMemo(() => [
    { title: t('dashboard.sidebar.launchHit'), url: '/dashboard/launch', icon: Rocket, highlight: true, launchOnly: true },
    { title: t('dashboard.sidebar.controlPanel'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('dashboard.sidebar.registerWork'), url: '/dashboard/register', icon: Upload, hideForManager: true },
    { title: t('dashboard.sidebar.registrationHistory'), url: '/dashboard/blockchain', icon: Shield },
    { title: t('dashboard.sidebar.verifyRegistration'), url: '/dashboard/verify', icon: Search },
    { title: t('dashboard.sidebar.verifyIdentity'), url: '/dashboard/verify-identity', icon: User, kycOnly: true },
    { title: t('dashboard.sidebar.promoteWork'), url: '/dashboard/promote', icon: Megaphone },
    { title: 'AI MusicDibs Studio', url: '/ai-studio', icon: Sparkles },
    { title: t('dashboard.sidebar.artistProfiles'), url: '/dashboard/artist-profiles', icon: UserCircle, hideForManager: true },
    { title: t('dashboard.sidebar.voiceCloning'), url: '/dashboard/voice-cloning', icon: Mic, hideForManager: true },
  ], [t]);

  const accountItems = useMemo(() => [
    { title: t('dashboard.sidebar.profile'), url: '/dashboard/profile', icon: User },
    { title: t('dashboard.sidebar.plansCredits'), url: '/dashboard/credits', icon: ShoppingBag },
    { title: t('dashboard.sidebar.billing'), url: '/dashboard/billing', icon: CreditCard },
    { title: t('dashboard.sidebar.support'), url: '/dashboard/support', icon: LifeBuoy },
  ], [t]);

  const adminItems = useMemo(() => [
    { title: t('dashboard.sidebar.users'), url: '/dashboard/admin/users', icon: Users },
    { title: t('dashboard.sidebar.credits'), url: '/dashboard/admin/credits', icon: CreditCard },
    { title: t('dashboard.sidebar.works'), url: '/dashboard/admin/works', icon: Music },
    { title: t('dashboard.sidebar.metrics'), url: '/dashboard/admin/metrics', icon: BarChart3 },
    { title: t('dashboard.sidebar.system'), url: '/dashboard/admin/system', icon: Settings2 },
  ], [t]);

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
      .select('kyc_status')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setKycStatus(data?.kyc_status || 'unverified'));

    const channel = supabase
      .channel('sidebar-kyc')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        if (payload.new?.kyc_status) setKycStatus(payload.new.kyc_status);
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
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
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
                    {t('dashboard.sidebar.new')}
                  </span>
                )}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderCollapsibleGroup = (id: GroupId, label: string, items: typeof mainItems, activeClass?: string) => (
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
        {isManager && renderCollapsibleGroup('manager', t('dashboard.sidebar.manager'), managerItems)}

        {renderCollapsibleGroup('principal', t('dashboard.sidebar.principal'), filteredMainItems)}

        {renderCollapsibleGroup('cuenta', t('dashboard.sidebar.account'), accountItems)}

        {isAdmin && renderCollapsibleGroup('admin', t('dashboard.sidebar.admin'), adminItems, 'bg-pink-500/10 text-pink-400 font-medium')}
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
          {!collapsed && <span>{t('dashboard.sidebar.panelGuide')}</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => { await signOut(); navigate('/login'); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>{t('dashboard.sidebar.logout')}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}