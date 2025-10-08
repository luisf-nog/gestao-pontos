import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type UserRole = 'admin' | 'moderator' | 'user' | 'dev';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  roles: UserRole[];
  isLoading: boolean;
  hasRole: (role: UserRole) => boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any; needsEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchUserRoles = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching roles:', error);
      return [];
    }

    return data.map(r => r.role);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id).then(setRoles);
          }, 0);
        } else {
          setRoles([]);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id).then(setRoles).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Tratamento especial para email não confirmado
      if (error.message.includes('Email not confirmed')) {
        toast({
          title: 'Email não confirmado',
          description: 'Por favor, verifique sua caixa de entrada e confirme seu email antes de fazer login.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro ao fazer login',
          description: error.message,
          variant: 'destructive',
        });
      }
      return { error };
    }

    // Verificar se o funcionário está ativo
    if (data.user) {
      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('is_active')
        .eq('user_id', data.user.id)
        .maybeSingle();

      if (!employeeError && employee && !employee.is_active) {
        await supabase.auth.signOut();
        toast({
          title: 'Acesso bloqueado',
          description: 'Seu acesso ao sistema foi desativado. Entre em contato com o administrador.',
          variant: 'destructive',
        });
        return { error: { message: 'Acesso bloqueado' } };
      }
    }

    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }

    // Verifica se o usuário precisa confirmar o email
    const needsEmailConfirmation = data.user && !data.session;

    return { error, needsEmailConfirmation };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    toast({
      title: 'Logout realizado',
      description: 'Você saiu da sua conta.',
    });
  };

  const resendConfirmationEmail = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      toast({
        title: 'Erro ao reenviar email',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Email reenviado',
        description: 'Verifique sua caixa de entrada.',
      });
    }

    return { error };
  };

  const hasRole = (role: UserRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      roles, 
      isLoading,
      hasRole,
      signIn, 
      signUp, 
      signOut,
      resendConfirmationEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
