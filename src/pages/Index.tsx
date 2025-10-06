import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import { AnimatedBackground } from '@/components/AnimatedBackground';

const Index = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard');
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Animated particle background */}
      <AnimatedBackground />
      
      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-2xl animate-fade-in">
          {/* Logo/Brand */}
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center shadow-2xl shadow-blue-500/10">
              <Clock className="h-10 w-10 text-slate-300" />
            </div>
          </div>
          
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-white tracking-tight">
              Sistema de <span className="italic text-slate-300">Ponto</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-xl mx-auto font-light leading-relaxed">
              Gerencie o controle de ponto da sua equipe de forma simples e eficiente
            </p>
          </div>
          
          {/* CTA Button */}
          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate('/auth')} 
              className="bg-slate-100 text-slate-900 hover:bg-white font-mono text-xs tracking-wider h-12 px-8"
            >
              Entrar no Sistema
            </Button>
          </div>

          {/* Footer */}
          <p className="text-slate-600 font-mono text-xs tracking-wider pt-8">
            © 2025 — Portal de Acesso Seguro
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
