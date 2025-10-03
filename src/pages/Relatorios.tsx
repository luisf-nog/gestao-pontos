import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Download, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
    fetchEmployees();
  }, []);

  useEffect(() => {
    generateReport();
  }, [selectedMonth, selectedCompany, selectedEmployee]);

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
    const monthDate = new Date(selectedMonth + '-01');
    const startDate = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(monthDate), 'yyyy-MM-dd');

    let query = supabase
      .from('time_records')
      .select(`
        employee_id,
        worked_hours,
        daily_value,
        overtime_value,
        total_value,
        employees (
          name,
          companies (
            name
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

    // Agrupar por funcionário
    const grouped = data?.reduce((acc: any, record: any) => {
      const empId = record.employee_id;
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
      acc[empId].total_daily += record.daily_value;
      acc[empId].total_overtime += record.overtime_value;
      acc[empId].total_value += record.total_value;
      return acc;
    }, {});

    setReportData(Object.values(grouped || {}));
  };

  const exportToCSV = () => {
    if (reportData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nenhum dado para exportar',
        description: 'Gere um relatório primeiro.',
      });
      return;
    }

    const headers = ['Funcionário', 'Empresa', 'Registros', 'Horas', 'Diárias', 'Extras', 'Total'];
    const rows = reportData.map(record => [
      record.employee_name,
      record.company_name,
      record.total_records,
      record.total_hours.toFixed(2),
      record.total_daily.toFixed(2),
      record.total_overtime.toFixed(2),
      record.total_value.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio-${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'Relatório exportado!',
      description: 'O arquivo CSV foi baixado com sucesso.',
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
        <Button onClick={exportToCSV} disabled={reportData.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Selecione o período e os filtros para gerar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={selectedCompany || undefined} onValueChange={(value) => setSelectedCompany(value || '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
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
                  <SelectValue placeholder="Todos os funcionários" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Registros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSummary.records}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSummary.hours.toFixed(2)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSummary.total)}</div>
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