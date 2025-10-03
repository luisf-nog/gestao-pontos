import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  company_id: string;
  user_id: string | null;
  companies: {
    name: string;
  };
}

export default function Funcionarios() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [nameCheckStatus, setNameCheckStatus] = useState<'idle' | 'checking' | 'duplicate' | 'available'>('idle');
  const [duplicateEmployees, setDuplicateEmployees] = useState<Employee[]>([]);
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_id: '',
  });

  useEffect(() => {
    fetchCompanies();
    fetchEmployees();
  }, []);

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar empresas',
        description: error.message,
      });
      return;
    }

    setCompanies(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, companies(name)')
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar funcionários',
        description: error.message,
      });
      return;
    }

    setEmployees(data || []);
  };

  const checkNameDuplicate = useCallback(async (name: string) => {
    if (!name || name.trim().length < 2) {
      setNameCheckStatus('idle');
      setDuplicateEmployees([]);
      return;
    }

    setNameCheckStatus('checking');

    const { data, error } = await supabase
      .from('employees')
      .select('id, name, companies(name)')
      .ilike('name', `%${name.trim()}%`);

    if (error) {
      setNameCheckStatus('idle');
      return;
    }

    // Filtrar o funcionário atual se estiver editando
    const filteredData = editingEmployee 
      ? data?.filter(emp => emp.id !== editingEmployee.id) 
      : data;

    if (filteredData && filteredData.length > 0) {
      setNameCheckStatus('duplicate');
      setDuplicateEmployees(filteredData as Employee[]);
    } else {
      setNameCheckStatus('available');
      setDuplicateEmployees([]);
    }
  }, [editingEmployee]);

  // Debounce para verificação de nome
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) {
        checkNameDuplicate(formData.name);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.name, checkNameDuplicate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingEmployee) {
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          email: formData.email,
          company_id: formData.company_id,
        })
        .eq('id', editingEmployee.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar funcionário',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Funcionário atualizado!',
        description: 'Os dados foram atualizados com sucesso.',
      });
    } else {
      const { data: newEmployee, error } = await supabase
        .from('employees')
        .insert([{
          name: formData.name,
          email: formData.email,
          company_id: formData.company_id,
        }])
        .select()
        .single();

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao cadastrar funcionário',
          description: error.message,
        });
        return;
      }

      // Criar usuário se email foi fornecido
      if (formData.email && newEmployee) {
        try {
          const { data, error: functionError } = await supabase.functions.invoke('create-employee-user', {
            body: {
              employeeId: newEmployee.id,
              email: formData.email,
              name: formData.name
            }
          });

          if (functionError) {
            toast({
              variant: 'destructive',
              title: 'Funcionário criado mas erro ao criar usuário',
              description: functionError.message,
            });
          } else {
            toast({
              title: 'Funcionário cadastrado!',
              description: `Usuário criado com email: ${formData.email} e senha padrão: 123`,
            });
          }
        } catch (err) {
          console.error('Erro ao criar usuário:', err);
          toast({
            variant: 'destructive',
            title: 'Funcionário criado',
            description: 'Mas houve erro ao criar acesso ao ponto eletrônico.',
          });
        }
      } else {
        toast({
          title: 'Funcionário cadastrado!',
          description: 'O novo funcionário foi adicionado com sucesso.',
        });
      }
    }

    setIsDialogOpen(false);
    setEditingEmployee(null);
    resetForm();
    fetchEmployees();
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      company_id: employee.company_id,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este funcionário?')) return;

    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir funcionário',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Funcionário excluído',
      description: 'O funcionário foi removido com sucesso.',
    });

    fetchEmployees();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      company_id: '',
    });
    setNameCheckStatus('idle');
    setDuplicateEmployees([]);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    resetForm();
  };

  const isAdmin = hasRole('admin') || hasRole('dev');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários cadastrados no sistema
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do funcionário
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      placeholder="Nome do funcionário"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    
                    {nameCheckStatus === 'checking' && (
                      <p className="text-sm text-muted-foreground">Verificando...</p>
                    )}
                    
                    {nameCheckStatus === 'available' && formData.name.length >= 2 && (
                      <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-700 dark:text-green-400">
                          Nome disponível
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    {nameCheckStatus === 'duplicate' && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400">
                          <p className="font-semibold mb-1">Funcionário(s) com nome similar:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {duplicateEmployees.map(emp => (
                              <li key={emp.id} className="text-sm">
                                {emp.name} - {emp.companies.name}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (para acesso ao ponto eletrônico)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground">
                      {editingEmployee ? 'Não será criado novo usuário ao editar' : 'Será criado um usuário com senha padrão: 123'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa</Label>
                    <Select
                      value={formData.company_id}
                      onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
          <CardDescription>
            {employees.length} funcionário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Acesso Ponto</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 5 : 4} className="text-center text-muted-foreground">
                    Nenhum funcionário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell>{employee.companies.name}</TableCell>
                    <TableCell>
                      <Badge variant={employee.user_id ? 'default' : 'secondary'}>
                        {employee.user_id ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(employee.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}