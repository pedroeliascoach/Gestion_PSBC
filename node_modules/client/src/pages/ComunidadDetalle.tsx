import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatCurrency, ETAPAS, ESTATUS_CAPACITACION, ESTATUS_PROYECTO } from '@/lib/utils';
import { ArrowLeft, ArrowRight, BookOpen, FolderOpen, DollarSign, Users, History } from 'lucide-react';

export default function ComunidadDetalle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.rol === 'ADMIN';
  const [etapaDialog, setEtapaDialog] = useState(false);
  const [nuevaEtapa, setNuevaEtapa] = useState('');
  const [tab, setTab] = useState<'capacitaciones' | 'proyectos' | 'presupuesto' | 'historial'>('capacitaciones');

  const { data: c, isLoading } = useQuery({
    queryKey: ['comunidad', id],
    queryFn: () => api.get(`/comunidades/${id}`).then((r) => r.data),
  });

  const cambiarEtapa = useMutation({
    mutationFn: () => api.patch(`/comunidades/${id}/etapa`, { etapa: parseInt(nuevaEtapa) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comunidad', id] }); setEtapaDialog(false); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!c) return <p className="text-center py-12 text-gray-500">Comunidad no encontrada</p>;

  const etapa = ETAPAS[c.etapaActual];
  const presupuestoTotal = c.presupuestos?.reduce((s: number, p: { monto: string; gastos: { monto: string }[] }) => s + Number(p.monto), 0) ?? 0;
  const gastadoTotal = c.presupuestos?.reduce((s: number, p: { monto: string; gastos: { monto: string }[] }) => s + p.gastos.reduce((gs: number, g: { monto: string }) => gs + Number(g.monto), 0), 0) ?? 0;

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{c.nombre}</h1>
          <p className="text-sm text-gray-500">{c.municipio}, {c.estado}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${etapa?.color}`}>{etapa?.label}</span>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEtapaDialog(true)}>
            <ArrowRight className="h-3 w-3 mr-1" /> Avanzar Etapa
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{c.capacitaciones?.length ?? 0}</p><p className="text-xs text-gray-500">Capacitaciones</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{c.proyectos?.length ?? 0}</p><p className="text-xs text-gray-500">Proyectos</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xl font-bold">{c.visitas?.length ?? 0}</p><p className="text-xs text-gray-500">Visitas</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm font-bold">{formatCurrency(gastadoTotal)}</p><p className="text-xs text-gray-500">Gastado</p></CardContent></Card>
      </div>

      {/* Promotores */}
      {c.promotores?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4" /> Promotores Asignados</CardTitle></CardHeader>
          <CardContent className="pt-0 flex gap-2 flex-wrap">
            {c.promotores.map((cp: { promotor: { id: string; usuario: { nombre: string; email: string } } }) => (
              <span key={cp.promotor.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                {cp.promotor.usuario.nombre}
              </span>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([['capacitaciones', 'Capacitaciones', BookOpen], ['proyectos', 'Proyectos', FolderOpen], ['presupuesto', 'Presupuesto', DollarSign], ['historial', 'Historial Etapas', History]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1 px-3 py-2 text-sm border-b-2 transition-colors ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <Icon className="h-3.5 w-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'capacitaciones' && (
        <div className="space-y-2">
          {c.capacitaciones?.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">Sin capacitaciones registradas</p> : null}
          {c.capacitaciones?.map((cap: { id: string; titulo: string; estatus: string; fechaInicio?: string; proveedor?: { nombre: string } }) => {
            const est = ESTATUS_CAPACITACION[cap.estatus];
            return (
              <div key={cap.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{cap.titulo}</p>
                  <p className="text-xs text-gray-500">{formatDate(cap.fechaInicio)} · {cap.proveedor?.nombre ?? 'Sin proveedor'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${est?.color}`}>{est?.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'proyectos' && (
        <div className="space-y-2">
          {c.proyectos?.length === 0 ? <p className="text-sm text-gray-500 text-center py-6">Sin proyectos registrados</p> : null}
          {c.proyectos?.map((proy: { id: string; nombre: string; estatus: string; fechaInicio?: string; presupuesto?: string; proveedor?: { nombre: string } }) => {
            const est = ESTATUS_PROYECTO[proy.estatus];
            return (
              <div key={proy.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{proy.nombre}</p>
                  <p className="text-xs text-gray-500">{formatDate(proy.fechaInicio)} · {proy.proveedor?.nombre ?? 'Sin proveedor'} · {formatCurrency(Number(proy.presupuesto))}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${est?.color}`}>{est?.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'presupuesto' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-3 text-center"><p className="font-bold">{formatCurrency(presupuestoTotal)}</p><p className="text-xs text-gray-500">Asignado</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="font-bold text-red-600">{formatCurrency(gastadoTotal)}</p><p className="text-xs text-gray-500">Gastado</p></CardContent></Card>
            <Card><CardContent className="p-3 text-center"><p className="font-bold text-green-600">{formatCurrency(presupuestoTotal - gastadoTotal)}</p><p className="text-xs text-gray-500">Disponible</p></CardContent></Card>
          </div>
          {c.presupuestos?.map((p: { id: string; anio: number; monto: string; gastos: { id: string; concepto: string; monto: string; fecha: string }[] }) => (
            <Card key={p.id}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Año {p.anio} — {formatCurrency(Number(p.monto))}</CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-1">
                {p.gastos.map((g) => (
                  <div key={g.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                    <span>{g.concepto}</span>
                    <span className="font-medium">{formatCurrency(Number(g.monto))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'historial' && (
        <div className="space-y-2">
          {c.historicoEtapas?.map((h: { id: string; etapa: number; fechaInicio: string; fechaFin?: string }) => (
            <div key={h.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ETAPAS[h.etapa]?.color}`}>{ETAPAS[h.etapa]?.label}</span>
              <span className="text-xs text-gray-500">{formatDate(h.fechaInicio)} → {h.fechaFin ? formatDate(h.fechaFin) : 'Actual'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Cambiar etapa dialog */}
      <Dialog open={etapaDialog} onOpenChange={setEtapaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Cambiar Etapa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Etapa actual: <strong>{ETAPAS[c.etapaActual]?.label}</strong></p>
            <Label>Nueva Etapa</Label>
            <select className="w-full border rounded-md px-3 py-2 text-sm" value={nuevaEtapa} onChange={(e) => setNuevaEtapa(e.target.value)}>
              <option value="">Seleccionar...</option>
              {[1, 2, 3, 4].filter((e) => e !== c.etapaActual).map((e) => (
                <option key={e} value={e}>{ETAPAS[e]?.label}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEtapaDialog(false)}>Cancelar</Button>
            <Button onClick={() => cambiarEtapa.mutate()} disabled={!nuevaEtapa || cambiarEtapa.isPending}>
              {cambiarEtapa.isPending ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
