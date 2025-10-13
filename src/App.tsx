import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AdminRoute } from "@/components/AdminRoute";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Ponto from "./pages/Ponto";
import PontoEletronico from "./pages/PontoEletronico";
import Funcionarios from "./pages/Funcionarios";
import Empresas from "./pages/Empresas";
import Relatorios from "./pages/Relatorios";
import ImportarDados from "./pages/ImportarDados";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, hasRole } = useAuth();
  const { theme, setTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Redirecionar users comuns para ponto eletrônico se tentarem acessar outras páginas
  const isRegularUser = !hasRole('admin') && !hasRole('dev') && !hasRole('moderator');
  if (isRegularUser && window.location.pathname !== '/ponto-eletronico' && window.location.pathname !== '/settings') {
    return <Navigate to="/ponto-eletronico" replace />;
  }
  
  // Redirecionar admin/dev que tentarem acessar ponto eletrônico
  const isAdminOrDev = hasRole('admin') || hasRole('dev');
  if (isAdminOrDev && window.location.pathname === '/ponto-eletronico') {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="relative min-h-screen flex w-full overflow-hidden">
        {/* Animated background for all pages */}
        <AnimatedBackground />
        
        <AppSidebar />
        <div className="relative z-10 flex-1 flex flex-col">
          <header className="h-14 border-b border-border/40 backdrop-blur-xl bg-background/80 flex items-center justify-between px-4">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<ProtectedLayout><AdminRoute><Dashboard /></AdminRoute></ProtectedLayout>} />
              <Route path="/ponto" element={<ProtectedLayout><AdminRoute><Ponto /></AdminRoute></ProtectedLayout>} />
              <Route path="/ponto-eletronico" element={<ProtectedLayout><PontoEletronico /></ProtectedLayout>} />
              <Route path="/relatorios" element={<ProtectedLayout><AdminRoute><Relatorios /></AdminRoute></ProtectedLayout>} />
              <Route path="/funcionarios" element={<ProtectedLayout><AdminRoute><Funcionarios /></AdminRoute></ProtectedLayout>} />
              <Route path="/empresas" element={<ProtectedLayout><AdminRoute><Empresas /></AdminRoute></ProtectedLayout>} />
              <Route path="/importar" element={<ProtectedLayout><AdminRoute><ImportarDados /></AdminRoute></ProtectedLayout>} />
              <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
