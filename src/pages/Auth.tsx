import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Clock } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const { signIn, signUp, user, resendConfirmationEmail } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    if (!error) {
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error, needsEmailConfirmation } = await signUp(email, password, fullName);
    if (!error) {
      if (needsEmailConfirmation) {
        setShowEmailConfirmation(true);
      } else {
        navigate('/dashboard');
      }
    }
    setIsLoading(false);
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    await resendConfirmationEmail(email);
    setIsLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Animated particle background */}
      <AnimatedBackground />
      
      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/20 via-transparent to-blue-900/10 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo/Brand */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 shadow-2xl shadow-amber-500/20 mb-4">
              <Clock className="w-8 h-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-5xl font-serif font-bold text-white tracking-tight">
                Sistema de <span className="italic text-amber-400">Ponto</span>
              </h1>
            </div>
          </div>

          {/* Auth Card */}
          <Card className="border-slate-800 bg-slate-950/80 backdrop-blur-xl shadow-2xl shadow-black/50 ring-1 ring-amber-500/10">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-serif text-slate-100">
                {showEmailConfirmation ? 'Verificação' : 'Acesso'}
              </CardTitle>
              <CardDescription className="text-slate-400 font-mono text-xs">
                {showEmailConfirmation 
                  ? 'Confirme sua identidade' 
                  : 'Autentique-se para continuar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showEmailConfirmation ? (
                <div className="space-y-6 py-4 text-center">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500/10 to-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
                    <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-serif font-semibold text-slate-100">Confirme seu email</h3>
                    <p className="text-slate-400 text-sm font-mono">
                      Link enviado para <strong className="text-slate-300">{email}</strong>
                    </p>
                    <p className="text-xs text-slate-500">
                      Verifique sua caixa de entrada e pasta de spam
                    </p>
                  </div>
                  <div className="pt-4 space-y-2">
                    <Button 
                      onClick={handleResendEmail} 
                      variant="outline" 
                      className="w-full border-amber-700/50 bg-slate-900/50 text-amber-400 hover:bg-amber-950/50 hover:text-amber-300 hover:border-amber-600/50 font-mono text-xs"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Reenviando...' : 'Reenviar E-mail'}
                    </Button>
                    <Button 
                      onClick={() => setShowEmailConfirmation(false)} 
                      variant="ghost" 
                      className="w-full text-slate-500 hover:text-slate-300 hover:bg-slate-900/50 font-mono text-xs"
                    >
                      Voltar ao Login
                    </Button>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-900/50 border border-slate-800">
                    <TabsTrigger 
                      value="login" 
                      className="font-mono text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/10 data-[state=active]:text-amber-400 data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
                    >
                      Entrar
                    </TabsTrigger>
                    <TabsTrigger 
                      value="signup"
                      className="font-mono text-xs data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/10 data-[state=active]:to-amber-600/10 data-[state=active]:text-amber-400 data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
                    >
                      Cadastrar
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="mt-6">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email-login" className="text-slate-300 font-mono text-xs">E-MAIL</Label>
                        <Input
                          id="email-login"
                          type="email"
                          placeholder="usuario@dominio.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-login" className="text-slate-300 font-mono text-xs">SENHA</Label>
                        <Input
                          id="password-login"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 font-mono text-sm"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 font-mono text-xs tracking-wider mt-6 h-11 shadow-lg shadow-amber-500/25" 
                        disabled={isLoading}
                      >
                        {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="mt-6">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-slate-300 font-mono text-xs">NOME COMPLETO</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="João Silva"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email-signup" className="text-slate-300 font-mono text-xs">E-MAIL</Label>
                        <Input
                          id="email-signup"
                          type="email"
                          placeholder="usuario@dominio.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 font-mono text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password-signup" className="text-slate-300 font-mono text-xs">SENHA</Label>
                        <Input
                          id="password-signup"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                          className="bg-slate-900/50 border-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-600 font-mono text-sm"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 font-mono text-xs tracking-wider mt-6 h-11 shadow-lg shadow-amber-500/25" 
                        disabled={isLoading}
                      >
                        {isLoading ? 'Criando conta...' : 'Criar Conta'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-slate-600 font-mono text-xs tracking-wider">
            © 2025 — Portal de Acesso Seguro
          </p>
        </div>
      </div>
    </div>
  );
}
