import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, UserCog, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type UserRole = 'admin' | 'moderator' | 'user' | 'dev' | 'inputer';

interface UserWithRoles {
  user_id: string;
  email: string;
  roles: UserRole[];
}

interface UserRoleEntry {
  id: string;
  user_id: string;
  role: UserRole;
}

const availableRoles: { value: UserRole; label: string; description: string }[] = [
  { value: 'dev', label: 'Desenvolvedor', description: 'Acesso total ao sistema, incluindo importação e gerenciamento de roles' },
  { value: 'admin', label: 'Administrador', description: 'Acesso completo a todas as funcionalidades administrativas' },
  { value: 'moderator', label: 'Moderador', description: 'Acesso limitado a algumas funcionalidades administrativas' },
  { value: 'inputer', label: 'Inputador', description: 'Acesso apenas ao controle de ponto simples' },
  { value: 'user', label: 'Usuário', description: 'Acesso básico ao sistema' },
];

const routePermissions = [
  { route: '/dashboard', label: 'Dashboard', roles: ['admin', 'dev'] },
  { route: '/ponto', label: 'Controle de Ponto (Completo)', roles: ['admin', 'dev'] },
  { route: '/controle-ponto-simples', label: 'Controle de Ponto (Simples)', roles: ['inputer', 'dev'] },
  { route: '/relatorios', label: 'Relatórios', roles: ['admin', 'dev'] },
  { route: '/funcionarios', label: 'Funcionários', roles: ['admin', 'dev'] },
  { route: '/empresas', label: 'Empresas', roles: ['dev'] },
  { route: '/importar', label: 'Importar Dados', roles: ['dev'] },
  { route: '/gerenciamento-roles', label: 'Gerenciamento de Roles', roles: ['dev'] },
  { route: '/settings', label: 'Configurações', roles: ['admin', 'dev', 'inputer', 'user', 'moderator'] },
];

export default function GerenciamentoRoles() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsersWithRoles();
  }, []);

  const fetchUsersWithRoles = async () => {
    setLoading(true);
    try {
      // Buscar todos os perfis de usuários
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name');

      if (profilesError) throw profilesError;

      // Buscar roles de todos os usuários
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      // Buscar emails dos usuários (usando tabela profiles que já tem relação com auth)
      const authUsers: any[] = [];

      // Buscar emails do auth.users usando a API Supabase
      const { data: authData } = await supabase.auth.getUser();
      
      // Combinar dados
      const usersWithRoles: UserWithRoles[] = [];
      
      for (const profile of profiles || []) {
        // Buscar email do usuário através de query RPC ou deixar como ID
        const roles = userRoles?.filter(ur => ur.user_id === profile.id).map(ur => ur.role as UserRole) || [];
        
        usersWithRoles.push({
          user_id: profile.id,
          email: profile.full_name || profile.id,
          roles,
        });
      }

      setUsers(usersWithRoles);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar usuários',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um usuário e um role',
      });
      return;
    }

    const user = users.find(u => u.user_id === selectedUser);
    if (user?.roles.includes(selectedRole)) {
      toast({
        variant: 'destructive',
        title: 'Role já existe',
        description: 'Este usuário já possui este role',
      });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert([{ user_id: selectedUser, role: selectedRole as any }]);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar role',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Role adicionado',
      description: 'O role foi adicionado com sucesso',
    });

    setIsDialogOpen(false);
    setSelectedUser('');
    setSelectedRole('user');
    fetchUsersWithRoles();
  };

  const handleRemoveRole = async (userId: string, role: UserRole) => {
    if (!confirm(`Tem certeza que deseja remover o role "${role}" deste usuário?`)) {
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role as any);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover role',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Role removido',
      description: 'O role foi removido com sucesso',
    });

    fetchUsersWithRoles();
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'dev':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'moderator':
        return 'secondary';
      case 'inputer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Roles</h1>
          <p className="text-muted-foreground">
            Configure permissões e roles dos usuários do sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsersWithRoles}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Role ao Usuário</DialogTitle>
                <DialogDescription>
                  Selecione o usuário e o role que deseja adicionar
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="user-select">Usuário</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id}>
                          {user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole)}>
                    <SelectTrigger id="role-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex flex-col">
                            <span className="font-medium">{role.label}</span>
                            <span className="text-xs text-muted-foreground">{role.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddRole}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Usuários e Roles
          </CardTitle>
          <CardDescription>
            {users.length} usuário(s) cadastrado(s) no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length === 0 ? (
                        <span className="text-muted-foreground text-sm">Nenhum role atribuído</span>
                      ) : (
                        user.roles.map((role) => (
                          <Badge key={role} variant={getRoleBadgeVariant(role)}>
                            {availableRoles.find(r => r.value === role)?.label || role}
                          </Badge>
                        ))
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {user.roles.map((role) => (
                        <Button
                          key={role}
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRole(user.user_id, role)}
                          title={`Remover role ${role}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permissões por Rota
          </CardTitle>
          <CardDescription>
            Visualize quais roles têm acesso a cada página do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Página</TableHead>
                <TableHead>Roles com Acesso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {routePermissions.map((route) => (
                <TableRow key={route.route}>
                  <TableCell className="font-medium">{route.label}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {route.roles.map((role) => (
                        <Badge key={role} variant={getRoleBadgeVariant(role as UserRole)}>
                          {availableRoles.find(r => r.value === role)?.label || role}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descrição dos Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {availableRoles.map((role) => (
              <div key={role.value} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge variant={getRoleBadgeVariant(role.value)} className="mt-1">
                  {role.label}
                </Badge>
                <p className="text-sm text-muted-foreground">{role.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
