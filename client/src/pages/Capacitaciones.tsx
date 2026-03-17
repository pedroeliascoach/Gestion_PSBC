import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, ESTATUS_CAPACITACION } from '@/lib/utils';
import { Plus, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Capacitaciones() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.rol === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [estatusFilter, setEstatusFilter] = useState('');
  const [form, setForm] = useState({
    titulo: '', descripcion: '', comunidadId: '', proveedorId: '',
    fechaInicio: '', fechaFin: '', instructorIds: [] as string[],
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['capacitaciones', estatusFilter],
    queryFn: () => api.get('/capacitaciones', { params: estatusFilter ? { estatus: estatusFilter } : {} }).then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({
    queryKey: ['comunidades'],
    queryFn: () => api.get('/comunidades').then((r) => r.data),
    enabled: isAdmin,
  });

  const { data: instructores = [] } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => api.get('/instructores').then((r) => r.data),
    enabled: isAdmin,
  });

  const { data: proveedores = [] } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => api.get('/proveedores').then((r) => r.data),
    enabled: isAdmin,
  });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/capacitaciones', { ...data, instructorIds: form.instructorIds }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['capacitaciones'] }); setOpen(false); },
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) => api.patch(`/capacitaciones/${id}/estatus`, { estatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['capacitaciones'] }),
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al cambiar estatus';
      alert(msg);
    },
  });

  const estatuses = ['PLANEADA', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Capacitaciones</h1><p className="text-sm text-gray-500">{items.length} capacitación(es)</p></div>
        {isAdmin && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nueva</Button>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!estatusFilter ? 'default' : 'outline'} size="sm" onClick={() => setEstatusFilter('')}>Todas</Button>
        {estatuses.map((e) => (
          <Button key={e} variant={estatusFilter === e ? 'default' : 'outline'} size="sm" onClick={() => setEstatusFilter(e)}>
            {ESTATUS_CAPACITACION[e]?.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((cap: {
          id: string; titulo: string; estatus: string; fechaInicio?: string; fechaFin?: string;
          comunidad: { nombre: string; municipio: string };
          proveedor?: { nombre: string };
          instructores: { instructor: { usuario: { nombre: string } } }[];
        }) => {
          const est = ESTATUS_CAPACITACION[cap.estatus];
          return (
            <Card key={cap.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <Link to={`/capacitaciones/${cap.id}`} className="font-semibold text-sm hover:text-blue-600">{cap.titulo}</Link>
                    </div>
                    <p className="text-xs text-gray-500">{cap.comunidad.nombre}, {cap.comunidad.municipio}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(cap.fechaInicio)} – {formatDate(cap.fechaFin)}
                      {cap.proveedor && ` · ${cap.proveedor.nombre}`}
                    </p>
                    {cap.instructores.length > 0 && (
                      <p className="text-xs text-blue-600 mt-0.5">
                        Instructores: {cap.instructores.map((ci) => ci.instructor.usuario.nombre).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${est?.color}`}>{est?.label}</span>
                    {isAdmin && cap.estatus !== 'COMPLETADA' && cap.estatus !== 'CANCELADA' && (
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value=""
                        onChange={(e) => { if (e.target.value) cambiarEstatus.mutate({ id: cap.id, estatus: e.target.value }); }}
                      >
                        <option value="">Cambiar estatus</option>
                        {estatuses.filter((s) => s !== cap.estatus).map((s) => (
                          <option key={s} value={s}>{ESTATUS_CAPACITACION[s]?.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-center text-gray-500 py-8">Sin capacitaciones registradas</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Capacitación</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div><Label>Descripción</Label><Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
            <div>
              <Label>Comunidad</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {comunidades.map((c: { id: string; nombre: string; municipio: string }) => <option key={c.id} value={c.id}>{c.nombre} — {c.municipio}</option>)}
              </select>
            </div>
            <div>
              <Label>Proveedor (opcional)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.proveedorId} onChange={(e) => setForm({ ...form, proveedorId: e.target.value })}>
                <option value="">Sin proveedor</option>
                {proveedores.map((p: { id: string; nombre: string }) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Fecha Inicio</Label><Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} /></div>
              <div><Label>Fecha Fin</Label><Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} /></div>
            </div>
            <div>
              <Label>Instructores</Label>
              <div className="space-y-1 mt-1 max-h-32 overflow-y-auto border rounded-md p-2">
                {instructores.map((i: { id: string; usuario: { nombre: string } }) => (
                  <label key={i.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.instructorIds.includes(i.id)}
                      onChange={(e) => setForm({ ...form, instructorIds: e.target.checked ? [...form.instructorIds, i.id] : form.instructorIds.filter((x) => x !== i.id) })}
                    />
                    {i.usuario.nombre}
                  </label>
                ))}
              </div>
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
