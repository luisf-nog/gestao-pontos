import { memo, useMemo } from 'react';
import { Home, Users, Clock, Building2, BarChart3, Upload, LogOut, Settings, Shield } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: Home, adminOnly: true },
  { title: 'Controle de Ponto', url: '/ponto', icon: Clock, adminOnly: true },
  { title: 'Controle de Ponto', url: '/controle-ponto-simples', icon: Clock, inputerAccess: true },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3, adminOnly: true },
  { title: 'Funcionários', url: '/funcionarios', icon: Users, adminOnly: true },
  { title: 'Empresas', url: '/empresas', icon: Building2, adminOnly: true },
  { title: 'Importar Dados', url: '/importar', icon: Upload, devOnly: true },
  { title: 'Gerenciamento de Roles', url: '/gerenciamento-roles', icon: Shield, devOnly: true },
];

export const AppSidebar = memo(() => {
  const { open } = useSidebar();
  const { user, hasRole, signOut } = useAuth();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-muted text-foreground font-semibold border-l-2 border-foreground/20' 
      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground';

  // Memoize user initials to avoid recalculation
  const userInitials = useMemo(() => 
    user?.email?.substring(0, 2).toUpperCase() || 'U',
    [user?.email]
  );

  // Memoize filtered menu items
  const visibleMenuItems = useMemo(() => 
    menuItems.filter((item) => {
      if (item.devOnly && !hasRole('dev')) return false;
      if (item.inputerAccess && !hasRole('admin') && !hasRole('dev') && !hasRole('inputer')) return false;
      if (item.adminOnly && !hasRole('admin') && !hasRole('dev')) return false;
      return true;
    }),
    [hasRole]
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleMenuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full hover:bg-accent rounded-md p-2 transition-colors min-h-[44px]">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              {open && (
                <div className="flex-1 min-w-0 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
