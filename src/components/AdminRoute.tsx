import { ReactNode, useEffect, useState, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

export const AdminRoute = memo(({ children }: AdminRouteProps) => {
  const { roles, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (authLoading) return;
      
      setIsCheckingAccess(true);
      
      try {
        // Buscar permissões para a rota atual
        const { data: permissions, error } = await supabase
          .from('route_permissions')
          .select('role')
          .eq('route', location.pathname);

        if (error) throw error;

        // Se não houver permissões configuradas para esta rota, negar acesso
        if (!permissions || permissions.length === 0) {
          setHasAccess(false);
          setIsCheckingAccess(false);
          return;
        }

        // Verificar se o usuário tem pelo menos um dos roles necessários
        const allowedRoles = permissions.map(p => p.role);
        const userHasAccess = roles.some(userRole => 
          allowedRoles.includes(userRole as any)
        );
        
        setHasAccess(userHasAccess);
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [location.pathname, roles, authLoading]);

  if (authLoading || isCheckingAccess) {
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
});
