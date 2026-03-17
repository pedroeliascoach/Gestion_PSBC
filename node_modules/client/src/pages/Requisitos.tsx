import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2 } from 'lucide-react';

export default function Requisitos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState<{ id: string; nombre: string; descripcion: string; obligatorio: boolean; orden: number } | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', obligatorio: true, orden: 0 });

  const { data: requisitos = [], isLoading } = useQuery({
    queryKey: ['requisitos'],
    queryFn: () => api.get('/requisitos-catalogo').then((r) => r.data),
  });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/requisitos-catalogo', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requisitos'] }); setOpen(false); },
  });

  const actualizar = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.patch(`/requisitos-catalogo/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requisitos'] }); setEditItem(null); },
  });

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/requisitos-catalogo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requisitos'] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Catálogo de Requisitos</h1><p className="text-sm text-gray-500">Requisitos para proveedores</p></div>
        <Button onClick={() => { setForm({ nombre: '', descripcion: '', obligatorio: true, orden: requisitos.length + 1 }); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />Nuevo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {requisitos.map((r: { id: string; nombre: string; descripcion?: string; obligatorio: boolean; orden: number }, idx: number) => (
              <div key={r.id} className="flex items-center gap-3 p-3">
                <span className="text-sm font-medium text-gray-400 w-6 text-center">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.nombre}</p>
                  {r.descripcion && <p className="text-xs text-gray-500">{r.descripcion}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.obligatorio ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {r.obligatorio ? 'Obligatorio' : 'Opcional'}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditItem({ ...r, descripcion: r.descripcion ?? '' }); setForm({ nombre: r.nombre, descripcion: r.descripcion ?? '', obligatorio: r.obligatorio, orden: r.orden }); }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => eliminar.mutate(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {requisitos.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">Sin requisitos configurados</p>}
          </div>
        </CardContent>
      </Card>

      <Dialog open={open || !!editItem} onOpenChange={(v) => { if (!v) { setOpen(false); setEditItem(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Editar Requisito' : 'Nuevo Requisito'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>Descripción</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="oblig" checked={form.obligatorio} onChange={(e) => setForm({ ...form, obligatorio: e.target.checked })} />
              <Label htmlFor="oblig">Obligatorio</Label>
            </div>
            <div><Label>Orden</Label><Input type="number" value={form.orden} onChange={(e) => setForm({ ...form, orden: parseInt(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setEditItem(null); }}>Cancelar</Button>
            <Button
              onClick={() => editItem ? actualizar.mutate({ id: editItem.id, data: form }) : crear.mutate(form)}
              disabled={crear.isPending || actualizar.isPending}
            >
              {crear.isPending || actualizar.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
