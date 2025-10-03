import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Calendar, DollarSign, Clock, FileText, TrendingUp, RefreshCw } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateDailyAndOvertimeValues } from '@/utils/timeCalculations';

interface Company {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  name: string;
}

interface ReportRecord {
  employee_id: string;
  employee_name: string;
  company_name: string;
  total_records: number;
  total_hours: number;
  total_daily: number;
  total_overtime: number;
  total_value: number;
}

export default function Relatorios() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportRecord[]>([]);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const { toast } = useToast();

  // Helper para fazer parse correto de data sem problema de timezone
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

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
          // Se estamos na primeira quinzena, a quinzena passada é a segunda do mês anterior
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          setStartDate(format(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 16), 'yyyy-MM-dd'));
          setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        } else {
          // Se estamos na segunda quinzena, a quinzena passada é a primeira do mês atual
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

  useEffect(() => {
    fetchCompanies();
    fetchEmployees();
  }, []);

  useEffect(() => {
    generateReport();
  }, [startDate, endDate, selectedCompany, selectedEmployee]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    setCompanies(data || []);
  };

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, name')
      .order('name');

    setEmployees(data || []);
  };

  const generateReport = async () => {
    let query = supabase
      .from('time_records')
      .select(`
        employee_id,
        date,
        worked_hours,
        employees (
          name,
          companies (
            name,
            daily_rate,
            overtime_rate
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    if (selectedEmployee) {
      query = query.eq('employee_id', selectedEmployee);
    } else if (selectedCompany) {
      const { data: companyEmployees } = await supabase
        .from('employees')
        .select('id')
        .eq('company_id', selectedCompany);

      const employeeIds = companyEmployees?.map(e => e.id) || [];
      if (employeeIds.length > 0) {
        query = query.in('employee_id', employeeIds);
      } else {
        setReportData([]);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao gerar relatório',
        description: error.message,
      });
      return;
    }

    console.log('=== Gerando Relatório ===');
    console.log('Registros encontrados:', data?.length || 0);

    // Calcular valores dinamicamente e agrupar por funcionário
    const grouped = data?.reduce((acc: any, record: any) => {
      const empId = record.employee_id;
      
      // Parse da data corretamente
      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);
      
      // Calcular valores dinamicamente com base nos valores atuais da empresa
      const { dailyValue, overtimeValue, totalValue } = calculateDailyAndOvertimeValues(
        record.worked_hours,
        recordDate,
        record.employees.companies.daily_rate,
        record.employees.companies.overtime_rate
      );

      if (!acc[empId]) {
        acc[empId] = {
          employee_id: empId,
          employee_name: record.employees.name,
          company_name: record.employees.companies.name,
          total_records: 0,
          total_hours: 0,
          total_daily: 0,
          total_overtime: 0,
          total_value: 0,
        };
      }
      
      acc[empId].total_records++;
      acc[empId].total_hours += record.worked_hours;
      acc[empId].total_daily += dailyValue;
      acc[empId].total_overtime += overtimeValue;
      acc[empId].total_value += totalValue;
      
      return acc;
    }, {});

    const reportResults = Object.values(grouped || {}) as ReportRecord[];
    console.log('Funcionários no relatório:', reportResults.length);
    setReportData(reportResults);
  };

  const exportToExcel = () => {
    if (reportData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'Gere um relatório primeiro.',
      });
      return;
    }

    const worksheetData = [
      ['Funcionário', 'Empresa', 'Registros', 'Horas', 'Diárias', 'Extras', 'Total'],
      ...reportData.map(record => [
        record.employee_name,
        record.company_name,
        record.total_records,
        record.total_hours.toFixed(2),
        record.total_daily.toFixed(2),
        record.total_overtime.toFixed(2),
        record.total_value.toFixed(2),
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');

    XLSX.writeFile(workbook, `relatorio-${startDate}-${endDate}.xlsx`);

    toast({
      title: 'Relatório exportado!',
      description: 'O arquivo Excel foi baixado com sucesso.',
    });
  };

  const totalSummary = reportData.reduce(
    (acc, record) => ({
      records: acc.records + record.total_records,
      hours: acc.hours + record.total_hours,
      daily: acc.daily + record.total_daily,
      overtime: acc.overtime + record.total_overtime,
      total: acc.total + record.total_value,
    }),
    { records: 0, hours: 0, daily: 0, overtime: 0, total: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Visualize e exporte relatórios detalhados
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateReport}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={exportToExcel} disabled={reportData.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Período
          </CardTitle>
          <CardDescription>
            Selecione o período e os filtros para gerar o relatório
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompany || undefined} onValueChange={(value) => setSelectedCompany(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
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
              <Label>Funcionário</Label>
              <Select value={selectedEmployee || undefined} onValueChange={(value) => setSelectedEmployee(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Valor Total Gerado
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummary.total)}
            </div>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              Período: {format(parseLocalDate(startDate), 'dd/MM/yyyy', { locale: ptBR })} - {format(parseLocalDate(endDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Horas Trabalhadas
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
              {totalSummary.hours.toFixed(2)}h
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              {totalSummary.records} registros de ponto
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">
              Diárias Pagas
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummary.daily)}
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              Valores de diárias integrais e proporcionais
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Horas Extras
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-900 dark:text-amber-100">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummary.overtime)}
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Valores de horas extras trabalhadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumo por Funcionário</CardTitle>
          <CardDescription>
            {reportData.length} funcionário(s) com registros no período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Diárias</TableHead>
                <TableHead>Extras</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum registro encontrado para o período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                reportData.map((record) => (
                  <TableRow key={record.employee_id}>
                    <TableCell className="font-medium">{record.employee_name}</TableCell>
                    <TableCell>{record.company_name}</TableCell>
                    <TableCell>{record.total_records}</TableCell>
                    <TableCell>{record.total_hours.toFixed(2)}h</TableCell>
                    <TableCell className="text-green-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.total_daily)}
                    </TableCell>
                    <TableCell className="text-blue-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.total_overtime)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(record.total_value)}
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