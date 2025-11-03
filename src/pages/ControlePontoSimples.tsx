import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Pencil, Trash2, Download, RefreshCw } from 'lucide-react';
import { calculateWorkedHours } from '@/utils/timeCalculations';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  company_id: string;
  companies: {
    name: string;
  };
}

interface TimeRecord {
  id: string;
  employee_id: string;
  date: string;
  entry_time: string;
  exit_time: string | null;
  lunch_exit_time: string | null;
  lunch_return_time: string | null;
  worked_hours: number | null;
  setor: string | null;
  employees: {
    name: string;
    companies: {
      name: string;
    };
  };
}

export default function ControlePontoSimples() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TimeRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 30;
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    entry_time: '08:00',
    exit_time: '',
    lunch_exit_time: '',
    lunch_return_time: '',
    setor: 'Logística',
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchEmployees(), fetchTimeRecords()]);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    filterRecords();
    setCurrentPage(1);
  }, [timeRecords, debouncedSearchTerm, selectedEmployee, startDate, endDate]);

  const setQuickFilter = (filter: 'week' | 'lastWeek' | 'fortnight' | 'lastFortnight' | 'month') => {
    const now = new Date();
    switch (filter) {
      case 'week':
        setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'lastWeek':
        const lastWeek = subWeeks(now, 1);
        setStartDate(format(startOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek(lastWeek, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        break;
      case 'fortnight':
        const dayOfMonth = now.getDate();
        if (dayOfMonth <= 15) {
          setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
          setEndDate(format(new Date(now.getFullYear(), now.getMonth(), 15), 'yyyy-MM-dd'));
        } else {
          setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 16), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        }
        break;
      case 'lastFortnight':
        const currentDay = now.getDate();
        if (currentDay <= 15) {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          setStartDate(format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 16), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        } else {
          setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
          setEndDate(format(new Date(now.getFullYear(), now.getMonth(), 15), 'yyyy-MM-dd'));
        }
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        break;
    }
  };

  const fetchEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*, companies(name)')
      .eq('is_active', true)
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

  const fetchTimeRecords = async () => {
    const { data, error } = await supabase
      .from('time_records')
      .select('id, employee_id, date, entry_time, exit_time, lunch_exit_time, lunch_return_time, worked_hours, setor, employees(name, companies(name))')
      .order('date', { ascending: false })
      .order('entry_time', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar registros',
        description: error.message,
      });
      return;
    }

    setTimeRecords(data || []);
  };

  const filterRecords = useCallback(() => {
    let filtered = [...timeRecords];

    if (debouncedSearchTerm) {
      filtered = filtered.filter(record =>
        record.employees.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      );
    }

    if (selectedEmployee && selectedEmployee !== 'all') {
      filtered = filtered.filter(record => record.employee_id === selectedEmployee);
    }

    if (startDate && endDate) {
      filtered = filtered.filter(record => record.date >= startDate && record.date <= endDate);
    } else if (startDate) {
      filtered = filtered.filter(record => record.date >= startDate);
    } else if (endDate) {
      filtered = filtered.filter(record => record.date <= endDate);
    }

    setFilteredRecords(filtered);
  }, [timeRecords, debouncedSearchTerm, selectedEmployee, startDate, endDate]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find(emp => emp.id === formData.employee_id);
    if (!employee) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Funcionário não encontrado ou inativo',
      });
      return;
    }

    const { data: employeeCheck, error: checkError } = await supabase
      .from('employees')
      .select('is_active')
      .eq('id', formData.employee_id)
      .maybeSingle();

    if (checkError || !employeeCheck || !employeeCheck.is_active) {
      toast({
        variant: 'destructive',
        title: 'Acesso negado',
        description: 'Este funcionário foi desativado e não pode mais bater ponto.',
      });
      return;
    }

    // Verificar se já existe entrada para este funcionário nesta data (apenas ao criar novo registro)
    if (!editingRecord) {
      const { data: existingEntry, error: existingError } = await supabase
        .from('time_records')
        .select('id')
        .eq('employee_id', formData.employee_id)
        .eq('date', formData.date)
        .maybeSingle();

      if (existingError) {
        toast({
          variant: 'destructive',
          title: 'Erro ao verificar registros',
          description: existingError.message,
        });
        return;
      }

      if (existingEntry) {
        toast({
          variant: 'destructive',
          title: 'Registro duplicado',
          description: 'Já existe um registro de ponto para este funcionário nesta data.',
        });
        return;
      }
    }

    const workedHours = formData.exit_time 
      ? calculateWorkedHours(
          formData.entry_time, 
          formData.exit_time,
          formData.lunch_exit_time || null,
          formData.lunch_return_time || null
        )
      : null;

    const recordData: any = {
      employee_id: formData.employee_id,
      date: formData.date,
      entry_time: formData.entry_time,
      exit_time: formData.exit_time || null,
      lunch_exit_time: formData.lunch_exit_time || null,
      lunch_return_time: formData.lunch_return_time || null,
      worked_hours: workedHours,
      setor: formData.setor || null,
    };

    if (editingRecord) {
      const { error } = await supabase
        .from('time_records')
        .update(recordData)
        .eq('id', editingRecord.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar registro',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Registro atualizado!',
        description: 'O ponto foi atualizado com sucesso.',
      });
    } else {
      const { error } = await supabase
        .from('time_records')
        .insert([recordData]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao registrar ponto',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Ponto registrado!',
        description: workedHours ? `Horas trabalhadas: ${workedHours.toFixed(2)}h` : 'Entrada registrada',
      });
    }

    setIsDialogOpen(false);
    setEditingRecord(null);
    resetForm();
    fetchTimeRecords();
  }, [formData, employees, editingRecord, toast]);

  const handleEdit = (record: TimeRecord) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      entry_time: record.entry_time,
      exit_time: record.exit_time || '',
      lunch_exit_time: record.lunch_exit_time || '',
      lunch_return_time: record.lunch_return_time || '',
      setor: record.setor || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;

    const { error } = await supabase
      .from('time_records')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir registro',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Registro excluído',
      description: 'O ponto foi removido com sucesso.',
    });

    fetchTimeRecords();
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      entry_time: '08:00',
      exit_time: '',
      lunch_exit_time: '',
      lunch_return_time: '',
      setor: 'Logística',
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    resetForm();
  };

  const exportToExcel = () => {
    if (filteredRecords.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'Não há registros para exportar.',
      });
      return;
    }

    const worksheetData = [
      ['Funcionário', 'Empresa', 'Data', 'Entrada', 'Saída Almoço', 'Retorno Almoço', 'Saída', 'Setor', 'Horas'],
      ...filteredRecords.map(record => [
        record.employees.name,
        record.employees.companies.name,
        format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        record.entry_time,
        record.lunch_exit_time || '-',
        record.lunch_return_time || '-',
        record.exit_time || 'Pendente',
        record.setor || '-',
        record.worked_hours?.toFixed(2).replace('.', ',') || '0,00',
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');

    XLSX.writeFile(workbook, `controle-ponto-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);

    toast({
      title: 'Registros exportados!',
      description: 'O arquivo Excel foi baixado com sucesso.',
    });
  };

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Registre e gerencie os horários dos funcionários
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTimeRecords}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportToExcel} disabled={filteredRecords.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro de Ponto'}</DialogTitle>
                <DialogDescription>
                  Preencha os dados do registro de ponto
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Funcionário *</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                      required
                    >
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Selecione o funcionário" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.name} - {emp.companies.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entry_time">Entrada *</Label>
                    <Input
                      id="entry_time"
                      type="time"
                      value={formData.entry_time}
                      onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lunch_exit_time">Saída Almoço</Label>
                    <Input
                      id="lunch_exit_time"
                      type="time"
                      value={formData.lunch_exit_time}
                      onChange={(e) => setFormData({ ...formData, lunch_exit_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lunch_return_time">Retorno Almoço</Label>
                    <Input
                      id="lunch_return_time"
                      type="time"
                      value={formData.lunch_return_time}
                      onChange={(e) => setFormData({ ...formData, lunch_return_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exit_time">Saída</Label>
                    <Input
                      id="exit_time"
                      type="time"
                      value={formData.exit_time}
                      onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="setor">Setor</Label>
                    <Select
                      value={formData.setor}
                      onValueChange={(value) => setFormData({ ...formData, setor: value })}
                    >
                      <SelectTrigger id="setor">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Logística">Logística</SelectItem>
                        <SelectItem value="Qualidade">Qualidade</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingRecord ? 'Atualizar' : 'Salvar'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Pesquisa</CardTitle>
          <CardDescription>
            Filtre os registros por funcionário, período ou busca
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('week')}>
              Esta Semana
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('lastWeek')}>
              Semana Passada
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('fortnight')}>
              Esta Quinzena
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('lastFortnight')}>
              Quinzena Passada
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickFilter('month')}>
              Este Mês
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar Funcionário</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome do funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-filter">Funcionário</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger id="employee-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registros de Ponto</CardTitle>
          <CardDescription>
            {filteredRecords.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída Almoço</TableHead>
                <TableHead>Retorno Almoço</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.employees.name}</TableCell>
                  <TableCell>{record.employees.companies.name}</TableCell>
                  <TableCell>
                    {format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{record.entry_time}</TableCell>
                  <TableCell>{record.lunch_exit_time || '-'}</TableCell>
                  <TableCell>{record.lunch_return_time || '-'}</TableCell>
                  <TableCell>
                    {record.exit_time ? (
                      <span>{record.exit_time}</span>
                    ) : (
                      <span className="text-muted-foreground">Pendente</span>
                    )}
                  </TableCell>
                  <TableCell>{record.setor || '-'}</TableCell>
                  <TableCell>
                    {record.worked_hours ? `${record.worked_hours.toFixed(2)}h` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(record)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(record.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
