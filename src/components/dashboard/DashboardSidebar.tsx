import { useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { NavLink } from '@/components/NavLink';
import { supabase } from '@/integrations/supabase/client';
import {
  LayoutDashboard,
  Upload,
  Search,
  Megaphone,
  ShoppingBag,
  User,
  CreditCard,
  LifeBuoy,
  Music,
  LogOut,
  Sparkles,
  Shield,
  HelpCircle,
  Users,
  BarChart3,
  Settings2,
  Rocket,
  Briefcase,
  ClipboardList,
  UserCircle,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const managerItems = [
  { title: 'Panel Manager', url: '/dashboard/manager', icon: Briefcase },
  { title: 'Mis Artistas', url: '/dashboard/manager/artists', icon: Users },
  { title: 'Registrar Obra', url: '/dashboard/manager/register', icon: Upload },
  { title: 'Obras Registradas', url: '/dashboard/manager/works', icon: ClipboardList },
];

const mainItems = [
  { title: 'Lanza tu primer hit 🚀', url: '/dashboard/launch', icon: Rocket, highlight: true, launchOnly: true },
  { title: 'Panel de control', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Registrar obra', url: '/dashboard/register', icon: Upload, hideForManager: true },
  { title: 'Historial de registros', url: '/dashboard/blockchain', icon: Shield },
  { title: 'Verificar registro', url: '/dashboard/verify', icon: Search },
  { title: 'Verificar identidad', url: '/dashboard/verify-identity', icon: User, kycOnly: true },
  { title: 'Promocionar obra', url: '/dashboard/promote', icon: Megaphone },
  { title: 'AI MusicDibs Studio', url: '/ai-studio', icon: Sparkles },
  { title: 'Mis Artistas', url: '/dashboard/artist-profiles', icon: UserCircle, hideForManager: true },
  { title: 'Clonación de Voz', url: '/dashboard/voice-cloning', icon: Mic, hideForManager: true },
];

const accountItems = [
  { title: 'Perfil', url: '/dashboard/profile', icon: User },
  { title: 'Planes y créditos', url: '/dashboard/credits', icon: ShoppingBag },
  { title: 'Facturación', url: '/dashboard/billing', icon: CreditCard },
  { title: 'Soporte', url: '/dashboard/support', icon: LifeBuoy },
];

const adminItems = [
  { title: 'Usuarios', url: '/dashboard/admin/users', icon: Users },
  { title: 'Créditos', url: '/dashboard/admin/credits', icon: CreditCard },
  { title: 'Obras', url: '/dashboard/admin/works', icon: Music },
  { title: 'Métricas', url: '/dashboard/admin/metrics', icon: BarChart3 },
  { title: 'Sistema', url: '/dashboard/admin/system', icon: Settings2 },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { user, signOut, isAdmin, isManager } = useAuth();
  const navigate = useNavigate();
  const [kycStatus, setKycStatus] = useState<string | null>(null);

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

  const renderMenuItem = (item: typeof mainItems[0]) => {
    const isHighlight = !!(item as any).highlight && !isManager;
    return (
      <SidebarMenuItem key={item.title}>
        <SidebarMenuButton asChild isActive={isActive(item.url)}>
          <NavLink
            to={item.url}
            end={item.url === '/dashboard'}
            className={`hover:bg-muted/50 ${isHighlight ? 'text-violet-500 font-bold' : ''}`}
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <item.icon className={`mr-2 h-4 w-4 ${isHighlight ? 'text-violet-500' : ''}`} />
            {!collapsed && (
              <span className="flex items-center gap-2 flex-1">
                {item.title}
                {isHighlight && !isActive(item.url) && (
                  <span className="ml-auto rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold text-violet-500 leading-none">
                    NEW
                  </span>
                )}
              </span>
            )}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

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
        {isManager && (
          <SidebarGroup>
            <SidebarGroupLabel>Manager</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {managerItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMainItems.map(renderMenuItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Cuenta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-primary/10 text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-pink-500/10 text-pink-400 font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user && (
          <p className="text-xs text-muted-foreground truncate mb-2 px-1">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('musicdibs:start-tour'));
          }}
        >
          <HelpCircle className="h-4 w-4 mr-2" />
          {!collapsed && <span>Guía del panel</span>}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={async () => { await signOut(); navigate('/login'); }}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && <span>Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
