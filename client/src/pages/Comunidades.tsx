import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, ETAPAS } from '@/lib/utils';
import { Plus, MapPin, ArrowRight, Users, BookOpen, FolderOpen, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Comunidades() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.rol === 'ADMIN';
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [etapaFilter, setEtapaFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ 
    nombre: '', municipio: '', fechaIngreso: '', 
    latitud: '', longitud: '', habitantes: '', 
    infraestructura: '', recursosNaturales: '', economia: '', cultura: '',
    grupoDesarrolloFormado: false, fechaConstitucionGrupo: ''
  });

  const { data: comunidades = [], isLoading } = useQuery({
    queryKey: ['comunidades', etapaFilter],
    queryFn: () => api.get('/comunidades', { params: etapaFilter ? { etapa: etapaFilter } : {} }).then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (data: typeof form) => 
      editingId 
        ? api.patch(`/comunidades/${editingId}`, data)
        : api.post('/comunidades', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comunidades'] });
      handleClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error;
      setError(typeof msg === 'string' ? msg : 'Error al guardar los datos. Por favor revise los campos.');
    }
  });

  const handleEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      municipio: c.municipio,
      fechaIngreso: c.fechaIngreso ? c.fechaIngreso.split('T')[0] : '',
      latitud: c.latitud?.toString() || '',
      longitud: c.longitud?.toString() || '',
      habitantes: c.habitantes?.toString() || '',
      infraestructura: c.infraestructura || '',
      recursosNaturales: c.recursosNaturales || '',
      economia: c.economia || '',
      cultura: c.cultura || '',
      grupoDesarrolloFormado: c.grupoDesarrolloFormado || false,
      fechaConstitucionGrupo: c.fechaConstitucionGrupo ? c.fechaConstitucionGrupo.split('T')[0] : '',
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    setError(null);
    setForm({ 
      nombre: '', municipio: '', fechaIngreso: '', 
      latitud: '', longitud: '', habitantes: '', 
      infraestructura: '', recursosNaturales: '', economia: '', cultura: '',
      grupoDesarrolloFormado: false, fechaConstitucionGrupo: ''
    });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comunidades</h1>
          <p className="text-sm text-gray-500">{comunidades.length} comunidad(es) registrada(s)</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nueva Comunidad
          </Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={etapaFilter === '' ? 'default' : 'outline'} size="sm" onClick={() => setEtapaFilter('')}>Todas</Button>
        {[1, 2, 3, 4].map((e) => (
          <Button
            key={e}
            variant={etapaFilter === String(e) ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEtapaFilter(String(e))}
          >
            {ETAPAS[e]?.label}
          </Button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {comunidades.map((c: {
          id: string; nombre: string; municipio: string; estado: string;
          etapaActual: number; activa: boolean; fechaIngreso: string;
          _count?: { capacitaciones: number; proyectos: number; visitas: number };
        }) => {
          const etapa = ETAPAS[c.etapaActual];
          return (
            <Card key={c.id} className={!c.activa ? 'opacity-60' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <CardTitle className="text-base">{c.nombre}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!c.activa && <Badge className="bg-gray-100 text-gray-600 text-xs">Egresada</Badge>}
                  </div>
                </div>
                <p className="text-sm text-gray-500">{c.municipio}, {c.estado}</p>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <span className={`inline-flex items-center text-xs px-2 py-1 rounded-full font-medium ${etapa?.color}`}>
                  {etapa?.label}
                </span>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {c._count?.capacitaciones ?? 0} cap.</span>
                  <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" /> {c._count?.proyectos ?? 0} proy.</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c._count?.visitas ?? 0} vis.</span>
                </div>
                <p className="text-xs text-gray-400">Ingreso: {formatDate(c.fechaIngreso)}</p>
                <Link to={`/comunidades/${c.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Ver detalle <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Comunidad' : 'Nueva Comunidad'}</DialogTitle></DialogHeader>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-xs">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div>
                <Label>Municipio</Label>
                <Input value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha Ingreso</Label>
                <Input type="date" value={form.fechaIngreso} onChange={(e) => setForm({ ...form, fechaIngreso: e.target.value })} />
              </div>
              <div>
                <Label>Habitantes</Label>
                <Input type="number" value={form.habitantes} onChange={(e) => setForm({ ...form, habitantes: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Latitud</Label>
                <Input type="number" step="any" value={form.latitud} onChange={(e) => setForm({ ...form, latitud: e.target.value })} />
              </div>
              <div>
                <Label>Longitud</Label>
                <Input type="number" step="any" value={form.longitud} onChange={(e) => setForm({ ...form, longitud: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Recursos Naturales</Label>
                <Input value={form.recursosNaturales} onChange={(e) => setForm({ ...form, recursosNaturales: e.target.value })} />
              </div>
              <div>
                <Label>Economía Local</Label>
                <Input value={form.economia} onChange={(e) => setForm({ ...form, economia: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Cultura y Tradiciones</Label>
              <Input value={form.cultura} onChange={(e) => setForm({ ...form, cultura: e.target.value })} />
            </div>
            <div>
              <Label>Infraestructura y Servicios</Label>
              <Input value={form.infraestructura} onChange={(e) => setForm({ ...form, infraestructura: e.target.value })} />
            </div>
            <div className="flex items-center gap-2 py-2">
              <input 
                type="checkbox" 
                id="grupoFormado"
                checked={form.grupoDesarrolloFormado} 
                onChange={(e) => setForm({ ...form, grupoDesarrolloFormado: e.target.checked })} 
              />
              <Label htmlFor="grupoFormado">¿Grupo de Desarrollo formado?</Label>
            </div>
            {form.grupoDesarrolloFormado && (
              <div>
                <Label>Fecha de Constitución del Grupo</Label>
                <Input type="date" value={form.fechaConstitucionGrupo} onChange={(e) => setForm({ ...form, fechaConstitucionGrupo: e.target.value })} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>
              {upsert.isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
