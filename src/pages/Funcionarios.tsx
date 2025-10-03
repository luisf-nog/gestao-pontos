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
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, Upload, X } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

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
  photo_url: string | null;
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
  const { toast } = useToast();
  const { hasRole } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company_id: '',
  });

  // Gerar email automaticamente baseado no nome e empresa
  useEffect(() => {
    if (formData.name && formData.company_id && !editingEmployee) {
      const company = companies.find(c => c.id === formData.company_id);
      if (company) {
        // Normalizar nome: remover acentos, converter para minúsculas
        const normalizedName = formData.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '.');
        
        // Normalizar nome da empresa
        const normalizedCompany = company.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');
        
        const generatedEmail = `${normalizedName}@${normalizedCompany}.com.br`;
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

      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          email: formData.email,
          company_id: formData.company_id,
          photo_url: photoUrl,
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
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      company_id: employee.company_id,
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
      company_id: '',
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
                      disabled={!editingEmployee}
                    />
                    <p className="text-xs text-muted-foreground">
                      {editingEmployee 
                        ? 'Não será criado novo usuário ao editar' 
                        : 'Email gerado automaticamente baseado no nome e empresa. Senha padrão: 123'}
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

      <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border-blue-100 dark:border-blue-900/30">
        <CardHeader>
          <CardTitle className="text-blue-800 dark:text-blue-200">Lista de Funcionários</CardTitle>
          <CardDescription className="text-blue-600 dark:text-blue-300">
            {employees.length} funcionário(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
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
                  <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground">
                    Nenhum funcionário cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
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