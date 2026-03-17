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
import { Plus, FileText } from 'lucide-react';

const TIPOS = ['VISITA', 'CAPACITACION', 'PROYECTO', 'GENERAL'];
const TIPO_LABELS: Record<string, string> = { VISITA: 'Visita', CAPACITACION: 'Capacitación', PROYECTO: 'Proyecto', GENERAL: 'General' };

export default function Reportes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tipoFilter, setTipoFilter] = useState('');
  const [form, setForm] = useState({ titulo: '', contenido: '', tipo: 'GENERAL', comunidadId: '', capacitacionId: '', proyectoId: '', porcentajeAvance: '', temasImpartidos: '', asistentes: '' });

  const { data: reportes = [], isLoading } = useQuery({
    queryKey: ['reportes', tipoFilter],
    queryFn: () => api.get('/reportes', { params: tipoFilter ? { tipo: tipoFilter } : {} }).then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({ queryKey: ['comunidades'], queryFn: () => api.get('/comunidades').then((r) => r.data) });
  const { data: capacitaciones = [] } = useQuery({ queryKey: ['capacitaciones'], queryFn: () => api.get('/capacitaciones').then((r) => r.data) });
  const { data: proyectos = [] } = useQuery({ queryKey: ['proyectos'], queryFn: () => api.get('/proyectos').then((r) => r.data) });

  const crear = useMutation({
    mutationFn: (data: typeof form) => api.post('/reportes', {
      ...data,
      comunidadId: data.comunidadId || null,
      capacitacionId: data.capacitacionId || null,
      proyectoId: data.proyectoId || null,
      porcentajeAvance: data.porcentajeAvance ? parseInt(data.porcentajeAvance) : null,
      asistentes: data.asistentes ? parseInt(data.asistentes) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reportes'] }); setOpen(false); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Reportes</h1><p className="text-sm text-gray-500">{reportes.length} reporte(s)</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Reporte</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={!tipoFilter ? 'default' : 'outline'} size="sm" onClick={() => setTipoFilter('')}>Todos</Button>
        {TIPOS.map((t) => <Button key={t} variant={tipoFilter === t ? 'default' : 'outline'} size="sm" onClick={() => setTipoFilter(t)}>{TIPO_LABELS[t]}</Button>)}
      </div>

      <div className="space-y-3">
        {reportes.map((r: { id: string; titulo: string; tipo: string; contenido: string; comunidad?: { nombre: string }; createdAt: string; porcentajeAvance?: number; asistentes?: number }) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 bg-blue-50 rounded flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className="font-semibold text-sm">{r.titulo}</p>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">{TIPO_LABELS[r.tipo]}</span>
                  </div>
                  {r.comunidad && <p className="text-xs text-gray-500">{r.comunidad.nombre}</p>}
                  <p className="text-sm text-gray-700 mt-1 line-clamp-2">{r.contenido}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatDate(r.createdAt)}</span>
                    {r.porcentajeAvance != null && <span>Avance: {r.porcentajeAvance}%</span>}
                    {r.asistentes != null && <span>Asistentes: {r.asistentes}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {reportes.length === 0 && <p className="text-center text-gray-500 py-8">Sin reportes registrados</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Reporte</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <div><Label>Título</Label><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
              </select>
            </div>
            <div><Label>Contenido</Label><Textarea value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} rows={4} /></div>
            <div>
              <Label>Comunidad (opcional)</Label>
              <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.comunidadId} onChange={(e) => setForm({ ...form, comunidadId: e.target.value })}>
                <option value="">Ninguna</option>
                {comunidades.map((c: { id: string; nombre: string }) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            {form.tipo === 'CAPACITACION' && (
              <>
                <div>
                  <Label>Capacitación</Label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.capacitacionId} onChange={(e) => setForm({ ...form, capacitacionId: e.target.value })}>
                    <option value="">Ninguna</option>
                    {capacitaciones.map((c: { id: string; titulo: string }) => <option key={c.id} value={c.id}>{c.titulo}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>% Avance</Label><Input type="number" min="0" max="100" value={form.porcentajeAvance} onChange={(e) => setForm({ ...form, porcentajeAvance: e.target.value })} /></div>
                  <div><Label>Asistentes</Label><Input type="number" value={form.asistentes} onChange={(e) => setForm({ ...form, asistentes: e.target.value })} /></div>
                </div>
                <div><Label>Temas Impartidos</Label><Textarea value={form.temasImpartidos} onChange={(e) => setForm({ ...form, temasImpartidos: e.target.value })} rows={2} /></div>
              </>
            )}
            {form.tipo === 'PROYECTO' && (
              <div>
                <Label>Proyecto</Label>
                <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.proyectoId} onChange={(e) => setForm({ ...form, proyectoId: e.target.value })}>
                  <option value="">Ninguno</option>
                  {proyectos.map((p: { id: string; nombre: string }) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}
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
