import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, ESTATUS_CAPACITACION } from '@/lib/utils';
import { ArrowLeft, BookOpen, Calendar, MapPin, User, FileText, Image as ImageIcon } from 'lucide-react';

export default function CapacitacionDetalle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = user?.rol === 'ADMIN';
  const [tab, setTab] = useState<'info' | 'reportes' | 'fotos'>('info');

  const { data: cap, isLoading } = useQuery({
    queryKey: ['capacitacion', id],
    queryFn: () => api.get(`/capacitaciones/${id}`).then((r) => r.data),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!cap) return <p className="text-center py-12 text-gray-500">Capacitación no encontrada</p>;

  const est = ESTATUS_CAPACITACION[cap.estatus];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cap.titulo}</h1>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {cap.comunidad.nombre}, {cap.comunidad.municipio}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={est?.color}>{est?.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="flex gap-2 border-b overflow-x-auto pb-px">
            <button
              onClick={() => setTab('info')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <BookOpen className="h-4 w-4" /> Información General
            </button>
            <button
              onClick={() => setTab('reportes')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'reportes' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <FileText className="h-4 w-4" /> Reportes ({cap.reportes?.length || 0})
            </button>
            <button
              onClick={() => setTab('fotos')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === 'fotos' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <ImageIcon className="h-4 w-4" /> Fotografías ({cap.fotografias?.length || 0})
            </button>
          </div>

          {tab === 'info' && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Descripción</CardTitle></CardHeader>
              <CardContent>
                <p className="text-gray-600 whitespace-pre-wrap">{cap.descripcion || 'Sin descripción detallada.'}</p>
                
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Detalles de la fechas</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-gray-500 text-xs">Fecha de Inicio</p>
                          <p className="font-medium">{formatDate(cap.fechaInicio)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="text-gray-500 text-xs">Fecha de Finalización</p>
                          <p className="font-medium">{formatDate(cap.fechaFin)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-gray-400">Proveedor e Instructores</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-gray-700">
                        <User className="h-4 w-4 text-primary" />
                        <span><strong>Proveedor:</strong> {cap.proveedor?.nombre || 'No asignado'}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500 ml-7">Instructores Asignados:</p>
                        <div className="flex flex-wrap gap-2 ml-7">
                          {cap.instructores?.map((ci: any) => (
                            <Badge key={ci.instructor.id} variant="outline" className="text-[10px] bg-secondary/5 font-normal">
                              {ci.instructor.usuario.nombre}
                            </Badge>
                          ))}
                          {(!cap.instructores || cap.instructores.length === 0) && <span className="text-xs text-gray-400 italic">Ninguno</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'reportes' && (
            <div className="space-y-4">
              {cap.reportes?.length === 0 ? (
                <p className="text-center py-12 text-gray-500 italic">No hay reportes registrados para esta capacitación.</p>
              ) : (
                cap.reportes.map((rep: any) => (
                  <Card key={rep.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-md">{rep.titulo}</CardTitle>
                        <span className="text-xs text-gray-400">{formatDate(rep.createdAt)}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 line-clamp-3">{rep.contenido}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {tab === 'fotos' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {cap.fotografias?.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-500 italic">Sin fotografías registradas.</div>
              ) : (
                cap.fotografias.map((foto: any) => (
                  <div key={foto.id} className="aspect-square rounded-lg overflow-hidden border group relative">
                    <img src={foto.rutaArchivo} alt={foto.nombreOriginal} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                    {foto.descripcion && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white p-2 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {foto.descripcion}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wide text-gray-500">Ubicación</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center text-gray-400 border border-dashed">
                <MapPin className="h-8 w-8" />
              </div>
              <div>
                <p className="font-bold text-gray-900">{cap.comunidad.nombre}</p>
                <p className="text-sm text-gray-500">{cap.comunidad.municipio}, {cap.comunidad.estado}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardHeader><CardTitle className="text-sm font-bold uppercase tracking-wide text-primary">Estado del curso</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 italic">Estatus:</span>
                <span className={`font-bold ${est?.color.replace('bg-', 'text-').split(' ')[0]}`}>{est?.label}</span>
              </div>
              {est && (
                <p className="text-xs text-gray-600 border-l-2 border-primary pl-3">
                  Esta capacitación se encuentra en etapa de <strong>{est.label.toLowerCase()}</strong>. 
                  {cap.estatus === 'PLANEADA' && ' Próximamente comenzarán las actividades.'}
                  {cap.estatus === 'EN_PROGRESO' && ' Actualmente se están impartiendo los módulos.'}
                  {cap.estatus === 'COMPLETADA' && ' Todas las sesiones han concluido satisfactoriamente.'}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
