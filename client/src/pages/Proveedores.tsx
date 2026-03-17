import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, XCircle, Upload, FileText, AlertTriangle } from 'lucide-react';
import { ESTATUS_PAGO } from '@/lib/utils';
import { Link } from 'react-router-dom';

export default function Proveedores() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', rfc: '', contacto: '', telefono: '', email: '', instructorId: '' });

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['proveedores'],
    queryFn: () => api.get('/proveedores').then((r) => r.data),
  });

  const { data: instructores = [] } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => api.get('/instructores').then((r) => r.data),
  });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/proveedores', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proveedores'] }); setOpen(false); setForm({ nombre: '', rfc: '', contacto: '', telefono: '', email: '', instructorId: '' }); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Proveedores</h1><p className="text-sm text-gray-500">{proveedores.length} proveedor(es)</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo</Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {proveedores.map((p: {
          id: string; nombre: string; rfc: string; contacto?: string; telefono?: string; email?: string; activo: boolean;
          cumplimientoCompleto: boolean; totalRequisitos: number; requisitosCompletos: number;
          entregables: { tipo: string; entregado: boolean; estatusPago: string }[];
          _count: { capacitaciones: number; proyectos: number };
        }) => (
          <Card key={p.id} className={!p.activo ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{p.nombre}</CardTitle>
                <div className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${p.cumplimientoCompleto ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {p.cumplimientoCompleto ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {p.cumplimientoCompleto ? 'Listo' : `${p.requisitosCompletos}/${p.totalRequisitos}`}
                </div>
              </div>
              <p className="text-xs text-gray-500">RFC: {p.rfc}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex gap-2 text-xs text-gray-500">
                {p.telefono && <span>{p.telefono}</span>}
                {p.email && <span>{p.email}</span>}
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {p.entregables.map((e) => {
                  const ep = ESTATUS_PAGO[e.estatusPago];
                  return (
                    <div key={e.tipo} className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
                      {e.entregado ? <CheckCircle className="h-3 w-3 text-green-500" /> : <XCircle className="h-3 w-3 text-gray-400" />}
                      <span>{e.tipo === 'REPORTE_FINAL' ? 'Reporte' : 'Factura'}</span>
                      {e.entregado && ep && <span className={`text-xs px-1 rounded ${ep.color}`}>{ep.label}</span>}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <p className="text-xs text-gray-500 flex-1">{p._count.capacitaciones} cap. · {p._count.proyectos} proy.</p>
                <Link to={`/proveedores/${p.id}`}>
                  <Button variant="outline" size="sm">Ver detalle</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nuevo Proveedor</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre / Razón Social</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            <div><Label>RFC</Label><Input value={form.rfc} onChange={(e) => setForm({ ...form, rfc: e.target.value })} /></div>
            <div>
              <Label>Vincular con Instructor (opcional)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
                <option value="">Sin vínculo</option>
                {(instructores as { id: string; usuario: { nombre: string } }[]).map((i) => (
                  <option key={i.id} value={i.id}>{i.usuario.nombre}</option>
                ))}
              </select>
            </div>
            <div><Label>Contacto</Label><Input value={form.contacto} onChange={(e) => setForm({ ...form, contacto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Teléfono</Label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
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
