import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import { Plus, Building2, Pencil } from 'lucide-react';

export default function Eventos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ comunidadId: '', titulo: '', descripcion: '', fecha: '' });

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ['eventos'],
    queryFn: () => api.get('/eventos').then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({ queryKey: ['comunidades'], queryFn: () => api.get('/comunidades').then((r) => r.data) });

  const upsert = useMutation({
    mutationFn: (data: typeof form) => 
      editingId 
        ? api.patch(`/eventos/${editingId}`, data)
        : api.post('/eventos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eventos'] });
      handleClose();
    },
  });

  const handleEdit = (e: any) => {
    setEditingId(e.id);
    setForm({
      comunidadId: e.comunidadId,
      titulo: e.titulo,
      descripcion: e.descripcion || '',
      fecha: e.fecha ? e.fecha.split('T')[0] : '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ comunidadId: '', titulo: '', descripcion: '', fecha: '' });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Eventos</h1><p className="text-sm text-gray-500">{eventos.length} evento(s)</p></div>
        {(user?.rol === 'PROMOTOR' || user?.rol === 'ADMIN') && (
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Evento</Button>
        )}
      </div>

      <div className="space-y-3">
        {eventos.map((e: { id: string; titulo: string; fecha: string; descripcion?: string; comunidad: { nombre: string } }) => (
          <Card key={e.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-purple-50 rounded flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{e.titulo}</p>
                  <p className="text-xs text-gray-500">{e.comunidad.nombre} · {formatDate(e.fecha)}</p>
                  {e.descripcion && <p className="text-sm text-gray-700 mt-1">{e.descripcion}</p>}
                </div>
              </div>
              {(user?.rol === 'PROMOTOR' || user?.rol === 'ADMIN') && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(e)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {eventos.length === 0 && <p className="text-center text-gray-500 py-8">Sin eventos registrados</p>}
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Evento' : 'Nuevo Evento'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Comunidad</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {comunidades.map((c: { id: string; nombre: string; municipio: string }) => <option key={c.id} value={c.id}>{c.nombre} — {c.municipio}</option>)}
              </select>
            </div>
            <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>{upsert.isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
