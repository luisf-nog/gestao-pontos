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
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Upload, X, Search } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { generateEmployeeEmail } from '@/utils/emailGenerator';

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
  email: string | null;
  personal_email: string | null;
  company_id: string;
  user_id: string | null;
  photo_url: string | null;
  birth_date: string | null;
  phone: string | null;
  notes: string | null;
  is_active: boolean;
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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    personal_email: '',
    company_id: '',
    birth_date: '',
    phone: '',
    notes: '',
    is_active: true,
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

    console.log('Funcionários carregados:', data);
    setEmployees(data || []);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Arquivo muito grande',
          description: 'A foto deve ter no máximo 5MB.',
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (employeeId: string): Promise<string | null> => {
    if (!photoFile) return null;

    setIsUploading(true);
    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${employeeId}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Deletar foto antiga se existir
      const { error: deleteError } = await supabase.storage
        .from('employee-photos')
        .remove([filePath]);

      // Upload da nova foto
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao fazer upload da foto',
        description: error.message,
      });
      return null;
    } finally {
      setIsUploading(false);
    }
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
      // Upload da foto se houver
      let photoUrl = editingEmployee.photo_url;
      if (photoFile) {
        const uploadedUrl = await uploadPhoto(editingEmployee.id);
        if (uploadedUrl) photoUrl = uploadedUrl;
      }

      console.log('Atualizando funcionário com is_active:', formData.is_active);
      
      const updateData = {
        name: formData.name,
        email: formData.email,
        personal_email: formData.personal_email || null,
        company_id: formData.company_id,
        photo_url: photoUrl,
        birth_date: formData.birth_date || null,
        phone: formData.phone || null,
        notes: formData.notes || null,
        is_active: formData.is_active,
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
          personal_email: formData.personal_email || null,
          company_id: formData.company_id,
          birth_date: formData.birth_date || null,
          phone: formData.phone || null,
          notes: formData.notes || null,
          is_active: formData.is_active,
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

      // Upload da foto se houver
      if (photoFile && newEmployee) {
        const uploadedUrl = await uploadPhoto(newEmployee.id);
        if (uploadedUrl) {
          await supabase
            .from('employees')
            .update({ photo_url: uploadedUrl })
            .eq('id', newEmployee.id);
        }
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

  const handleEdit = (employee: Employee) => {
    console.log('Editando funcionário:', employee);
    console.log('is_active do funcionário:', employee.is_active);
    
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      personal_email: employee.personal_email || '',
      company_id: employee.company_id,
      birth_date: employee.birth_date || '',
      phone: employee.phone || '',
      notes: employee.notes || '',
      is_active: employee.is_active,
    });
    setPhotoPreview(employee.photo_url);
    setPhotoFile(null);
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
      personal_email: '',
      company_id: '',
      birth_date: '',
      phone: '',
      notes: '',
      is_active: true,
    });
    setNameCheckStatus('idle');
    setDuplicateEmployees([]);
    setPhotoFile(null);
    setPhotoPreview(null);
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
                    <Label>Foto</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20">
                        {photoPreview ? (
                          <AvatarImage src={photoPreview} alt="Preview" />
                        ) : (
                          <AvatarFallback className="text-2xl">
                            {formData.name ? formData.name.substring(0, 2).toUpperCase() : '?'}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById('photo-upload')?.click()}
                          disabled={isUploading}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {photoPreview ? 'Alterar' : 'Adicionar'} Foto
                        </Button>
                        {photoPreview && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPhotoFile(null);
                              setPhotoPreview(null);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoChange}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Formatos aceitos: JPG, PNG. Tamanho máximo: 5MB
                    </p>
                  </div>

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
                      disabled={!!editingEmployee && !isDev}
                      className={editingEmployee && !isDev ? "cursor-not-allowed opacity-70" : ""}
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
                    {editingEmployee ? (
                      <p className="text-xs text-muted-foreground">
                        O e-mail não pode ser alterado após o cadastro
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Email gerado automaticamente baseado no nome e empresa. Senha padrão: 123
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => {
                          console.log('Switch alterado para:', checked);
                          setFormData({ ...formData, is_active: checked });
                          console.log('FormData atualizado, is_active agora é:', checked);
                        }}
                      />
                      <span>Funcionário Ativo</span>
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Desative para bloquear o acesso do funcionário ao sistema de ponto
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="personal_email">Email Pessoal (opcional)</Label>
                    <Input
                      id="personal_email"
                      type="email"
                      placeholder="email.pessoal@exemplo.com"
                      value={formData.personal_email}
                      onChange={(e) => setFormData({ ...formData, personal_email: e.target.value })}
                      maxLength={255}
                    />
                    <p className="text-xs text-muted-foreground">
                      Email pessoal do funcionário para contato
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
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Idade</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email Corporativo</TableHead>
                <TableHead>Email Pessoal</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Acesso Ponto</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 9 : 8} className="text-center text-muted-foreground">
                    {searchTerm ? 'Nenhum funcionário encontrado com esse nome' : 'Nenhum funcionário cadastrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        {employee.photo_url ? (
                          <AvatarImage src={employee.photo_url} alt={employee.name} />
                        ) : (
                          <AvatarFallback>
                            {employee.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{employee.name}</div>
                      {employee.notes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {employee.notes}
                        </div>
                      )}
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
                    <TableCell>{employee.email || '-'}</TableCell>
                    <TableCell>{employee.personal_email || '-'}</TableCell>
                    <TableCell>{employee.companies.name}</TableCell>
                    <TableCell>
                      <Badge variant={employee.user_id && employee.is_active ? 'default' : 'secondary'}>
                        {employee.user_id && employee.is_active ? 'Ativo' : 'Inativo'}
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