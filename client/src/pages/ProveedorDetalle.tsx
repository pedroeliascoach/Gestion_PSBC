import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, XCircle, Upload, AlertTriangle } from 'lucide-react';
import { ESTATUS_PAGO } from '@/lib/utils';

export default function ProveedorDetalle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [docFile, setDocFile] = useState<Record<string, File>>({});

  const { data: p, isLoading } = useQuery({
    queryKey: ['proveedor', id],
    queryFn: () => api.get(`/proveedores/${id}`).then((r) => r.data),
  });

  const actualizarReq = useMutation({
    mutationFn: ({ requisitoId, cumplido, observaciones, file }: { requisitoId: string; cumplido: boolean; observaciones?: string; file?: File }) => {
      const fd = new FormData();
      fd.append('cumplido', String(cumplido));
      if (observaciones) fd.append('observaciones', observaciones);
      if (file) fd.append('documento', file);
      return api.patch(`/proveedores/${id}/requisitos/${requisitoId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedor', id] }),
  });

  const actualizarEntregable = useMutation({
    mutationFn: ({ tipo, entregado, estatusPago, file }: { tipo: string; entregado?: boolean; estatusPago?: string; file?: File }) => {
      const fd = new FormData();
      if (entregado !== undefined) fd.append('entregado', String(entregado));
      if (estatusPago) fd.append('estatusPago', estatusPago);
      if (file) fd.append('archivo', file);
      return api.patch(`/proveedores/${id}/entregables/${tipo}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['proveedor', id] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!p) return <p className="text-center py-12 text-gray-500">Proveedor no encontrado</p>;

  const todosCumplidos = p.requisitos.length > 0 && p.requisitos.every((r: { cumplido: boolean }) => r.cumplido);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{p.nombre}</h1>
          <p className="text-sm text-gray-500">RFC: {p.rfc}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${todosCumplidos ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {todosCumplidos ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {todosCumplidos ? 'Listo para iniciar' : 'Requisitos pendientes'}
        </div>
      </div>

      {/* Requisitos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Checklist de Requisitos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {p.requisitos.map((r: { requisitoId: string; cumplido: boolean; observaciones?: string; documento?: string; fechaCumplido?: string; requisito: { nombre: string; descripcion?: string; obligatorio: boolean } }) => (
            <div key={r.requisitoId} className={`p-3 rounded-lg border ${r.cumplido ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {r.cumplido
                    ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  }
                  <div>
                    <p className="text-sm font-medium">{r.requisito.nombre}</p>
                    {r.requisito.descripcion && <p className="text-xs text-gray-500">{r.requisito.descripcion}</p>}
                    {r.observaciones && <p className="text-xs text-gray-600 italic mt-0.5">{r.observaciones}</p>}
                    {r.documento && <a href={r.documento} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">Ver documento</a>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="file"
                    id={`doc-${r.requisitoId}`}
                    className="hidden"
                    onChange={(e) => setDocFile({ ...docFile, [r.requisitoId]: e.target.files![0] })}
                  />
                  <label htmlFor={`doc-${r.requisitoId}`} className="cursor-pointer text-xs text-blue-600 flex items-center gap-1 hover:underline">
                    <Upload className="h-3 w-3" />Doc
                  </label>
                  <Button
                    size="sm"
                    variant={r.cumplido ? 'outline' : 'default'}
                    className={r.cumplido ? 'text-red-600 border-red-200 h-7 text-xs' : 'h-7 text-xs'}
                    onClick={() => actualizarReq.mutate({ requisitoId: r.requisitoId, cumplido: !r.cumplido, file: docFile[r.requisitoId] })}
                  >
                    {r.cumplido ? 'Desmarcar' : 'Marcar cumplido'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Entregables post-conclusión */}
      <Card>
        <CardHeader><CardTitle className="text-base">Entregables de Conclusión</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {p.entregables.map((e: { tipo: string; entregado: boolean; fechaEntrega?: string; rutaArchivo?: string; nombreArchivo?: string; estatusPago: string; observaciones?: string }) => {
            const ep = ESTATUS_PAGO[e.estatusPago];
            return (
              <div key={e.tipo} className={`p-3 rounded-lg border ${e.entregado ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    {e.entregado ? <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" /> : <XCircle className="h-4 w-4 text-gray-400 mt-0.5" />}
                    <div>
                      <p className="text-sm font-medium">{e.tipo === 'REPORTE_FINAL' ? 'Reporte Final' : 'Factura'}</p>
                      {e.rutaArchivo && <a href={e.rutaArchivo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">{e.nombreArchivo}</a>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.entregado && (
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={e.estatusPago}
                        onChange={(ev) => actualizarEntregable.mutate({ tipo: e.tipo, estatusPago: ev.target.value })}
                      >
                        {['PENDIENTE', 'EN_PROCESO', 'PAGADO'].map((s) => (
                          <option key={s} value={s}>{ESTATUS_PAGO[s]?.label}</option>
                        ))}
                      </select>
                    )}
                    <input type="file" id={`ent-${e.tipo}`} className="hidden" onChange={(ev) => {
                      if (ev.target.files?.[0]) actualizarEntregable.mutate({ tipo: e.tipo, entregado: true, file: ev.target.files[0] });
                    }} />
                    <label htmlFor={`ent-${e.tipo}`} className="cursor-pointer">
                      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
                        <span><Upload className="h-3 w-3 mr-1" />{e.entregado ? 'Actualizar' : 'Subir'}</span>
                      </Button>
                    </label>
                  </div>
                </div>
                {e.entregado && ep && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${ep.color}`}>{ep.label}</span>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Capacitaciones y proyectos */}
      {(p.capacitaciones.length > 0 || p.proyectos.length > 0) && (
        <Card>
          <CardHeader><CardTitle className="text-base">Asignaciones</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {p.capacitaciones.map((c: { id: string; titulo: string; comunidad: { nombre: string } }) => (
              <div key={c.id} className="text-xs bg-blue-50 px-2 py-1 rounded">Capacitación: <strong>{c.titulo}</strong> — {c.comunidad.nombre}</div>
            ))}
            {p.proyectos.map((pr: { id: string; nombre: string; comunidad: { nombre: string } }) => (
              <div key={pr.id} className="text-xs bg-orange-50 px-2 py-1 rounded">Proyecto: <strong>{pr.nombre}</strong> — {pr.comunidad.nombre}</div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
