import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const { user, roles } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo de volta, {user?.email}
        </p>
        {roles.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Perfil: {roles.join(', ')}
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Hoje</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8h 30m</div>
            <p className="text-xs text-muted-foreground">
              +2h desde ontem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">
              +3 novos esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtividade</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">
              +5% desde o mês passado
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>
            Seus registros de ponto mais recentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">Entrada</p>
                <p className="text-sm text-muted-foreground">Hoje às 09:00</p>
              </div>
              <span className="text-green-600 font-medium">Registrado</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">Saída para Almoço</p>
                <p className="text-sm text-muted-foreground">Hoje às 12:00</p>
              </div>
              <span className="text-green-600 font-medium">Registrado</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
