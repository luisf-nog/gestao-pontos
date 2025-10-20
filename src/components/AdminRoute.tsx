import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

interface AdminRouteProps {
  children: ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // Verificar se é a rota específica que requer acesso dev
  const requiresDevAccess = window.location.pathname === '/empresas' || window.location.pathname === '/gerenciamento-roles';
  
  if (requiresDevAccess && !hasRole('dev')) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas desenvolvedores podem visualizar este conteúdo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasRole('admin') && !hasRole('dev') && !hasRole('moderator')) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você não tem permissão para acessar esta página. Apenas administradores podem visualizar este conteúdo.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
