import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Pencil, Trash2, Download, RefreshCw } from 'lucide-react';
import { calculateWorkedHours, calculateDailyAndOvertimeValues } from '@/utils/timeCalculations';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  company_id: string;
  companies: {
    name: string;
    daily_rate: number;
    overtime_rate: number;
  };
}

interface TimeRecord {
  id: string;
  employee_id: string;
  date: string;
  entry_time: string;
  exit_time: string;
  worked_hours: number;
  daily_value: number;
  overtime_value: number;
  total_value: number;
  employees: {
    name: string;
    companies: {
      name: string;
    };
  };
}

export default function Ponto() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timeRecords, setTimeRecords] = useState<TimeRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<TimeRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TimeRecord | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    employee_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    entry_time: '08:00',
    exit_time: '17:00',
  });

  useEffect(() => {
    fetchEmployees();
    fetchTimeRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [timeRecords, searchTerm, selectedEmployee, startDate, endDate]);

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
      .select('*, companies(name, daily_rate, overtime_rate)')
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
      .select('*, employees(name, companies(name, daily_rate, overtime_rate))')
      .order('date', { ascending: false })
      .order('entry_time', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar registros',
        description: error.message,
      });
      console.error('Erro ao buscar registros:', error);
      return;
    }

    // Calcular valores dinamicamente com base nos valores atuais da empresa
    const recordsWithCalculatedValues = (data || []).map((record: any) => {
      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);
      
      const { dailyValue, overtimeValue, totalValue } = calculateDailyAndOvertimeValues(
        record.worked_hours,
        recordDate,
        record.employees.companies.daily_rate,
        record.employees.companies.overtime_rate
      );

      return {
        ...record,
        daily_value: dailyValue,
        overtime_value: overtimeValue,
        total_value: totalValue,
      };
    });

    console.log('Registros carregados:', recordsWithCalculatedValues.length);
    setTimeRecords(recordsWithCalculatedValues);
  };

  const filterRecords = () => {
    let filtered = [...timeRecords];

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.employees.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedEmployee) {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const employee = employees.find(emp => emp.id === formData.employee_id);
    if (!employee) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione um funcionário',
      });
      return;
    }

    const workedHours = calculateWorkedHours(formData.entry_time, formData.exit_time);

    // Valores serão calculados dinamicamente ao exibir
    const recordData = {
      employee_id: formData.employee_id,
      date: formData.date,
      entry_time: formData.entry_time,
      exit_time: formData.exit_time,
      worked_hours: workedHours,
      daily_value: null,
      overtime_value: null,
      total_value: null,
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
        description: `Horas trabalhadas: ${workedHours.toFixed(2)}h`,
      });
    }

    setIsDialogOpen(false);
    setEditingRecord(null);
    resetForm();
    fetchTimeRecords();
  };

  const handleEdit = (record: TimeRecord) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id,
      date: record.date,
      entry_time: record.entry_time,
      exit_time: record.exit_time,
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
      exit_time: '17:00',
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    resetForm();
  };

  const exportToCSV = () => {
    if (timeRecords.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'Não há registros de ponto para exportar.',
      });
      return;
    }

    const headers = ['Funcionario', 'Empresa', 'Data', 'Entrada', 'Saida', 'Horas', 'Diaria', 'Extra', 'Total'];
    const rows = timeRecords.map(record => [
      record.employees.name,
      record.employees.companies.name,
      format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
      record.entry_time,
      record.exit_time,
      record.worked_hours.toFixed(2).replace('.', ','),
      record.daily_value.toFixed(2).replace('.', ','),
      record.overtime_value.toFixed(2).replace('.', ','),
      record.total_value.toFixed(2).replace('.', ','),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `registros-ponto-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Registros exportados!',
      description: 'O arquivo CSV foi baixado com sucesso.',
    });
  };

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
          <Button variant="outline" onClick={exportToCSV} disabled={timeRecords.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Registro
              </Button>
            </DialogTrigger>
            <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro de Ponto'}</DialogTitle>
              <DialogDescription>
                Preencha os dados do registro de ponto
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Funcionário</Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um funcionário" />
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
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entry_time">Entrada</Label>
                    <Input
                      id="entry_time"
                      type="time"
                      value={formData.entry_time}
                      onChange={(e) => setFormData({ ...formData, entry_time: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exit_time">Saída</Label>
                    <Input
                      id="exit_time"
                      type="time"
                      value={formData.exit_time}
                      onChange={(e) => setFormData({ ...formData, exit_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Atualizar' : 'Registrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>Filtre os registros por funcionário ou período</CardDescription>
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
            <Button variant="outline" size="sm" onClick={() => { setStartDate(''); setEndDate(''); }}>
              Limpar Filtros
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar por nome</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome do funcionário"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Funcionário</Label>
              <Select value={selectedEmployee || undefined} onValueChange={(value) => setSelectedEmployee(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os funcionários" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
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
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Diária</TableHead>
                <TableHead>Extra</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">
                      <div>{record.employees.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {record.employees.companies.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{record.entry_time}</TableCell>
                    <TableCell>{record.exit_time}</TableCell>
                    <TableCell>{record.worked_hours.toFixed(2)}h</TableCell>
                    <TableCell className="text-green-600">
                      R$ {record.daily_value.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-blue-600">
                      R$ {record.overtime_value.toFixed(2)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      R$ {record.total_value.toFixed(2)}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}