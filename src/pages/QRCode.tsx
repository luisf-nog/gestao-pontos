import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QrCode, MapPin, Download, RefreshCw, AlertCircle } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Company {
  id: string;
  name: string;
}

interface QRSettings {
  id?: string;
  company_id: string;
  qr_code_token: string;
  qr_code_version: number;
  qr_enabled: boolean;
  geo_enabled: boolean;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
}

export default function QRCodePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [settings, setSettings] = useState<QRSettings | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchQRSettings();
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (settings?.qr_code_token) {
      generateQRCode(settings.qr_code_token);
    }
  }, [settings?.qr_code_token]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCompanies(data);
      if (data.length > 0) {
        setSelectedCompany(data[0].id);
      }
    }
  };

  const fetchQRSettings = async () => {
    const { data } = await supabase
      .from('company_qr_settings')
      .select('*')
      .eq('company_id', selectedCompany)
      .maybeSingle();

    if (data) {
      setSettings(data);
    } else {
      // Criar configuração padrão
      const newToken = crypto.randomUUID();
      setSettings({
        company_id: selectedCompany,
        qr_code_token: newToken,
        qr_code_version: 1,
        qr_enabled: true,
        geo_enabled: true,
        latitude: null,
        longitude: null,
        radius_meters: 100,
      });
    }
  };

  const generateQRCode = async (token: string) => {
    try {
      const url = await QRCodeLib.toDataURL(token, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataUrl(url);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      if (settings.id) {
        const { error } = await supabase
          .from('company_qr_settings')
          .update({
            qr_enabled: settings.qr_enabled,
            geo_enabled: settings.geo_enabled,
            latitude: settings.latitude,
            longitude: settings.longitude,
            radius_meters: settings.radius_meters,
          })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('company_qr_settings')
          .insert([settings])
          .select()
          .single();

        if (error) throw error;
        if (data) setSettings(data);
      }

      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const rotateQRCode = async () => {
    if (!settings) return;

    setLoading(true);
    try {
      const newToken = crypto.randomUUID();
      const newVersion = settings.qr_code_version + 1;

      const updatedSettings = {
        ...settings,
        qr_code_token: newToken,
        qr_code_version: newVersion,
      };

      if (settings.id) {
        const { error } = await supabase
          .from('company_qr_settings')
          .update({
            qr_code_token: newToken,
            qr_code_version: newVersion,
          })
          .eq('id', settings.id);

        if (error) throw error;
      }

      setSettings(updatedSettings);
      toast.success('QR Code rotacionado com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao rotacionar QR Code: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;

    const link = document.createElement('a');
    link.download = `qrcode-${selectedCompany}-v${settings?.qr_code_version}.png`;
    link.href = qrCodeDataUrl;
    link.click();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSettings(prev => prev ? {
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          } : null);
          toast.success('Localização capturada!');
        },
        (error) => {
          toast.error('Erro ao obter localização: ' + error.message);
        }
      );
    } else {
      toast.error('Geolocalização não suportada pelo navegador');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de QR Code e Geolocalização</h1>
        <p className="text-muted-foreground">
          Configure o QR Code e o perímetro de localização para controle de ponto
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Para bater ponto, colaboradores precisarão escanear o QR Code vigente E estar dentro do perímetro configurado (se ambas validações estiverem ativas).
        </AlertDescription>
      </Alert>

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Empresa</CardTitle>
            <CardDescription>Escolha a empresa para gerenciar</CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="w-full p-2 border rounded-md bg-background"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {settings && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Code
                  </CardTitle>
                  <CardDescription>Versão {settings.qr_code_version}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {qrCodeDataUrl && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>QR Code Ativo</Label>
                      <p className="text-sm text-muted-foreground">
                        Exigir QR Code para bater ponto
                      </p>
                    </div>
                    <Switch
                      checked={settings.qr_enabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, qr_enabled: checked })
                      }
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={downloadQRCode} variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                    <Button
                      onClick={rotateQRCode}
                      variant="outline"
                      disabled={loading}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rotacionar
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Geolocalização
                  </CardTitle>
                  <CardDescription>Configurar perímetro permitido</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Geolocalização Ativa</Label>
                      <p className="text-sm text-muted-foreground">
                        Exigir localização para bater ponto
                      </p>
                    </div>
                    <Switch
                      checked={settings.geo_enabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, geo_enabled: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={settings.latitude || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          latitude: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="-23.5505199"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={settings.longitude || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          longitude: e.target.value ? parseFloat(e.target.value) : null,
                        })
                      }
                      placeholder="-46.6333094"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Raio de Tolerância (metros)</Label>
                    <Input
                      type="number"
                      value={settings.radius_meters}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          radius_meters: parseInt(e.target.value) || 100,
                        })
                      }
                    />
                  </div>

                  <Button
                    onClick={getCurrentLocation}
                    variant="outline"
                    className="w-full"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Usar Minha Localização Atual
                  </Button>

                  {settings.latitude && settings.longitude && (
                    <p className="text-xs text-muted-foreground">
                      Colaboradores precisarão estar dentro de um raio de{' '}
                      {settings.radius_meters}m da localização configurada
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Button onClick={saveSettings} disabled={loading} className="w-full">
                  Salvar Configurações
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}