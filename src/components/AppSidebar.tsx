import { Home, Users, Clock, Building2, BarChart3, Upload, LogOut } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Controle de Ponto', url: '/ponto', icon: Clock },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
  { title: 'Funcionários', url: '/funcionarios', icon: Users, adminOnly: true },
  { title: 'Empresas', url: '/empresas', icon: Building2, adminOnly: true },
  { title: 'Importar Dados', url: '/importar', icon: Upload, adminOnly: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, hasRole, signOut } = useAuth();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-primary/10 text-primary font-bold border-l-4 border-primary' 
      : 'hover:bg-muted border-l-4 border-transparent';

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                if (item.adminOnly && !hasRole('admin') && !hasRole('dev')) return null;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className={getNavCls}>
                        <item.icon />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
          </div>
        </div>
        <SidebarMenuButton onClick={signOut} className="mt-2">
          <LogOut />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
