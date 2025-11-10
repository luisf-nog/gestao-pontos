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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { generateEmployeeEmail } from '@/utils/emailGenerator';

interface Company {
  id: string;
  name: string;
}

interface JobPosition {
  id: string;
  name: string;
  daily_rate: number;
  overtime_rate: number;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  cpf: string | null;
  company_id: string;
  position_id: string | null;
  user_id: string | null;
  birth_date: string | null;
  phone: string | null;
  notes: string | null;
  work_unit: ('Matriz' | 'Filial')[] | null;
  companies: {
    name: string;
  };
  job_positions?: {
    name: string;
    daily_rate: number;
    overtime_rate: number;
  } | null;
}

export default function Funcionarios() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [nameCheckStatus, setNameCheckStatus] = useState<'idle' | 'checking' | 'duplicate' | 'available'>('idle');
  const [duplicateEmployees, setDuplicateEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    cpf: '',
    company_id: '',
    position_id: '',
    birth_date: '',
    phone: '',
    notes: '',
    work_unit: ['Matriz'] as ('Matriz' | 'Filial')[],
  });

  // Gerar email automaticamente baseado no nome e empresa
  useEffect(() => {
    if (formData.name && formData.company_id && !editingEmployee) {
      const company = companies.find(c => c.id === formData.company_id);
      if (company) {
        const generatedEmail = generateEmployeeEmail(formData.name, company.name);
        setFormData(prev => ({ ...prev, email: generatedEmail }));
      }
    }
  }, [formData.name, formData.company_id, companies, editingEmployee]);

  // Buscar cargos quando empresa é selecionada
  useEffect(() => {
    if (formData.company_id) {
      fetchJobPositions(formData.company_id);
    } else {
      setJobPositions([]);
      setFormData(prev => ({ ...prev, position_id: '' }));
    }
  }, [formData.company_id]);

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


  const fetchJobPositions = async (companyId: string) => {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cargos',
        description: error.message,
      });
      return;
    }

    setJobPositions(data || []);
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, companies(name), job_positions(name, daily_rate, overtime_rate)')
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar funcionários',
        description: error.message,
      });
      return;
    }

    console.log('Funcionários carregados:', data);
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
      const updateData = {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf || null,
        company_id: formData.company_id,
        position_id: formData.position_id || null,
        birth_date: formData.birth_date || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
        work_unit: formData.work_unit,
      };

      console.log('Dados de atualização:', updateData);

      const { error } = await supabase
        .from('employees')
        .update(updateData)
        .eq('id', editingEmployee.id);

      console.log('Resultado da atualização - erro:', error);

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
          cpf: formData.cpf || null,
          company_id: formData.company_id,
          position_id: formData.position_id || null,
          birth_date: formData.birth_date || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          work_unit: formData.work_unit,
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

      // Criar usuário automaticamente se email foi gerado
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
              description: `Usuário criado automaticamente com email: ${formData.email} e senha padrão: 123`,
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

  const handleEdit = async (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      cpf: employee.cpf || '',
      company_id: employee.company_id,
      position_id: employee.position_id || '',
      birth_date: employee.birth_date || '',
      phone: employee.phone || '',
      notes: employee.notes || '',
      work_unit: employee.work_unit || ['Matriz'],
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
      cpf: '',
      company_id: '',
      position_id: '',
      birth_date: '',
      phone: '',
      notes: '',
      work_unit: ['Matriz'],
    });
    setNameCheckStatus('idle');
    setDuplicateEmployees([]);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingEmployee(null);
    resetForm();
  };

  const calculateAge = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const isAdmin = hasRole('admin') || hasRole('dev');
  const isDev = hasRole('dev');

  // Filtrar funcionários pela busca
  const filteredEmployees = employees.filter(employee =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Funcionários</h1>
          <p className="text-muted-foreground">
            Gerencie os funcionários cadastrados no sistema
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              handleDialogClose();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>
                  {editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados do funcionário
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto flex-1 px-1">
                  <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (somente maiúsculas)</Label>
                    <Input
                      id="name"
                      placeholder="NOME DO FUNCIONÁRIO"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={!!editingEmployee && !isDev}
                      className={editingEmployee && !isDev ? "cursor-not-allowed opacity-70" : ""}
                      style={{ textTransform: 'uppercase' }}
                    />
                    {editingEmployee && !isDev && (
                      <p className="text-xs text-muted-foreground">
                        O nome não pode ser alterado após o cadastro (apenas desenvolvedores)
                      </p>
                    )}
                    
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
                  {/* Email corporativo - oculto temporariamente
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (para acesso ao ponto eletrônico)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@empresa.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      maxLength={255}
                      disabled={!!editingEmployee}
                      className={editingEmployee ? "cursor-not-allowed opacity-70" : ""}
                    />
                  </div>
                  */}
                  <div className="space-y-2">
                    <Label htmlFor="company">Empresa *</Label>
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

                  <div className="space-y-2">
                    <Label htmlFor="position">Cargo *</Label>
                    <Select
                      value={formData.position_id}
                      onValueChange={(value) => setFormData({ ...formData, position_id: value })}
                      required
                      disabled={!formData.company_id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !formData.company_id 
                            ? "Selecione uma empresa primeiro" 
                            : jobPositions.length === 0 
                              ? "Nenhum cargo cadastrado para esta empresa"
                              : "Selecione um cargo"
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {jobPositions.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.name} (R$ {position.daily_rate.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.company_id && jobPositions.length === 0 && (
                      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-700 dark:text-amber-400">
                          Esta empresa não possui cargos cadastrados. Cadastre um cargo na página de Empresas antes de continuar.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Unidade de Trabalho *</Label>
                    <div className="flex gap-4">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.work_unit.includes('Matriz')}
                          onChange={(e) => {
                            const newWorkUnit = e.target.checked
                              ? [...formData.work_unit, 'Matriz']
                              : formData.work_unit.filter(u => u !== 'Matriz');
                            setFormData({ ...formData, work_unit: newWorkUnit as ('Matriz' | 'Filial')[] });
                          }}
                          className="h-4 w-4"
                        />
                        Matriz
                      </Label>
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.work_unit.includes('Filial')}
                          onChange={(e) => {
                            const newWorkUnit = e.target.checked
                              ? [...formData.work_unit, 'Filial']
                              : formData.work_unit.filter(u => u !== 'Filial');
                            setFormData({ ...formData, work_unit: newWorkUnit as ('Matriz' | 'Filial')[] });
                          }}
                          className="h-4 w-4"
                        />
                        Filial
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Selecione uma ou ambas as unidades onde o funcionário trabalha
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF (opcional)</Label>
                    <Input
                      id="cpf"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        let formatted = value;
                        if (value.length > 3) formatted = value.slice(0, 3) + '.' + value.slice(3);
                        if (value.length > 6) formatted = value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6);
                        if (value.length > 9) formatted = value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6, 9) + '-' + value.slice(9, 11);
                        setFormData({ ...formData, cpf: formatted });
                      }}
                      maxLength={14}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="birth_date">Data de Nascimento (opcional)</Label>
                      <Input
                        id="birth_date"
                        type="date"
                        value={formData.birth_date}
                        onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      />
                      {formData.birth_date && (
                        <p className="text-xs text-muted-foreground">
                          Idade: {calculateAge(formData.birth_date)} anos
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone (opcional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        maxLength={20}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações Adicionais (opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Informações adicionais sobre o funcionário"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      maxLength={500}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formData.notes.length}/500 caracteres
                    </p>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-4">
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
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Lista de Funcionários</CardTitle>
              <CardDescription>
                {filteredEmployees.length} de {employees.length} funcionário(s)
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Unidade</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-muted-foreground">
                    {searchTerm ? 'Nenhum funcionário encontrado com esse nome' : 'Nenhum funcionário cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">
                      <div>{employee.name}</div>
                      {employee.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {employee.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.cpf || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {employee.birth_date ? (
                        <div>
                          <div className="font-medium">{calculateAge(employee.birth_date)} anos</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(employee.birth_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{employee.phone || '-'}</TableCell>
                    <TableCell>{employee.companies.name}</TableCell>
                    <TableCell>
                      {employee.job_positions ? (
                        <div>
                          <div className="font-medium">{employee.job_positions.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Diária: R$ {employee.job_positions.daily_rate.toFixed(2)} | 
                            HE: R$ {employee.job_positions.overtime_rate.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem cargo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {employee.work_unit && employee.work_unit.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {employee.work_unit.map(unit => (
                            <Badge key={unit} variant="outline">{unit}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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
                          {hasRole('dev') && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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