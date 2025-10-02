import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';

export default function Ponto() {
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('pt-BR'));
  const { toast } = useToast();

  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(interval);
  });

  const handleRegistrarPonto = () => {
    toast({
      title: 'Ponto registrado!',
      description: `Horário: ${currentTime}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Ponto</h1>
        <p className="text-muted-foreground">
          Registre sua entrada, saída e intervalos
        </p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Horário Atual
            </CardTitle>
            <CardDescription>
              Confirme o horário antes de registrar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary">
                {currentTime}
              </div>
              <p className="text-muted-foreground mt-2">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                onClick={handleRegistrarPonto}
                size="lg"
                className="h-20 text-lg"
              >
                Entrada
              </Button>
              <Button 
                onClick={handleRegistrarPonto}
                size="lg"
                variant="outline"
                className="h-20 text-lg"
              >
                Saída Almoço
              </Button>
              <Button 
                onClick={handleRegistrarPonto}
                size="lg"
                variant="outline"
                className="h-20 text-lg"
              >
                Retorno Almoço
              </Button>
              <Button 
                onClick={handleRegistrarPonto}
                size="lg"
                variant="destructive"
                className="h-20 text-lg"
              >
                Saída
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
