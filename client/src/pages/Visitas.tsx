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
import { Plus, Eye, Camera } from 'lucide-react';

export default function Visitas() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ comunidadId: '', fecha: '', descripcion: '', observaciones: '' });
  const [fotos, setFotos] = useState<File[]>([]);

  const { data: visitas = [], isLoading } = useQuery({
    queryKey: ['visitas'],
    queryFn: () => api.get('/visitas').then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({
    queryKey: ['comunidades'],
    queryFn: () => api.get('/comunidades').then((r) => r.data),
  });

  const crear = useMutation({
    mutationFn: (data: typeof form) => {
      const fd = new FormData();
      Object.entries(data).forEach(([k, v]) => fd.append(k, v));
      fotos.forEach((f) => fd.append('fotos', f));
      return api.post('/visitas', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['visitas'] }); setOpen(false); setFotos([]); setForm({ comunidadId: '', fecha: '', descripcion: '', observaciones: '' }); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Visitas</h1><p className="text-sm text-gray-500">{visitas.length} visita(s)</p></div>
        {(user?.rol === 'PROMOTOR' || user?.rol === 'ADMIN') && (
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Registrar Visita</Button>
        )}
      </div>

      <div className="space-y-3">
        {visitas.map((v: { id: string; fecha: string; descripcion?: string; observaciones?: string; comunidad: { nombre: string; municipio: string }; promotor: { usuario: { nombre: string } }; fotografias: { id: string }[] }) => (
          <Card key={v.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="h-4 w-4 text-green-500" />
                    <p className="font-semibold text-sm">{v.comunidad.nombre}, {v.comunidad.municipio}</p>
                  </div>
                  <p className="text-xs text-gray-500">{formatDate(v.fecha)} · {v.promotor.usuario.nombre}</p>
                  {v.descripcion && <p className="text-sm mt-1 text-gray-700">{v.descripcion}</p>}
                  {v.observaciones && <p className="text-xs mt-1 text-gray-500 italic">{v.observaciones}</p>}
                  {v.fotografias.length > 0 && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <Camera className="h-3 w-3" /> {v.fotografias.length} foto(s)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {visitas.length === 0 && <p className="text-center text-gray-500 py-8">Sin visitas registradas</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registrar Visita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Comunidad</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {comunidades.map((c: { id: string; nombre: string; municipio: string }) => <option key={c.id} value={c.id}>{c.nombre} — {c.municipio}</option>)}
              </select>
            </div>
            <div><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} /></div>
            <div><Label>Observaciones</Label><Textarea value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} rows={2} /></div>
            <div>
              <Label>Fotografías (opcional)</Label>
              <Input type="file" accept="image/*" multiple onChange={(e) => setFotos(Array.from(e.target.files ?? []))} />
              {fotos.length > 0 && <p className="text-xs text-gray-500 mt-1">{fotos.length} archivo(s) seleccionado(s)</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => crear.mutate(form)} disabled={crear.isPending}>{crear.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
