import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LogIn, LogOut, Clock, Key, Calendar, Coffee, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Employee {
  id: string;
  name: string;
  is_active: boolean;
  company_id: string;
  companies: {
    name: string;
  };
}

interface TodayRecordExtended {
  id: string;
  entry_time: string;
  exit_time: string | null;
  lunch_exit_time: string | null;
  lunch_return_time: string | null;
  lunch_hours?: number | null;
  setor: string | null;
}

export default function PontoEletronico() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodayRecordExtended | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [lunchExitTime, setLunchExitTime] = useState<string>('');
  const [lunchReturnTime, setLunchReturnTime] = useState<string>('');
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
      .select('id, name, is_active, company_id, companies(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar funcionário:', error);
      setIsLoading(false);
      return;
    }

    if (!data) {
      setIsLoading(false);
      return;
    }

    if (!data.is_active) {
      toast({
        variant: 'destructive',
        title: 'Acesso bloqueado',
        description: 'Seu acesso ao sistema de ponto foi desativado. Entre em contato com o administrador.',
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
      .maybeSingle();

    if (!employeeData) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('time_records')
      .select('id, entry_time, exit_time, lunch_exit_time, lunch_return_time, lunch_hours, setor')
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
    if (!employee || !selectedSetor) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Selecione o setor antes de registrar entrada.',
      });
      return;
    }

    const { data: activeCheck, error: checkError } = await supabase
      .from('employees')
      .select('is_active')
      .eq('id', employee.id)
      .maybeSingle();

    if (checkError || !activeCheck || !activeCheck.is_active) {
      toast({
        variant: 'destructive',
        title: 'Acesso bloqueado',
        description: 'Seu acesso foi desativado. Entre em contato com o administrador.',
      });
      return;
    }

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const time = format(now, 'HH:mm');

    const { data, error } = await supabase
      .from('time_records')
      .insert([{
        employee_id: employee.id,
        date: today,
        entry_time: time,
        exit_time: null,
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

  const handleLunchExit = async () => {
    if (!todayRecord || !lunchExitTime) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe o horário de saída para almoço.',
      });
      return;
    }

    const { error } = await supabase
      .from('time_records')
      .update({ lunch_exit_time: lunchExitTime })
      .eq('id', todayRecord.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
      return;
    }

    setTodayRecord({ ...todayRecord, lunch_exit_time: lunchExitTime });
    toast({
      title: 'Saída para almoço registrada',
      description: `Registrado às ${lunchExitTime}`,
    });
    setLunchExitTime('');
  };

  const handleLunchReturn = async () => {
    if (!todayRecord || !lunchReturnTime) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Informe o horário de retorno do almoço.',
      });
      return;
    }

    // Calcular tempo de almoço
    const [exitHour, exitMin] = (todayRecord.lunch_exit_time || '12:00').split(':').map(Number);
    const [returnHour, returnMin] = lunchReturnTime.split(':').map(Number);
    const lunchHours = (returnHour + returnMin / 60) - (exitHour + exitMin / 60);

    const { error } = await supabase
      .from('time_records')
      .update({ 
        lunch_return_time: lunchReturnTime,
        lunch_hours: lunchHours
      })
      .eq('id', todayRecord.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
      return;
    }

    setTodayRecord({ ...todayRecord, lunch_return_time: lunchReturnTime, lunch_hours: lunchHours });
    
    if (lunchHours > 1) {
      const extraMinutes = Math.round((lunchHours - 1) * 60);
      toast({
        title: 'Retorno do almoço registrado',
        description: `Tempo de almoço: ${lunchHours.toFixed(2)}h. Excedente de ${extraMinutes} minutos será descontado do salário.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Retorno do almoço registrado',
        description: `Registrado às ${lunchReturnTime}`,
      });
    }
    
    setLunchReturnTime('');
  };

  const handleExit = async () => {
    if (!employee || !todayRecord) return;

    const { data: activeCheck, error: checkError } = await supabase
      .from('employees')
      .select('is_active')
      .eq('id', employee.id)
      .maybeSingle();

    if (checkError || !activeCheck || !activeCheck.is_active) {
      toast({
        variant: 'destructive',
        title: 'Acesso bloqueado',
        description: 'Seu acesso foi desativado. Entre em contato com o administrador.',
      });
      return;
    }

    const now = new Date();
    const time = format(now, 'HH:mm');

    // Calcular horas trabalhadas considerando almoço real ou padrão de 1h
    const [entryHour, entryMin] = todayRecord.entry_time.split(':').map(Number);
    const [exitHour, exitMin] = time.split(':').map(Number);
    
    let lunchBreak = 1; // Padrão: 1 hora
    if (todayRecord.lunch_exit_time && todayRecord.lunch_return_time) {
      const [lunchExitH, lunchExitM] = todayRecord.lunch_exit_time.split(':').map(Number);
      const [lunchReturnH, lunchReturnM] = todayRecord.lunch_return_time.split(':').map(Number);
      lunchBreak = (lunchReturnH + lunchReturnM / 60) - (lunchExitH + lunchExitM / 60);
    }
    
    const workedHours = (exitHour + exitMin / 60) - (entryHour + entryMin / 60) - lunchBreak;

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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Acesso não autorizado</CardTitle>
            <CardDescription>
              Você não está vinculado a um funcionário. Entre em contato com o administrador.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-2">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <Clock className="h-16 w-16 text-primary animate-pulse" />
            </div>
            <CardTitle className="text-3xl">Ponto Eletrônico</CardTitle>
            <CardDescription className="text-lg">
              Bem-vindo(a), <span className="font-semibold text-foreground">{employee.name}</span>
            </CardDescription>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{currentDate}</span>
            </div>
            <div className="text-4xl font-bold text-primary">
              {currentTime}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {!todayRecord ? (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Você ainda não registrou entrada hoje. Selecione o setor e clique em "Registrar Entrada".
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label>Setor</Label>
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o setor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOGISTICA">LOGÍSTICA</SelectItem>
                      <SelectItem value="QUALIDADE">QUALIDADE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleEntry} 
                  className="w-full h-16 text-lg"
                  disabled={!selectedSetor}
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Registrar Entrada
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Entrada</p>
                    <p className="text-2xl font-bold">{todayRecord.entry_time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saída</p>
                    <p className="text-2xl font-bold">
                      {todayRecord.exit_time || <span className="text-amber-600">Pendente</span>}
                    </p>
                  </div>
                  {todayRecord.setor && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Setor</p>
                      <Badge variant="outline" className="mt-1">{todayRecord.setor}</Badge>
                    </div>
                  )}
                </div>

                {/* Controle de Almoço */}
                {!todayRecord.exit_time && (
                  <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Coffee className="h-5 w-5" />
                        Controle de Almoço
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!todayRecord.lunch_exit_time ? (
                        <div className="space-y-2">
                          <Label>Horário de Saída para Almoço</Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={lunchExitTime}
                              onChange={(e) => setLunchExitTime(e.target.value)}
                            />
                            <Button onClick={handleLunchExit}>
                              Registrar Saída
                            </Button>
                          </div>
                        </div>
                      ) : !todayRecord.lunch_return_time ? (
                        <div className="space-y-2">
                          <Alert>
                            <AlertDescription>
                              Saída para almoço: <strong>{todayRecord.lunch_exit_time}</strong>
                            </AlertDescription>
                          </Alert>
                          <Label>Horário de Retorno do Almoço</Label>
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={lunchReturnTime}
                              onChange={(e) => setLunchReturnTime(e.target.value)}
                            />
                            <Button onClick={handleLunchReturn}>
                              Registrar Retorno
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Saída Almoço</p>
                              <p className="text-lg font-semibold">{todayRecord.lunch_exit_time}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Retorno Almoço</p>
                              <p className="text-lg font-semibold">{todayRecord.lunch_return_time}</p>
                            </div>
                          </div>
                          {todayRecord.lunch_hours && todayRecord.lunch_hours > 1 && (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Tempo de almoço: <strong>{todayRecord.lunch_hours.toFixed(2)}h</strong>
                                <br />
                                Excedente de {Math.round((todayRecord.lunch_hours - 1) * 60)} minutos será descontado.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {!todayRecord.exit_time && (
                  <Button 
                    onClick={handleExit} 
                    variant="destructive"
                    className="w-full h-16 text-lg"
                  >
                    <LogOut className="mr-2 h-5 w-5" />
                    Registrar Saída
                  </Button>
                )}

                {todayRecord.exit_time && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Ponto do dia finalizado. Até amanhã!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsPasswordDialogOpen(true)}
              >
                <Key className="mr-2 h-4 w-4" />
                Alterar Senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              Digite sua nova senha (mínimo 3 caracteres)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangePassword}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
