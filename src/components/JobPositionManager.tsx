import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface JobPosition {
  id: string;
  company_id: string;
  name: string;
  daily_rate: number;
  overtime_rate: number;
}

interface JobPositionManagerProps {
  companyId: string;
  companyName: string;
  isDev: boolean;
}

export default function JobPositionManager({ companyId, companyName, isDev }: JobPositionManagerProps) {
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    daily_rate: '',
    overtime_rate: '',
  });

  useEffect(() => {
    if (companyId) {
      fetchPositions();
    }
  }, [companyId]);

  const fetchPositions = async () => {
    const { data, error } = await supabase
      .from('job_positions')
      .select('*')
      .eq('company_id', companyId)
      .order('name');

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar cargos',
        description: error.message,
      });
      return;
    }

    setPositions(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const positionData = {
      company_id: companyId,
      name: formData.name,
      daily_rate: parseFloat(formData.daily_rate),
      overtime_rate: parseFloat(formData.overtime_rate),
    };

    if (editingPosition) {
      const { error } = await supabase
        .from('job_positions')
        .update(positionData)
        .eq('id', editingPosition.id);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao atualizar cargo',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Cargo atualizado!',
        description: 'O cargo foi atualizado com sucesso.',
      });
    } else {
      const { error } = await supabase
        .from('job_positions')
        .insert([positionData]);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao cadastrar cargo',
          description: error.message,
        });
        return;
      }

      toast({
        title: 'Cargo cadastrado!',
        description: 'O novo cargo foi adicionado com sucesso.',
      });
    }

    setIsDialogOpen(false);
    setEditingPosition(null);
    resetForm();
    fetchPositions();
  };

  const handleEdit = (position: JobPosition) => {
    setEditingPosition(position);
    setFormData({
      name: position.name,
      daily_rate: position.daily_rate.toString(),
      overtime_rate: position.overtime_rate.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este cargo?')) return;

    const { error } = await supabase
      .from('job_positions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cargo',
        description: error.message,
      });
      return;
    }

    toast({
      title: 'Cargo excluído',
      description: 'O cargo foi removido com sucesso.',
    });

    fetchPositions();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      daily_rate: '',
      overtime_rate: '',
    });
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPosition(null);
    resetForm();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Cargos - {companyName}</CardTitle>
            <CardDescription>
              {positions.length} cargo(s) cadastrado(s)
            </CardDescription>
          </div>
          {isDev && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <Button onClick={() => setIsDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Cargo
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingPosition ? 'Editar Cargo' : 'Novo Cargo'}
                  </DialogTitle>
                  <DialogDescription>
                    Preencha os dados do cargo para {companyName}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Cargo</Label>
                      <Input
                        id="name"
                        placeholder="Ex: Diária separador"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="daily_rate">Valor da Diária (R$)</Label>
                      <Input
                        id="daily_rate"
                        type="number"
                        step="0.01"
                        placeholder="175.00"
                        value={formData.daily_rate}
                        onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtime_rate">Valor Hora Extra (R$)</Label>
                      <Input
                        id="overtime_rate"
                        type="number"
                        step="0.01"
                        placeholder="19.44"
                        value={formData.overtime_rate}
                        onChange={(e) => setFormData({ ...formData, overtime_rate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingPosition ? 'Atualizar' : 'Cadastrar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cargo</TableHead>
              <TableHead>Valor da Diária</TableHead>
              <TableHead>Valor Hora Extra</TableHead>
              {isDev && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isDev ? 4 : 3} className="text-center text-muted-foreground">
                  Nenhum cargo cadastrado
                </TableCell>
              </TableRow>
            ) : (
              positions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">{position.name}</TableCell>
                  <TableCell>R$ {position.daily_rate.toFixed(2)}</TableCell>
                  <TableCell>R$ {position.overtime_rate.toFixed(2)}</TableCell>
                  {isDev && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(position)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(position.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
