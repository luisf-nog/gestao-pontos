import { lazy, Suspense, memo } from "react";
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

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ponto = lazy(() => import("./pages/Ponto"));
const ControlePontoSimples = lazy(() => import("./pages/ControlePontoSimples"));
const PontoEletronico = lazy(() => import("./pages/PontoEletronico"));
const Funcionarios = lazy(() => import("./pages/Funcionarios"));
const Empresas = lazy(() => import("./pages/Empresas"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const ImportarDados = lazy(() => import("./pages/ImportarDados"));
const GerenciamentoRoles = lazy(() => import("./pages/GerenciamentoRoles"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Optimize QueryClient with better defaults for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - avoid unnecessary refetches
      gcTime: 1000 * 60 * 10, // 10 minutes - cache cleanup
      refetchOnWindowFocus: false, // disable automatic refetch on focus
      refetchOnReconnect: false, // disable automatic refetch on reconnect
      retry: 1, // only retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});

const ProtectedLayout = memo(({ children }: { children: React.ReactNode }) => {
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
  
  // Redirecionar inputers apenas para /controle-ponto-simples
  const isInputer = hasRole('inputer') && !hasRole('admin') && !hasRole('dev');
  if (isInputer && window.location.pathname !== '/controle-ponto-simples' && window.location.pathname !== '/settings') {
    return <Navigate to="/controle-ponto-simples" replace />;
  }
  
  // Redirecionar users comuns (exclui inputer) para ponto eletrônico se tentarem acessar outras páginas
  const isRegularUser = !hasRole('admin') && !hasRole('dev') && !hasRole('moderator') && !hasRole('inputer');
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
});

// Loading fallback component - memoized for performance
const LoadingFallback = memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p>Carregando...</p>
    </div>
  </div>
));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<ProtectedLayout><AdminRoute><Dashboard /></AdminRoute></ProtectedLayout>} />
                <Route path="/ponto" element={<ProtectedLayout><AdminRoute><Ponto /></AdminRoute></ProtectedLayout>} />
                <Route path="/controle-ponto-simples" element={<ProtectedLayout><ControlePontoSimples /></ProtectedLayout>} />
                <Route path="/ponto-eletronico" element={<ProtectedLayout><PontoEletronico /></ProtectedLayout>} />
                <Route path="/relatorios" element={<ProtectedLayout><AdminRoute><Relatorios /></AdminRoute></ProtectedLayout>} />
                <Route path="/funcionarios" element={<ProtectedLayout><AdminRoute><Funcionarios /></AdminRoute></ProtectedLayout>} />
                <Route path="/empresas" element={<ProtectedLayout><AdminRoute><Empresas /></AdminRoute></ProtectedLayout>} />
                <Route path="/importar" element={<ProtectedLayout><AdminRoute><ImportarDados /></AdminRoute></ProtectedLayout>} />
                <Route path="/gerenciamento-roles" element={<ProtectedLayout><AdminRoute><GerenciamentoRoles /></AdminRoute></ProtectedLayout>} />
                <Route path="/settings" element={<ProtectedLayout><Settings /></ProtectedLayout>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
