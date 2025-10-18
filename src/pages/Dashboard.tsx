import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Building2, Clock, DollarSign, Calendar, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateDailyAndOvertimeValues } from '@/utils/timeCalculations';

interface DashboardStats {
  totalEmployees: number;
  totalCompanies: number;
  monthRecords: number;
  monthTotal: number;
  pendingExits: number;
}

interface SectorCost {
  setor: string;
  total: number;
  count: number;
}

interface WorkUnitCost {
  unit: string;
  total: number;
  count: number;
}

interface RecentRecord {
  id: string;
  date: string;
  entry_time: string;
  exit_time: string;
  total_value: number;
  employees: {
    name: string;
  };
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEmployees: 0,
    totalCompanies: 0,
    monthRecords: 0,
    monthTotal: 0,
    pendingExits: 0,
  });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [monthlyDailyTotal, setMonthlyDailyTotal] = useState(0);
  const [monthlyOvertimeTotal, setMonthlyOvertimeTotal] = useState(0);
  const [firstFortnightTotal, setFirstFortnightTotal] = useState(0);
  const [secondFortnightTotal, setSecondFortnightTotal] = useState(0);
  const [sectorCosts, setSectorCosts] = useState<SectorCost[]>([]);
  const [workUnitCosts, setWorkUnitCosts] = useState<WorkUnitCost[]>([]);
  const [prevMonthTotal, setPrevMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const currentMonth = format(new Date(), 'MMMM \'de\' yyyy', { locale: ptBR });
  const previousMonth = format(new Date(new Date().setMonth(new Date().getMonth() - 1)), 'MMMM \'de\' yyyy', { locale: ptBR });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Parallel data fetching for better performance
      await Promise.all([
        fetchDashboardData(),
        fetchSectorCosts(),
        fetchWorkUnitCosts()
      ]);
    } catch (err: any) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError(err.message || 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  };

  // Memoize calculations
  const percentageChange = useMemo(() => {
    if (prevMonthTotal === 0) return 0;
    return ((stats.monthTotal - prevMonthTotal) / prevMonthTotal) * 100;
  }, [stats.monthTotal, prevMonthTotal]);

  const fetchDashboardData = async () => {
    // Buscar total de funcionários
    const { count: employeesCount, error: empError } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    if (empError) throw empError;

    // Buscar total de empresas
    const { count: companiesCount, error: compError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (compError) throw compError;

    // Buscar registros do mês atual COM dados dos cargos para cálculo dinâmico
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const { data: monthRecords, error: monthError } = await supabase
      .from('time_records')
      .select(`
        id,
        date,
        worked_hours,
        employees (
          job_positions (
            daily_rate,
            overtime_rate
          )
        )
      `)
      .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth, 'yyyy-MM-dd'));

    if (monthError) throw monthError;

    // Calcular valores dinamicamente usando a mesma lógica dos Relatórios
    let monthTotal = 0;
    let dailyTotal = 0;
    let overtimeTotal = 0;
    let firstFortnightTotal = 0;
    let secondFortnightTotal = 0;

    monthRecords?.forEach((record: any) => {
      // Pular registros sem cargo vinculado
      if (!record.employees?.job_positions) return;

      // Parse da data corretamente
      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);

      // Calcular valores com base nos valores atuais do cargo
      const { dailyValue, overtimeValue, totalValue } = calculateDailyAndOvertimeValues(
        record.worked_hours,
        recordDate,
        record.employees.job_positions.daily_rate,
        record.employees.job_positions.overtime_rate
      );

      monthTotal += totalValue;
      dailyTotal += dailyValue;
      overtimeTotal += overtimeValue;

      // Separar por quinzena
      if (day <= 15) {
        firstFortnightTotal += totalValue;
      } else {
        secondFortnightTotal += totalValue;
      }
    });

    // Buscar registros do mês anterior COM dados dos cargos para cálculo dinâmico
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const { data: prevMonthRecords, error: prevMonthError } = await supabase
      .from('time_records')
      .select(`
        date,
        worked_hours,
        employees (
          job_positions (
            daily_rate,
            overtime_rate
          )
        )
      `)
      .gte('date', format(startOfPrevMonth, 'yyyy-MM-dd'))
      .lte('date', format(endOfPrevMonth, 'yyyy-MM-dd'));

    if (prevMonthError) throw prevMonthError;

    // Calcular total do mês anterior dinamicamente
    let prevTotal = 0;
    prevMonthRecords?.forEach((record: any) => {
      if (!record.employees?.job_positions) return;

      const [year, month, day] = record.date.split('-').map(Number);
      const recordDate = new Date(year, month - 1, day);

      const { totalValue } = calculateDailyAndOvertimeValues(
        record.worked_hours,
        recordDate,
        record.employees.job_positions.daily_rate,
        record.employees.job_positions.overtime_rate
      );

      prevTotal += totalValue;
    });

    // Buscar registros recentes
    const { data: recent, error: recentError } = await supabase
      .from('time_records')
      .select('id, date, entry_time, exit_time, total_value, employees(name)')
      .order('date', { ascending: false })
      .order('entry_time', { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    // Buscar registros sem saída (pendentes)
    const { count: pendingCount, error: pendingError } = await supabase
      .from('time_records')
      .select('*', { count: 'exact', head: true })
      .is('exit_time', null);

    if (pendingError) throw pendingError;

    setStats({
      totalEmployees: employeesCount || 0,
      totalCompanies: companiesCount || 0,
      monthRecords: monthRecords?.length || 0,
      monthTotal: monthTotal,
      pendingExits: pendingCount || 0,
    });

    setMonthlyDailyTotal(dailyTotal);
    setMonthlyOvertimeTotal(overtimeTotal);
    setFirstFortnightTotal(firstFortnightTotal);
    setSecondFortnightTotal(secondFortnightTotal);
    setPrevMonthTotal(prevTotal);
    setRecentRecords(recent || []);
  };

  const fetchSectorCosts = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data, error } = await supabase
      .from('time_records')
      .select(`
        setor,
        date,
        worked_hours,
        employees (
          job_positions (
            daily_rate,
            overtime_rate
          )
        )
      `)
      .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth, 'yyyy-MM-dd'))
      .not('setor', 'is', null);

    if (error) throw error;

    if (data) {
      const costs = data.reduce((acc: any, record: any) => {
        const sector = record.setor || 'OUTROS';
        if (!acc[sector]) {
          acc[sector] = { setor: sector, total: 0, count: 0 };
        }

        // Calcular valor dinamicamente
        if (record.employees?.job_positions) {
          const [year, month, day] = record.date.split('-').map(Number);
          const recordDate = new Date(year, month - 1, day);

          const { totalValue } = calculateDailyAndOvertimeValues(
            record.worked_hours,
            recordDate,
            record.employees.job_positions.daily_rate,
            record.employees.job_positions.overtime_rate
          );

          acc[sector].total += totalValue;
        }
        
        acc[sector].count += 1;
        return acc;
      }, {});

      setSectorCosts(Object.values(costs));
    }
  };

  const fetchWorkUnitCosts = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const { data: records, error } = await supabase
      .from('time_records')
      .select(`
        employee_id,
        date,
        worked_hours,
        employees (
          id,
          work_unit,
          job_positions (
            daily_rate,
            overtime_rate
          )
        )
      `)
      .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
      .lte('date', format(endOfMonth, 'yyyy-MM-dd'));

    if (error) throw error;

    if (records) {
      const costs: { [key: string]: { unit: string; total: number; count: number } } = {};

      records.forEach((record: any) => {
        const employee = record.employees;
        if (employee && employee.work_unit && employee.job_positions) {
          // Calcular valor dinamicamente
          const [year, month, day] = record.date.split('-').map(Number);
          const recordDate = new Date(year, month - 1, day);

          const { totalValue } = calculateDailyAndOvertimeValues(
            record.worked_hours,
            recordDate,
            employee.job_positions.daily_rate,
            employee.job_positions.overtime_rate
          );

          employee.work_unit.forEach((unit: string) => {
            if (!costs[unit]) {
              costs[unit] = { unit, total: 0, count: 0 };
            }
            costs[unit].total += totalValue / employee.work_unit.length;
            costs[unit].count += 1 / employee.work_unit.length;
          });
        }
      });

      setWorkUnitCosts(Object.values(costs));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <button
              onClick={loadData}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Tentar novamente
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.email}. Aqui está um resumo dos dados do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Funcionários
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
              <Users className="h-4 w-4 text-primary/70" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Empresas Cadastradas
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-accent/30 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-accent-foreground/70" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registros do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-info/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-info/70" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthRecords}</div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-success/70" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.monthTotal)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saídas Pendentes
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-destructive/70" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingExits}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              1ª Quinzena
            </CardTitle>
            <CardDescription>Dias 01-15 de {currentMonth.split(' de ')[0]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <span className="text-sm font-medium">Total 1ª Quinzena</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(firstFortnightTotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              2ª Quinzena
            </CardTitle>
            <CardDescription>Dias 16-31 de {currentMonth.split(' de ')[0]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-accent/20 rounded-lg border border-accent/40">
              <span className="text-sm font-medium">Total 2ª Quinzena</span>
              <span className="text-xl font-bold text-accent-foreground">
                {formatCurrency(secondFortnightTotal)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo Mensal
            </CardTitle>
            <CardDescription>{currentMonth}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border/40">
              <span className="text-sm font-medium">Valor Diárias</span>
              <span className="text-lg font-bold text-success/80">
                {formatCurrency(monthlyDailyTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/30 rounded-lg border border-border/40">
              <span className="text-sm font-medium">Valor Extras</span>
              <span className="text-lg font-bold text-info/80">
                {formatCurrency(monthlyOvertimeTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-success/10 rounded-lg border border-success/30">
              <div>
                <p className="text-sm font-medium">Total Acumulado</p>
                <p className="text-xl font-bold text-success">{formatCurrency(stats.monthTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{previousMonth}</p>
                <p className="text-sm font-semibold">{formatCurrency(prevMonthTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Custos por Unidade
            </CardTitle>
            <CardDescription>Distribuição mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workUnitCosts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum dado disponível
                </p>
              ) : (
                workUnitCosts.map((unitCost) => (
                  <div
                    key={unitCost.unit}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40"
                  >
                    <div>
                      <p className="font-medium text-sm">{unitCost.unit}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(unitCost.count)} registro(s)
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatCurrency(unitCost.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Custos por Setor
            </CardTitle>
            <CardDescription>Distribuição mensal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sectorCosts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum dado disponível
                </p>
              ) : (
                sectorCosts.map((sector) => (
                  <div
                    key={sector.setor}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40"
                  >
                    <div>
                      <p className="font-medium text-sm">{sector.setor}</p>
                      <p className="text-xs text-muted-foreground">
                        {sector.count} registro(s)
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatCurrency(sector.total)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros Recentes
            </CardTitle>
            <CardDescription>
              Últimos 5 registros de ponto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nenhum registro encontrado
                </p>
              ) : (
                recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/40"
                  >
                    <div>
                      <p className="font-medium text-sm">{record.employees.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
                        {record.entry_time} - {record.exit_time}
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      {formatCurrency(record.total_value || 0)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}