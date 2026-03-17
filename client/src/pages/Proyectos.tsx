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
import { formatDate, formatCurrency, ESTATUS_PROYECTO } from '@/lib/utils';
import { Plus, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Proyectos() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.rol === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [estatusFilter, setEstatusFilter] = useState('');
  const [form, setForm] = useState({
    nombre: '', descripcion: '', comunidadId: '', proveedorId: '',
    fechaInicio: '', fechaFin: '', presupuesto: '',
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['proyectos', estatusFilter],
    queryFn: () => api.get('/proyectos', { params: estatusFilter ? { estatus: estatusFilter } : {} }).then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({ queryKey: ['comunidades'], queryFn: () => api.get('/comunidades').then((r) => r.data), enabled: isAdmin });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: () => api.get('/proveedores').then((r) => r.data), enabled: isAdmin });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/proyectos', { ...data, presupuesto: data.presupuesto ? Number(data.presupuesto) : null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proyectos'] }); setOpen(false); },
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({ id, estatus }: { id: string; estatus: string }) => api.patch(`/proyectos/${id}/estatus`, { estatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proyectos'] }),
    onError: (err: unknown) => alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error'),
  });

  const estatuses = ['PLANEADO', 'EN_EJECUCION', 'COMPLETADO', 'CANCELADO'];

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Proyectos</h1><p className="text-sm text-gray-500">{items.length} proyecto(s)</p></div>
        {isAdmin && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo</Button>}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!estatusFilter ? 'default' : 'outline'} size="sm" onClick={() => setEstatusFilter('')}>Todos</Button>
        {estatuses.map((e) => (
          <Button key={e} variant={estatusFilter === e ? 'default' : 'outline'} size="sm" onClick={() => setEstatusFilter(e)}>
            {ESTATUS_PROYECTO[e]?.label}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((proy: { id: string; nombre: string; estatus: string; fechaInicio?: string; fechaFin?: string; presupuesto?: string; comunidad: { nombre: string; municipio: string }; proveedor?: { nombre: string } }) => {
          const est = ESTATUS_PROYECTO[proy.estatus];
          return (
            <Card key={proy.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FolderOpen className="h-4 w-4 text-orange-500 flex-shrink-0" />
                      <p className="font-semibold text-sm">{proy.nombre}</p>
                    </div>
                    <p className="text-xs text-gray-500">{proy.comunidad.nombre}, {proy.comunidad.municipio}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(proy.fechaInicio)} – {formatDate(proy.fechaFin)}
                      {proy.proveedor && ` · ${proy.proveedor.nombre}`}
                      {proy.presupuesto && ` · ${formatCurrency(Number(proy.presupuesto))}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${est?.color}`}>{est?.label}</span>
                    {isAdmin && proy.estatus !== 'COMPLETADO' && proy.estatus !== 'CANCELADO' && (
                      <select className="text-xs border rounded px-2 py-1" value="" onChange={(e) => { if (e.target.value) cambiarEstatus.mutate({ id: proy.id, estatus: e.target.value }); }}>
                        <option value="">Cambiar estatus</option>
                        {estatuses.filter((s) => s !== proy.estatus).map((s) => <option key={s} value={s}>{ESTATUS_PROYECTO[s]?.label}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {items.length === 0 && <p className="text-center text-gray-500 py-8">Sin proyectos registrados</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Proyecto</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
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
            <div><Label>Presupuesto (MXN)</Label><Input type="number" value={form.presupuesto} onChange={(e) => setForm({ ...form, presupuesto: e.target.value })} placeholder="0.00" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Fecha Inicio</Label><Input type="date" value={form.fechaInicio} onChange={(e) => setForm({ ...form, fechaInicio: e.target.value })} /></div>
              <div><Label>Fecha Fin</Label><Input type="date" value={form.fechaFin} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} /></div>
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
