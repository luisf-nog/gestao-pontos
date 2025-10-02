import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h1 className="text-5xl font-bold">Sistema de Ponto</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Gerencie o controle de ponto da sua equipe de forma simples e eficiente
        </p>
        <Button size="lg" onClick={() => navigate('/auth')} className="mt-4">
          Entrar no Sistema
        </Button>
      </div>
    </div>
  );
};

export default Index;
