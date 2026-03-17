import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { Plus, DollarSign, TrendingDown } from 'lucide-react';

export default function Presupuesto() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [openGasto, setOpenGasto] = useState<string | null>(null);
  const [form, setForm] = useState({ comunidadId: '', anio: new Date().getFullYear().toString(), monto: '', descripcion: '' });
  const [gastoForm, setGastoForm] = useState({ concepto: '', monto: '', fecha: '', proveedorId: '' });
  const [anioFilter, setAnioFilter] = useState(new Date().getFullYear().toString());

  const { data: presupuestos = [], isLoading } = useQuery({
    queryKey: ['presupuesto', anioFilter],
    queryFn: () => api.get('/presupuesto', { params: { anio: anioFilter } }).then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({ queryKey: ['comunidades'], queryFn: () => api.get('/comunidades').then((r) => r.data) });
  const { data: proveedores = [] } = useQuery({ queryKey: ['proveedores'], queryFn: () => api.get('/proveedores').then((r) => r.data) });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/presupuesto', { ...data, anio: parseInt(data.anio), monto: Number(data.monto) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuesto'] }); setOpenNew(false); setForm({ comunidadId: '', anio: new Date().getFullYear().toString(), monto: '', descripcion: '' }); },
  });

  const crearGasto = useMutation({
    mutationFn: ({ presupuestoId, data }: { presupuestoId: string; data: typeof gastoForm }) =>
      api.post(`/presupuesto/${presupuestoId}/gastos`, { ...data, monto: Number(data.monto), proveedorId: data.proveedorId || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['presupuesto'] }); setOpenGasto(null); setGastoForm({ concepto: '', monto: '', fecha: '', proveedorId: '' }); },
  });

  const totalAsignado = presupuestos.reduce((s: number, p: { monto: number }) => s + Number(p.monto), 0);
  const totalGastado = presupuestos.reduce((s: number, p: { gastado: number }) => s + Number(p.gastado), 0);
  const pct = totalAsignado > 0 ? Math.round((totalGastado / totalAsignado) * 100) : 0;

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Control Presupuestal</h1></div>
        <div className="flex gap-2">
          <Input type="number" value={anioFilter} onChange={(e) => setAnioFilter(e.target.value)} className="w-24" />
          <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Asignar</Button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-blue-600">{formatCurrency(totalAsignado)}</p><p className="text-xs text-gray-500">Total Asignado</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-red-600">{formatCurrency(totalGastado)}</p><p className="text-xs text-gray-500">Total Gastado</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xl font-bold text-green-600">{formatCurrency(totalAsignado - totalGastado)}</p><p className="text-xs text-gray-500">Disponible ({pct}% ejecutado)</p></CardContent></Card>
      </div>

      {/* Por comunidad */}
      <div className="space-y-3">
        {presupuestos.map((p: { id: string; anio: number; monto: number; gastado: number; saldo: number; descripcion?: string; comunidad: { nombre: string; municipio: string }; gastos: { id: string; concepto: string; monto: number; fecha: string; proveedor?: { nombre: string } }[] }) => {
          const pct2 = Number(p.monto) > 0 ? Math.round((Number(p.gastado) / Number(p.monto)) * 100) : 0;
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.comunidad.nombre} <span className="text-gray-400 font-normal text-xs">— {p.comunidad.municipio}</span></CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setOpenGasto(p.id)}>
                    <TrendingDown className="h-3 w-3 mr-1" />Registrar Gasto
                  </Button>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>Asignado: <strong>{formatCurrency(Number(p.monto))}</strong></span>
                  <span>Gastado: <strong className="text-red-600">{formatCurrency(Number(p.gastado))}</strong></span>
                  <span>Disponible: <strong className="text-green-600">{formatCurrency(Number(p.saldo))}</strong></span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(pct2, 100)}%` }} />
                </div>
              </CardHeader>
              {p.gastos.length > 0 && (
                <CardContent className="pt-0">
                  <div className="space-y-1">
                    {p.gastos.map((g) => (
                      <div key={g.id} className="flex justify-between items-center text-xs py-1 border-b last:border-0">
                        <span>{g.concepto}{g.proveedor && ` (${g.proveedor.nombre})`}</span>
                        <span className="font-medium text-red-600">{formatCurrency(Number(g.monto))}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
        {presupuestos.length === 0 && <p className="text-center text-gray-500 py-8">Sin presupuestos asignados para {anioFilter}</p>}
      </div>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Presupuesto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Comunidad</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {comunidades.map((c: { id: string; nombre: string; municipio: string }) => <option key={c.id} value={c.id}>{c.nombre} — {c.municipio}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Año</Label><Input type="number" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} /></div>
              <div><Label>Monto (MXN)</Label><Input type="number" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} /></div>
            </div>
            <div><Label>Descripción (opcional)</Label><Input value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={() => crear.mutate(form)} disabled={crear.isPending}>{crear.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openGasto} onOpenChange={() => setOpenGasto(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Gasto</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Concepto</Label><Input value={gastoForm.concepto} onChange={(e) => setGastoForm({ ...gastoForm, concepto: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Monto (MXN)</Label><Input type="number" value={gastoForm.monto} onChange={(e) => setGastoForm({ ...gastoForm, monto: e.target.value })} /></div>
              <div><Label>Fecha</Label><Input type="date" value={gastoForm.fecha} onChange={(e) => setGastoForm({ ...gastoForm, fecha: e.target.value })} /></div>
            </div>
            <div>
              <Label>Proveedor (opcional)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={gastoForm.proveedorId} onChange={(e) => setGastoForm({ ...gastoForm, proveedorId: e.target.value })}>
                <option value="">Ninguno</option>
                {proveedores.map((p: { id: string; nombre: string }) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenGasto(null)}>Cancelar</Button>
            <Button onClick={() => crearGasto.mutate({ presupuestoId: openGasto!, data: gastoForm })} disabled={crearGasto.isPending}>{crearGasto.isPending ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
