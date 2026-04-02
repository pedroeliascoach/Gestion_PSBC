import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, CheckCircle2, AlertCircle, Upload, 
  Download, Clock, BookOpen, FolderOpen, Building2
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ProveedorDashboard() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);

  const { data: p, isLoading } = useQuery({
    queryKey: ['proveedor-me'],
    queryFn: () => api.get('/proveedores/me').then((r) => r.data),
  });

  const uploadRequisito = useMutation({
    mutationFn: ({ id, file }: { id: string, file: File }) => {
      const formData = new FormData();
      formData.append('documento', file);
      return api.patch(`/proveedores/${p.id}/requisitos/${id}`, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedor-me'] });
      setUploading(null);
    },
  });

  const uploadEntregable = useMutation({
    mutationFn: ({ tipo, file }: { tipo: string, file: File }) => {
      const formData = new FormData();
      formData.append('archivo', file);
      return api.patch(`/proveedores/${p.id}/entregables/${tipo}`, formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proveedor-me'] });
      setUploading(null);
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!p) return <p className="text-center py-12 text-gray-500">Perfil de proveedor no encontrado</p>;

  const totalReq = p.requisitos?.length ?? 0;
  const completedReq = p.requisitos?.filter((r: any) => r.cumplido).length ?? 0;
  const progressPercent = totalReq > 0 ? (completedReq / totalReq) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{p.nombre}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">{p.rfc}</Badge>
            <p className="text-sm text-gray-500">{p.email || 'Sin correo registrado'}</p>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Cumplimiento Legal</p>
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-bold">{Math.round(progressPercent)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Requisitos Legales */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><FileText className="h-5 w-5 text-gray-400" /> Documentación Necesaria</h2>
          <div className="grid grid-cols-1 gap-3">
            {p.requisitos?.map((req: any) => (
              <Card key={req.requisitoId} className={req.cumplido ? 'bg-green-50/30' : ''}>
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 h-2 w-2 rounded-full ${req.cumplido ? 'bg-green-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="font-bold text-sm">{req.requisito.nombre}</p>
                      {req.observaciones && <p className="text-xs text-amber-700 italic">{req.observaciones}</p>}
                      {req.cumplido && (
                        <p className="text-[10px] text-gray-400 mt-1">Validado el {formatDate(req.fechaCumplido)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.documento && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={req.documento} target="_blank" rel="noreferrer">
                          <Download className="h-3.5 w-3.5 mr-1" /> Ver
                        </a>
                      </Button>
                    )}
                    <div className="relative">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUploading(`req-${req.requisitoId}`);
                            uploadRequisito.mutate({ id: req.requisitoId, file });
                          }
                        }}
                        accept=".pdf,image/*"
                      />
                      <Button variant="outline" size="sm" disabled={uploading === `req-${req.requisitoId}`}>
                        <Upload className="h-3.5 w-3.5 mr-1" /> 
                        {uploading === `req-${req.requisitoId}` ? 'Subiendo...' : 'Subir'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Facturas y Reportes */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2"><Building2 className="h-5 w-5 text-gray-400" /> Facturación y Reportes</h2>
          <div className="space-y-3">
            {p.entregables?.map((ent: any) => (
              <Card key={ent.id}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs uppercase tracking-widest text-gray-500">{ent.tipo.replace(/_/g, ' ')}</CardTitle>
                    {ent.entregado ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  {ent.entregado ? (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600 truncate">{ent.nombreArchivo}</p>
                      <Button variant="outline" size="sm" className="w-full h-8" asChild>
                        <a href={ent.rutaArchivo} target="_blank" rel="noreferrer"><Download className="h-3 w-3 mr-2" /> Descargar</a>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">No se ha subido ningún archivo aún.</p>
                  )}
                  
                  <div className="relative mt-2">
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploading(`ent-${ent.tipo}`);
                          uploadEntregable.mutate({ tipo: ent.tipo, file });
                        }
                      }}
                      accept=".pdf,image/*"
                    />
                    <Button variant="secondary" size="sm" className="w-full" disabled={uploading === `ent-${ent.tipo}`}>
                      <Upload className="h-3 w-3 mr-2" /> 
                      {uploading === `ent-${ent.tipo}` ? 'Subiendo...' : 'Actualizar Archivo'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-slate-900 text-white">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">Actividad Asociada</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-bold">{p.capacitaciones?.length ?? 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Capacitaciones</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-sm font-bold">{p.proyectos?.length ?? 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">Proyectos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
