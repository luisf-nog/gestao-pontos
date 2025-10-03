import { Home, Users, Clock, Building2, BarChart3, Upload, LogOut, Fingerprint, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
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
  { title: 'Dashboard', url: '/dashboard', icon: Home },
  { title: 'Ponto Eletrônico', url: '/ponto-eletronico', icon: Fingerprint },
  { title: 'Controle de Ponto', url: '/ponto', icon: Clock, adminOnly: true },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3, adminOnly: true },
  { title: 'Funcionários', url: '/funcionarios', icon: Users, adminOnly: true },
  { title: 'Empresas', url: '/empresas', icon: Building2, adminOnly: true },
  { title: 'Importar Dados', url: '/importar', icon: Upload, devOnly: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, hasRole, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? 'bg-blue-100 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-300' 
      : 'text-foreground hover:bg-accent hover:text-accent-foreground';

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'U';

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                // Importar Dados: apenas dev
                if (item.devOnly && !hasRole('dev')) return null;
                
                // Outras páginas admin: admin ou dev
                if (item.adminOnly && !hasRole('admin') && !hasRole('dev')) return null;
                
                // Users comuns veem apenas Ponto Eletrônico
                const isRegularUser = !hasRole('admin') && !hasRole('dev') && !hasRole('moderator');
                if (isRegularUser && item.url !== '/ponto-eletronico') return null;
                
                // Admin e dev NÃO veem Ponto Eletrônico
                const isAdminOrDev = hasRole('admin') || hasRole('dev');
                if (isAdminOrDev && item.url === '/ponto-eletronico') return null;
                
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full hover:bg-accent rounded-md p-2 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="cursor-pointer">
              {theme === 'dark' ? (
                <>
                  <Sun className="mr-2 h-4 w-4" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="mr-2 h-4 w-4" />
                  Modo Escuro
                </>
              )}
            </DropdownMenuItem>
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
}
