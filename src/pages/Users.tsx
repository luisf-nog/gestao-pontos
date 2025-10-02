import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface UserWithRoles {
  id: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function Users() {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasRole('admin')) {
      navigate('/dashboard');
      return;
    }

    const fetchUsers = async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, created_at');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setIsLoading(false);
        return;
      }

      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('Error fetching users:', authError);
        setIsLoading(false);
        return;
      }

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      const usersWithRoles: UserWithRoles[] = authUsers.map(user => ({
        id: user.id,
        email: user.email || '',
        created_at: user.created_at,
        roles: userRoles?.filter(r => r.user_id === user.id).map(r => r.role) || [],
      }));

      setUsers(usersWithRoles);
      setIsLoading(false);
    };

    fetchUsers();
  }, [hasRole, navigate]);

  if (!hasRole('admin')) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todos os usuários do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários Cadastrados</CardTitle>
          <CardDescription>
            Lista de todos os usuários e suas permissões
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Perfis</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {user.roles.map((role) => (
                          <Badge key={role} variant={role === 'admin' ? 'default' : 'secondary'}>
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
