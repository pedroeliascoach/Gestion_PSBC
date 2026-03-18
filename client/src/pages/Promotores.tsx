import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, MapPin, Mail, Pencil } from 'lucide-react';

export default function Promotores() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openAsign, setOpenAsign] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });

  const { data: promotores = [], isLoading } = useQuery({
    queryKey: ['promotores'],
    queryFn: () => api.get('/promotores').then((r) => r.data),
  });

  const { data: comunidades = [] } = useQuery({
    queryKey: ['comunidades'],
    queryFn: () => api.get('/comunidades').then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (data: typeof form) => 
      editingId 
        ? api.patch(`/usuarios/${editingId}`, { nombre: data.nombre })
        : api.post('/usuarios', { ...data, rol: 'PROMOTOR' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promotores'] });
      handleClose();
    },
  });

  const handleEdit = (p: any) => {
    setEditingId(p.usuario.id);
    setForm({ nombre: p.usuario.nombre, email: p.usuario.email, password: '' });
    setOpenNew(true);
  };

  const handleClose = () => {
    setOpenNew(false);
    setEditingId(null);
    setForm({ nombre: '', email: '', password: '' });
  };

  const asignar = useMutation({
    mutationFn: ({ promotorId, comunidadId }: { promotorId: string; comunidadId: string }) =>
      api.post(`/promotores/${promotorId}/comunidades`, { comunidadId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotores'] }); setOpenAsign(null); },
  });

  const desasignar = useMutation({
    mutationFn: ({ promotorId, comunidadId }: { promotorId: string; comunidadId: string }) =>
      api.delete(`/promotores/${promotorId}/comunidades/${comunidadId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotores'] }),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Promotores</h1><p className="text-sm text-gray-500">{promotores.length} promotor(es) registrado(s)</p></div>
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Promotor</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {promotores.map((p: { id: string; usuario: { nombre: string; email: string; activo: boolean }; comunidades: { comunidadId: string; activo: boolean; comunidad: { id: string; nombre: string; municipio: string } }[] }) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{p.usuario.nombre}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!p.usuario.activo && <Badge className="bg-gray-100 text-gray-600 text-xs">Inactivo</Badge>}
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{p.usuario.email}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Comunidades ({p.comunidades.filter((c) => c.activo).length})</p>
                <div className="space-y-1">
                  {p.comunidades.filter((c) => c.activo).map((cp) => (
                    <div key={cp.comunidadId} className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-blue-500" />{cp.comunidad.nombre}</span>
                      <button onClick={() => desasignar.mutate({ promotorId: p.id, comunidadId: cp.comunidadId })} className="text-red-400 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setOpenAsign(p.id)}>
                <Plus className="h-3 w-3 mr-1" /> Asignar Comunidad
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openNew} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Promotor' : 'Nuevo Promotor'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nombre</Label><Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
            {!editingId && (
              <>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label>Contraseña inicial</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={() => upsert.mutate(form)} disabled={upsert.isPending}>{upsert.isPending ? 'Guardando...' : editingId ? 'Actualizar' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!openAsign} onOpenChange={() => setOpenAsign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Asignar Comunidad</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {comunidades.map((c: { id: string; nombre: string; municipio: string }) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-2 text-sm border rounded-lg hover:bg-blue-50 transition-colors"
                onClick={() => asignar.mutate({ promotorId: openAsign!, comunidadId: c.id })}
              >
                <strong>{c.nombre}</strong> <span className="text-gray-500">— {c.municipio}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
