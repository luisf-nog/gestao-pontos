import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao carregar perfil:', error);
      return;
    }

    if (data) {
      setProfileData({
        full_name: data.full_name || '',
        phone: data.phone || '',
      });
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profileData.full_name,
        phone: profileData.phone,
      })
      .eq('id', user.id);

    setIsLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar perfil',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Perfil atualizado!',
      description: 'Suas informações foram atualizadas com sucesso.',
    });
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Por favor, digite sua senha atual.',
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'As senhas não coincidem.',
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    setIsLoading(true);

    // Primeiro verificar a senha atual
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: passwordData.currentPassword,
    });

    if (signInError) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Senha atual incorreta.',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: {
          newPassword: passwordData.newPassword,
        },
      });

      setIsLoading(false);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao alterar senha',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Senha alterada!',
        description: 'Sua senha foi atualizada com sucesso.',
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      setIsLoading(false);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Ocorreu um erro ao alterar a senha.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e informações pessoais
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  defaultValue={user?.email} 
                  disabled 
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="Seu nome completo"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Celular</Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(00) 00000-0000"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Atualize sua senha de acesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual *</Label>
                <Input 
                  id="current-password" 
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha *</Label>
                <Input 
                  id="new-password" 
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <Input 
                  id="confirm-password" 
                  type="password"
                  placeholder="Confirme a nova senha"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Alterando...' : 'Alterar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}