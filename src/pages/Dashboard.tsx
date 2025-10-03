import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Users, Building2, Clock, DollarSign, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DashboardStats {
  totalEmployees: number;
  totalCompanies: number;
  monthRecords: number;
  monthTotal: number;
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
  });
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([]);
  const [monthlyDailyTotal, setMonthlyDailyTotal] = useState(0);
  const [monthlyOvertimeTotal, setMonthlyOvertimeTotal] = useState(0);
  const currentMonth = format(new Date(), 'MMMM \'de\' yyyy', { locale: ptBR });

  useEffect(() => {
    fetchDashboardData();
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

    setStats({
      totalEmployees: employeesCount || 0,
      totalCompanies: companiesCount || 0,
      monthRecords: monthRecords?.length || 0,
      monthTotal: monthTotal,
    });

    setMonthlyDailyTotal(dailyTotal);
    setMonthlyOvertimeTotal(overtimeTotal);
    setRecentRecords(recent || []);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.email}. Aqui está um resumo dos dados do sistema.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/10 dark:to-cyan-950/10 border-blue-100 dark:border-blue-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Total de Funcionários
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/10 dark:to-purple-950/10 border-violet-100 dark:border-violet-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-violet-800 dark:text-violet-200">
              Empresas Cadastradas
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-violet-600 dark:text-violet-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-900 dark:text-violet-100">{stats.totalCompanies}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-950/10 dark:to-yellow-950/10 border-amber-100 dark:border-amber-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Registros do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.monthRecords}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10 border-green-100 dark:border-green-900/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">
              Total do Mês
            </CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              R$ {stats.monthTotal.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/50 dark:from-purple-950/10 dark:to-violet-950/10 border-purple-100 dark:border-purple-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              Resumo Mensal
            </CardTitle>
            <CardDescription className="text-purple-600 dark:text-purple-300">{currentMonth}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Valor Diárias</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-300">
                R$ {monthlyDailyTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Valor Extras</span>
              <span className="text-lg font-bold text-blue-700 dark:text-blue-300">
                R$ {monthlyOvertimeTotal.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-purple-100/50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800/40">
              <span className="text-sm font-medium text-purple-800 dark:text-purple-200">Total Geral</span>
              <span className="text-lg font-bold text-purple-800 dark:text-purple-200">
                R$ {stats.monthTotal.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/10 dark:to-blue-950/10 border-cyan-100 dark:border-cyan-900/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-cyan-800 dark:text-cyan-200">
              <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
              Registros Recentes
            </CardTitle>
            <CardDescription className="text-cyan-600 dark:text-cyan-300">
              Últimos 5 registros de ponto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRecords.length === 0 ? (
                <p className="text-cyan-600 dark:text-cyan-300 text-sm">
                  Nenhum registro encontrado
                </p>
              ) : (
                recentRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 bg-white/50 dark:bg-cyan-900/10 rounded-lg border border-cyan-100 dark:border-cyan-900/30"
                  >
                    <div>
                      <p className="font-medium text-sm text-cyan-900 dark:text-cyan-100">{record.employees.name}</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-300">
                        {format(new Date(record.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} •{' '}
                        {record.entry_time} - {record.exit_time}
                      </p>
                    </div>
                    <span className="font-semibold text-sm text-cyan-900 dark:text-cyan-100">
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