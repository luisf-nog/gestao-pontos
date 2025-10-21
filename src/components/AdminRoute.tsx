import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { hasRole, isLoading, roles } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    async function checkRouteAccess() {
      if (isLoading || roles.length === 0) {
        setIsCheckingAccess(true);
        return;
      }

      try {
        const currentPath = location.pathname;
        
        // Buscar permissões para a rota atual
        const { data: permissions, error } = await supabase
          .from('route_permissions')
          .select('role')
          .eq('route', currentPath);

        if (error) {
          console.error('Erro ao verificar permissões:', error);
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // Se não há permissões definidas para esta rota, negar acesso
        if (!permissions || permissions.length === 0) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // Verificar se o usuário tem algum dos roles necessários
        const allowedRoles = permissions.map(p => p.role as string);
        const userHasAccess = roles.some(userRole => allowedRoles.includes(userRole as string));
        
        setHasAccess(userHasAccess);
        setIsCheckingAccess(false);
      } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        setHasAccess(false);
        setIsCheckingAccess(false);
      }
    }

    checkRouteAccess();
  }, [location.pathname, isLoading, roles]);

  if (isLoading || isCheckingAccess) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
