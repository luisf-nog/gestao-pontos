import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2, QrCode as QrCodeIcon, MapPin, Download, RefreshCw } from 'lucide-react';
import QRCode from 'qrcode';

interface Company {
  id: string;
  name: string;
}

interface WorkLocation {
  id: string;
  company_id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  radius_meters: number;
  qr_code_token: string;
  qr_code_version: number;
  qr_enabled: boolean;
  geo_enabled: boolean;
}

export default function WorkLocations() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [locations, setLocations] = useState<WorkLocation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<WorkLocation | null>(null);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'Matriz',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
    qr_enabled: true,
    geo_enabled: true,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchLocations();
    }
  }, [selectedCompanyId]);

  useEffect(() => {
    if (editingLocation) {
      generateQRCode(editingLocation.qr_code_token);
    }
  }, [editingLocation]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCompanies(data);
      if (data.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(data[0].id);
      }
    }
  };

  const fetchLocations = async () => {
    const { data } = await supabase
      .from('work_locations')
      .select('*')
      .eq('company_id', selectedCompanyId)
      .order('name');
    
    if (data) {
      setLocations(data);
    }
  };

  const generateQRCode = async (token: string) => {
    try {
      const url = await QRCode.toDataURL(token, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeDataURL(url);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !selectedCompanyId) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
      });
      return;
    }

    const locationData = {
      company_id: selectedCompanyId,
      name: formData.name,
      type: formData.type,
      address: formData.address || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      radius_meters: parseInt(formData.radius_meters),
      qr_enabled: formData.qr_enabled,
      geo_enabled: formData.geo_enabled,
    };

    if (editingLocation) {
      const { error } = await supabase
        .from('work_locations')
        .update(locationData)
        .eq('id', editingLocation.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Local atualizado!',
        description: 'Local de trabalho atualizado com sucesso.',
      });
    } else {
      const { error } = await supabase
        .from('work_locations')
        .insert([locationData]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao criar',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Local criado!',
        description: 'Local de trabalho criado com sucesso.',
      });
    }

    fetchLocations();
    handleCloseDialog();
  };

  const handleEdit = (location: WorkLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      address: location.address || '',
      latitude: location.latitude?.toString() || '',
      longitude: location.longitude?.toString() || '',
      radius_meters: location.radius_meters.toString(),
      qr_enabled: location.qr_enabled,
      geo_enabled: location.geo_enabled,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este local?')) return;

    const { error } = await supabase
      .from('work_locations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Local excluído',
      description: 'Local de trabalho excluído com sucesso.',
    });
    fetchLocations();
  };

  const handleRotateQR = async (location: WorkLocation) => {
    const { error } = await supabase
      .from('work_locations')
      .update({
        qr_code_token: `${crypto.randomUUID()}-${Date.now()}`,
        qr_code_version: location.qr_code_version + 1,
      })
      .eq('id', location.id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'QR Code renovado',
      description: 'Um novo QR Code foi gerado para este local.',
    });
    fetchLocations();
  };

  const downloadQRCode = (locationName: string) => {
    const link = document.createElement('a');
    link.download = `qrcode-${locationName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeDataURL;
    link.click();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString(),
          });
          toast({
            title: 'Localização obtida',
            description: 'Coordenadas atualizadas com sucesso!',
          });
        },
        (error) => {
          toast({
            variant: 'destructive',
            title: 'Erro ao obter localização',
            description: error.message,
          });
        }
      );
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingLocation(null);
    setQrCodeDataURL('');
    setFormData({
      name: '',
      type: 'Matriz',
      address: '',
      latitude: '',
      longitude: '',
      radius_meters: '100',
      qr_enabled: true,
      geo_enabled: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Locais de Trabalho</h1>
          <p className="text-muted-foreground">
            Gerencie os locais onde funcionários podem bater ponto
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Local
        </Button>
      </div>

      <div className="max-w-xs">
        <Label>Empresa</Label>
        <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a empresa" />
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{location.name}</CardTitle>
                  <CardDescription>{location.type}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(location)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(location.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {location.address && (
                <p className="text-sm text-muted-foreground">{location.address}</p>
              )}
              
              <div className="flex gap-2 flex-wrap">
                {location.qr_enabled && (
                  <div className="flex items-center gap-1 text-sm">
                    <QrCodeIcon className="h-4 w-4 text-green-600" />
                    <span>QR Ativo</span>
                  </div>
                )}
                {location.geo_enabled && (
                  <div className="flex items-center gap-1 text-sm">
                    <MapPin className="h-4 w-4 text-blue-600" />
                    <span>{location.radius_meters}m</span>
                  </div>
                )}
              </div>

              {location.qr_enabled && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleRotateQR(location)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renovar QR Code
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Editar Local' : 'Novo Local de Trabalho'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados do local onde funcionários podem registrar ponto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Local *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Matriz, Filial Centro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Matriz">Matriz</SelectItem>
                    <SelectItem value="Filial">Filial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Geolocalização</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.geo_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, geo_enabled: checked })}
                  />
                  <span className="text-sm">{formData.geo_enabled ? 'Ativa' : 'Inativa'}</span>
                </div>
              </div>

              {formData.geo_enabled && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getCurrentLocation}
                    className="w-full"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Usar Localização Atual
                  </Button>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="latitude">Latitude</Label>
                      <Input
                        id="latitude"
                        type="number"
                        step="any"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        placeholder="-25.4284"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="longitude">Longitude</Label>
                      <Input
                        id="longitude"
                        type="number"
                        step="any"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        placeholder="-49.2733"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="radius">Raio (metros)</Label>
                      <Input
                        id="radius"
                        type="number"
                        value={formData.radius_meters}
                        onChange={(e) => setFormData({ ...formData, radius_meters: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>QR Code</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.qr_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, qr_enabled: checked })}
                  />
                  <span className="text-sm">{formData.qr_enabled ? 'Ativo' : 'Inativo'}</span>
                </div>
              </div>

              {editingLocation && qrCodeDataURL && formData.qr_enabled && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex justify-center">
                      <img src={qrCodeDataURL} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => downloadQRCode(editingLocation.name)}
                      className="w-full"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Baixar QR Code
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingLocation ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
