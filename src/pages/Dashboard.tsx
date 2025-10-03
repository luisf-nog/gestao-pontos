import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Building2, Clock, DollarSign, Calendar, AlertCircle, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

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
  const [sectorCosts, setSectorCosts] = useState<SectorCost[]>([]);
  const currentMonth = format(new Date(), 'MMMM \'de\' yyyy', { locale: ptBR });

  useEffect(() => {
    fetchDashboardData();
    fetchSectorCosts();
  }, []);

  const fetchDashboardData = async () => {
    // Buscar total de funcionários
    const { count: employeesCount } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Buscar total de empresas
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    // Buscar registros do mês atual
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const { data: monthRecords } = await supabase
      .from('time_records')
      .select('id, total_value, daily_value, overtime_value')
      .gte('date', format(startOfMonth, 'yyyy-MM-dd'));

    const monthTotal = monthRecords?.reduce((sum, record) => sum + (record.total_value || 0), 0) || 0;
    const dailyTotal = monthRecords?.reduce((sum, record) => sum + (record.daily_value || 0), 0) || 0;
    const overtimeTotal = monthRecords?.reduce((sum, record) => sum + (record.overtime_value || 0), 0) || 0;

    // Buscar registros recentes
    const { data: recent } = await supabase
      .from('time_records')
      .select('id, date, entry_time, exit_time, total_value, employees(name)')
      .order('date', { ascending: false })
      .order('entry_time', { ascending: false })
      .limit(5);

    // Buscar registros sem saída (pendentes)
    const { count: pendingCount } = await supabase
      .from('time_records')
      .select('*', { count: 'exact', head: true })
      .is('exit_time', null);

    setStats({
      totalEmployees: employeesCount || 0,
      totalCompanies: companiesCount || 0,
      monthRecords: monthRecords?.length || 0,
      monthTotal: monthTotal,
      pendingExits: pendingCount || 0,
    });

    setMonthlyDailyTotal(dailyTotal);
    setMonthlyOvertimeTotal(overtimeTotal);
    setRecentRecords(recent || []);
  };

  const fetchSectorCosts = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data } = await supabase
      .from('time_records')
      .select('setor, total_value')
      .gte('date', format(startOfMonth, 'yyyy-MM-dd'))
      .not('setor', 'is', null);

    if (data) {
      const costs = data.reduce((acc: any, record: any) => {
        const sector = record.setor || 'OUTROS';
        if (!acc[sector]) {
          acc[sector] = { setor: sector, total: 0, count: 0 };
        }
        acc[sector].total += record.total_value || 0;
        acc[sector].count += 1;
        return acc;
      }, {});

      setSectorCosts(Object.values(costs));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.email}. Aqui está um resumo dos dados do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Total de Funcionários
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-900 dark:text-violet-100">
              Empresas Cadastradas
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-500/20 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">{stats.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Registros do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.monthRecords}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">
              Total do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              R$ {stats.monthTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-100">
              Saídas Pendentes
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.pendingExits}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Resumo Mensal
            </CardTitle>
            <CardDescription>{currentMonth}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Valor Diárias</span>
              <span className="text-lg font-bold text-green-600">
                R$ {monthlyDailyTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
              <span className="text-sm font-medium">Valor Extras</span>
              <span className="text-lg font-bold text-blue-600">
                R$ {monthlyOvertimeTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg">
              <span className="text-sm font-medium">Total Geral</span>
              <span className="text-lg font-bold text-primary">
                R$ {stats.monthTotal.toFixed(2)}
              </span>
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{sector.setor}</p>
                      <p className="text-xs text-muted-foreground">
                        {sector.count} registro(s)
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      R$ {sector.total.toFixed(2)}
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
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-sm">{record.employees.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
                        {record.entry_time} - {record.exit_time}
                      </p>
                    </div>
                    <span className="font-semibold text-sm">
                      R$ {(record.total_value || 0).toFixed(2)}
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