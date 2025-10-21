import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, RefreshCcw } from 'lucide-react';

interface RoutePermission {
  id: string;
  route: string;
  label: string;
  role: string;
}

interface RouteGroup {
  route: string;
  label: string;
  roles: string[];
}

export default function GerenciamentoRoles() {
  const [routePermissions, setRoutePermissions] = useState<RouteGroup[]>([]);
  const [selectedRoute, setSelectedRoute] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const availableRoles = [
    { value: 'admin', label: 'Admin', description: 'Acesso completo ao sistema de gestão' },
    { value: 'moderator', label: 'Moderador', description: 'Pode gerenciar usuários' },
    { value: 'user', label: 'Usuário', description: 'Acesso ao ponto eletrônico' },
    { value: 'dev', label: 'Desenvolvedor', description: 'Acesso total incluindo gerenciamento de roles e empresas' },
    { value: 'inputer', label: 'Digitador', description: 'Pode inserir registros de ponto no sistema simples' }
  ];

  const allRoutes = [
    { route: '/dashboard', label: 'Dashboard' },
    { route: '/ponto-eletronico', label: 'Ponto Eletrônico' },
    { route: '/controle-ponto-simples', label: 'Controle de Ponto (Simples)' },
    { route: '/relatorios', label: 'Relatórios' },
    { route: '/funcionarios', label: 'Funcionários' },
    { route: '/empresas', label: 'Empresas' },
    { route: '/importar', label: 'Importar Dados' },
    { route: '/gerenciamento-roles', label: 'Gerenciamento de Roles' },
    { route: '/settings', label: 'Configurações' },
    { route: '/qrcode', label: 'QR Code' },
    { route: '/users', label: 'Usuários' },
    { route: '/work-locations', label: 'Locais de Trabalho' },
  ];

  useEffect(() => {
    fetchRoutePermissions();
  }, []);

  const fetchRoutePermissions = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('route_permissions' as any)
        .select('*')
        .order('route', { ascending: true });

      if (error) throw error;

      // Agrupar por rota
      const grouped = allRoutes.map(routeInfo => {
        const permissions = (data || []).filter((p: any) => p.route === routeInfo.route);
        return {
          route: routeInfo.route,
          label: routeInfo.label,
          roles: permissions.map((p: any) => p.role)
        };
      });

      setRoutePermissions(grouped);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as permissões.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoleToRoute = async () => {
    if (!selectedRoute || !selectedRole) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione uma rota e um role.',
      });
      return;
    }

    // Verificar se já existe
    const routeData = routePermissions.find(r => r.route === selectedRoute);
    if (routeData?.roles.includes(selectedRole)) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Este role já tem acesso a esta rota.',
      });
      return;
    }

    const routeLabel = allRoutes.find(r => r.route === selectedRoute)?.label || selectedRoute;

    const { error } = await supabase
      .from('route_permissions' as any)
      .insert([{ 
        route: selectedRoute, 
        label: routeLabel,
        role: selectedRole as any
      }]);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Permissão adicionada com sucesso!',
    });

    setIsDialogOpen(false);
    setSelectedRoute('');
    setSelectedRole('');
    fetchRoutePermissions();
  };

  const handleRemoveRoleFromRoute = async (route: string, role: string) => {
    if (!confirm(`Tem certeza que deseja remover o acesso do role "${role}" da rota "${route}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('route_permissions' as any)
      .delete()
      .eq('route', route)
      .eq('role', role as any);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Sucesso',
      description: 'Permissão removida com sucesso!',
    });

    fetchRoutePermissions();
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

  return (
    <div className="container mx-auto py-8 space-y-8">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
          {/* Seção de Permissões de Rotas */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Permissões</h2>
                <p className="text-muted-foreground">
                  Gerencie quais roles têm acesso a cada página do sistema
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchRoutePermissions}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Permissão
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Adicionar Permissão de Acesso</DialogTitle>
                      <DialogDescription>
                        Conceda acesso de um role a uma rota específica.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Rota</Label>
                        <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma rota" />
                          </SelectTrigger>
                          <SelectContent>
                            {allRoutes.map((route) => (
                              <SelectItem key={route.route} value={route.route}>
                                {route.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddRoleToRoute}>Adicionar Permissão</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Permissões por Rota</CardTitle>
                <CardDescription>
                  Clique no ícone de lixeira ao lado de cada role para remover o acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Página</TableHead>
                      <TableHead>Roles com Acesso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routePermissions.map((permission) => (
                      <TableRow key={permission.route}>
                        <TableCell className="font-medium">{permission.label}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {permission.roles.length > 0 ? (
                              permission.roles.map((role) => (
                                <Badge key={role} variant={getRoleBadgeVariant(role)}>
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground text-sm">Nenhum role tem acesso</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2 flex-wrap">
                            {permission.roles.map((role) => (
                              <Button
                                key={role}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRoleFromRoute(permission.route, role)}
                                title={`Remover acesso do role ${role}`}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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
          </section>

          {/* Descrição dos Roles */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Descrição dos Roles</CardTitle>
                <CardDescription>
                  Entenda o que cada role representa no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availableRoles.map((role) => (
                  <div key={role.value} className="flex items-start gap-3">
                    <Badge variant={getRoleBadgeVariant(role.value)} className="mt-0.5">
                      {role.label}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
