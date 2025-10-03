import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, LogOut, Clock, Key, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  companies: {
    name: string;
  };
}

interface TodayRecord {
  id: string;
  entry_time: string;
  exit_time: string | null;
}

export default function PontoEletronico() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const { toast } = useToast();
  const currentDate = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const currentTime = format(new Date(), 'HH:mm');

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
      fetchTodayRecord();
    }
  }, [user]);

  const fetchEmployeeData = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('employees')
      .select('id, name, companies(name)')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Erro ao buscar funcionário:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar seus dados.',
      });
      setIsLoading(false);
      return;
    }

    setEmployee(data);
    setIsLoading(false);
  };

  const fetchTodayRecord = async () => {
    if (!user) return;

    const { data: employeeData } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!employeeData) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('time_records')
      .select('id, entry_time, exit_time')
      .eq('employee_id', employeeData.id)
      .eq('date', today)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar registro de hoje:', error);
      return;
    }

    setTodayRecord(data);
  };

  const handleEntry = async () => {
    if (!employee || !selectedSetor) return;

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const time = format(now, 'HH:mm');

    const { data, error } = await supabase
      .from('time_records')
      .insert([{
        employee_id: employee.id,
        date: today,
        entry_time: time,
        exit_time: time, // Temporário, será atualizado na saída
        worked_hours: 0,
        setor: selectedSetor as any,
      }])
      .select()
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar entrada',
        description: error.message,
      });
      return;
    }

    setTodayRecord(data);
    toast({
      title: 'Entrada registrada!',
      description: `Entrada registrada às ${time}`,
    });
  };

  const handleExit = async () => {
    if (!employee || !todayRecord) return;

    const now = new Date();
    const time = format(now, 'HH:mm');

    // Calcular horas trabalhadas
    const [entryHour, entryMin] = todayRecord.entry_time.split(':').map(Number);
    const [exitHour, exitMin] = time.split(':').map(Number);
    const workedHours = (exitHour + exitMin / 60) - (entryHour + entryMin / 60) - 1; // Descontando 1h de almoço

    const { error } = await supabase
      .from('time_records')
      .update({
        exit_time: time,
        worked_hours: Math.max(0, workedHours),
      })
      .eq('id', todayRecord.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar saída',
        description: error.message,
      });
      return;
    }

    setTodayRecord({ ...todayRecord, exit_time: time });
    toast({
      title: 'Saída registrada!',
      description: `Saída registrada às ${time}. Horas trabalhadas: ${workedHours.toFixed(2)}h`,
    });
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 3) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'A senha deve ter no mínimo 3 caracteres',
      });
      return;
    }

    const { data, error } = await supabase.functions.invoke('change-password', {
      body: { newPassword }
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao alterar senha',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Senha alterada!',
      description: 'Sua senha foi alterada com sucesso.',
    });

    setIsPasswordDialogOpen(false);
    setNewPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso não autorizado</CardTitle>
            <CardDescription>
              Você não está cadastrado como funcionário no sistema.
              Entre em contato com o administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const hasEntryToday = !!todayRecord;
  const hasExitToday = todayRecord?.exit_time && todayRecord.exit_time !== todayRecord.entry_time;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Ponto Eletrônico</h1>
        <p className="text-muted-foreground capitalize">
          {currentDate}
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{employee.name}</CardTitle>
              <CardDescription>{employee.companies.name}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsPasswordDialogOpen(true)}>
              <Key className="mr-2 h-4 w-4" />
              Alterar Senha
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Clock className="h-8 w-8 text-blue-600" />
            <div className="text-5xl font-bold text-blue-900 dark:text-blue-100">
              {currentTime}
            </div>
          </div>

          {!hasEntryToday ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground mb-4">Você ainda não registrou entrada hoje</p>
              
              <div className="space-y-4 max-w-md mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="setor" className="text-base">Selecione o Setor</Label>
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger id="setor" className="h-12 text-lg">
                      <SelectValue placeholder="Escolha o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="QUALIDADE">Qualidade</SelectItem>
                      <SelectItem value="LOGÍSTICA">Logística</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  size="lg"
                  className="w-full h-20 text-xl"
                  onClick={handleEntry}
                  disabled={!selectedSetor}
                >
                  <LogIn className="mr-2 h-6 w-6" />
                  Registrar Entrada
                </Button>
              </div>
            </div>
          ) : !hasExitToday ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                <Badge variant="default" className="text-base px-4 py-2">
                  Entrada: {todayRecord.entry_time}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Entrada registrada! Registre sua saída quando terminar.</p>
                <Button
                  size="lg"
                  variant="destructive"
                  className="w-full max-w-md h-20 text-xl"
                  onClick={handleExit}
                >
                  <LogOut className="mr-2 h-6 w-6" />
                  Registrar Saída
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                <Badge variant="default" className="text-base px-4 py-2">
                  Entrada: {todayRecord.entry_time}
                </Badge>
                <Badge variant="secondary" className="text-base px-4 py-2">
                  Saída: {todayRecord.exit_time}
                </Badge>
              </div>
              <div className="text-center">
                <p className="text-green-600 dark:text-green-400 font-semibold">
                  ✓ Ponto do dia registrado com sucesso!
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha para acesso ao ponto eletrônico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Digite a nova senha"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={3}
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 3 caracteres
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleChangePassword}>
              Alterar Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}