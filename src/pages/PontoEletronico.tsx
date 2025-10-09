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
import { LogIn, LogOut, Clock, Key, Calendar, QrCode, MapPin, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRScanner } from '@/components/QRScanner';

interface Employee {
  id: string;
  name: string;
  is_active: boolean;
  company_id: string;
  companies: {
    name: string;
  };
}

interface TodayRecord {
  id: string;
  entry_time: string;
  exit_time: string | null;
}

interface WorkLocation {
  id: string;
  name: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  qr_code_token: string;
  qr_enabled: boolean;
  geo_enabled: boolean;
}

interface TodayRecordExtended extends TodayRecord {
  lunch_exit_time: string | null;
  lunch_return_time: string | null;
  lunch_hours?: number | null;
  setor: string | null;
}

export default function PontoEletronico() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodayRecordExtended | null>(null);
  const [workLocations, setWorkLocations] = useState<WorkLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<WorkLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [scannedQR, setScannedQR] = useState<string>('');
  const [showQRInput, setShowQRInput] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [lunchExitTime, setLunchExitTime] = useState<string>('');
  const [lunchReturnTime, setLunchReturnTime] = useState<string>('');
  const [showLunchDialog, setShowLunchDialog] = useState(false);
  const { toast } = useToast();
  const currentDate = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const currentTime = format(new Date(), 'HH:mm');

  useEffect(() => {
    if (user) {
      fetchEmployeeData();
      fetchTodayRecord();
    }
  }, [user]);

  useEffect(() => {
    if (employee) {
      fetchWorkLocations();
      requestLocation();
    }
  }, [employee]);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
        }
      );
    }
  };

  const fetchWorkLocations = async () => {
    if (!employee) return;

    const { data } = await supabase
      .from('work_locations')
      .select('*')
      .eq('company_id', employee.company_id);

    if (data && data.length > 0) {
      setWorkLocations(data);
      // Selecionar automaticamente o primeiro local
      setSelectedLocation(data[0]);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distância em metros
  };

  const validatePoint = async (): Promise<{ valid: boolean; errors: string[]; distance?: number }> => {
    const errors: string[] = [];
    let calculatedDistance: number | undefined;

    if (!selectedLocation) {
      errors.push('Selecione um local de trabalho');
      return { valid: false, errors };
    }

    // Validar QR Code
    if (selectedLocation.qr_enabled) {
      if (!scannedQR) {
        errors.push('QR Code não escaneado');
      } else if (scannedQR !== selectedLocation.qr_code_token) {
        errors.push('QR Code inválido');
        await logValidation('qr_code', 'invalid_qr', scannedQR);
      }
    }

    // Validar Geolocalização
    if (selectedLocation.geo_enabled) {
      if (!userLocation) {
        errors.push('Localização não obtida. Ative o GPS do dispositivo');
        await logValidation('geolocation', 'gps_disabled', null);
      } else if (selectedLocation.latitude && selectedLocation.longitude) {
        calculatedDistance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          selectedLocation.latitude,
          selectedLocation.longitude
        );

        console.log('Validação de distância:', {
          userLat: userLocation.latitude,
          userLng: userLocation.longitude,
          locationLat: selectedLocation.latitude,
          locationLng: selectedLocation.longitude,
          distance: calculatedDistance,
          radiusAllowed: selectedLocation.radius_meters
        });

        if (calculatedDistance > selectedLocation.radius_meters) {
          errors.push(`Você está fora da área permitida (${Math.round(calculatedDistance)}m de distância)`);
          await logValidation('geolocation', 'out_of_area', null, calculatedDistance);
        }
      }
    }

    setValidationErrors(errors);
    return { valid: errors.length === 0, errors, distance: calculatedDistance };
  };

  const logValidation = async (
    type: string,
    status: string,
    qrCode: string | null,
    distance?: number
  ) => {
    if (!employee) return;

    await supabase.from('point_validation_logs').insert([{
      employee_id: employee.id,
      validation_type: type,
      validation_status: status,
      qr_code_provided: qrCode,
      latitude: userLocation?.latitude,
      longitude: userLocation?.longitude,
      distance_meters: distance,
    }]);
  };

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
      // Usuário não vinculado a um funcionário: não é erro; apenas exibe tela informativa
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
      .select('id, entry_time, exit_time, lunch_exit_time, lunch_return_time, setor')
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
    if (!employee || !selectedSetor || !selectedLocation) return;

    // Validar QR e Geo
    const { valid, errors, distance } = await validatePoint();
    if (!valid) {
      toast({
        variant: 'destructive',
        title: 'Validação Falhou',
        description: errors.join('. '),
      });
      return;
    }

    console.log('Ponto válido! Distância:', distance, 'metros');

    // Verificar novamente se funcionário está ativo antes de registrar ponto
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
        work_location_id: selectedLocation.id,
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
    // Limpar QR escaneado após usar
    setScannedQR('');
    toast({
      title: 'Entrada registrada!',
      description: `Entrada registrada às ${time} - ${selectedLocation.name}`,
    });
  };

  const handleLunchExit = async () => {
    if (!todayRecord || !lunchExitTime) return;

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
    if (!todayRecord || !lunchReturnTime) return;

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
        description: `Tempo de almoço: ${lunchHours.toFixed(2)}h. Excedente de ${extraMinutes} minutos será descontado.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Retorno do almoço registrado',
        description: `Registrado às ${lunchReturnTime}`,
      });
    }
    
    setLunchReturnTime('');
    setShowLunchDialog(false);
  };

  const handleExit = async () => {
    if (!employee || !todayRecord) return;

    // Verificar novamente se funcionário está ativo antes de registrar saída
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
                {/* Seleção de Local */}
                {workLocations.length > 0 && (
                  <div className="space-y-2">
                    <Label>Local de Trabalho</Label>
                    <Select 
                      value={selectedLocation?.id} 
                      onValueChange={(id) => setSelectedLocation(workLocations.find(l => l.id === id) || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o local" />
                      </SelectTrigger>
                      <SelectContent>
                        {workLocations.map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name} ({location.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Validações necessárias */}
                {selectedLocation && (selectedLocation.qr_enabled || selectedLocation.geo_enabled) && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      Para registrar ponto você precisa:
                      {selectedLocation.qr_enabled && <div>✓ Escanear o QR Code da empresa</div>}
                      {selectedLocation.geo_enabled && <div>✓ Estar no local autorizado</div>}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Status de validações */}
                <div className="grid grid-cols-2 gap-2">
                  {selectedLocation?.qr_enabled && (
                    <div className={`p-3 rounded-lg border ${scannedQR ? 'bg-green-100 dark:bg-green-900/20 border-green-500' : 'bg-muted border-border'}`}>
                      <QrCode className={`h-5 w-5 mx-auto mb-1 ${scannedQR ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <p className="text-xs text-center font-medium">
                        {scannedQR ? 'QR OK' : 'QR Pendente'}
                      </p>
                    </div>
                  )}
                  {selectedLocation?.geo_enabled && (
                    <div className={`p-3 rounded-lg border ${userLocation ? 'bg-green-100 dark:bg-green-900/20 border-green-500' : 'bg-muted border-border'}`}>
                      <MapPin className={`h-5 w-5 mx-auto mb-1 ${userLocation ? 'text-green-600' : 'text-muted-foreground'}`} />
                      <p className="text-xs text-center font-medium">
                        {userLocation ? 'Local OK' : 'GPS Pendente'}
                      </p>
                      {userLocation && selectedLocation?.latitude && selectedLocation?.longitude && (
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          ~{Math.round(calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            selectedLocation.latitude,
                            selectedLocation.longitude
                          ))}m
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Input de QR Code */}
                {selectedLocation?.qr_enabled && !scannedQR && (
                  <div className="space-y-2">
                    <Label>QR Code da Empresa</Label>
                    <div className="flex gap-2">
                      <Input
                        value={scannedQR}
                        onChange={(e) => setScannedQR(e.target.value)}
                        placeholder="Digite ou escaneie o código"
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => setShowQRInput(!showQRInput)}
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Erros de validação */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {validationErrors.map((error, i) => (
                        <div key={i}>• {error}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="setor" className="text-base">Selecione o Setor</Label>
                  <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                    <SelectTrigger id="setor" className="h-12 text-lg">
                      <SelectValue placeholder="Escolha o setor" />
                    </SelectTrigger>
                     <SelectContent>
                      <SelectItem value="Qualidade">Qualidade</SelectItem>
                      <SelectItem value="Logística">Logística</SelectItem>
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

      {showQRInput && (
        <QRScanner
          onScan={(data) => {
            setScannedQR(data);
            setShowQRInput(false);
            toast({ title: 'QR lido', description: 'Código capturado com sucesso.' });
          }}
          onClose={() => setShowQRInput(false)}
        />
      )}
    </div>
  );
}