import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Mail, BookOpen, Pencil } from 'lucide-react';
import { ESTATUS_CAPACITACION } from '@/lib/utils';

export default function Instructores() {
  const qc = useQueryClient();
  const [openNew, setOpenNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: '', email: '', password: '' });

  const { data: instructores = [], isLoading } = useQuery({
    queryKey: ['instructores'],
    queryFn: () => api.get('/instructores').then((r) => r.data),
  });

  const upsert = useMutation({
    mutationFn: (data: typeof form) => 
      editingId 
        ? api.patch(`/usuarios/${editingId}`, { nombre: data.nombre })
        : api.post('/usuarios', { ...data, rol: 'INSTRUCTOR' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['instructores'] });
      handleClose();
    },
  });

  const handleEdit = (i: any) => {
    setEditingId(i.usuario.id);
    setForm({ nombre: i.usuario.nombre, email: i.usuario.email, password: '' });
    setOpenNew(true);
  };

  const handleClose = () => {
    setOpenNew(false);
    setEditingId(null);
    setForm({ nombre: '', email: '', password: '' });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Instructores</h1><p className="text-sm text-gray-500">{instructores.length} instructor(es)</p></div>
        <Button onClick={() => setOpenNew(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Instructor</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {instructores.map((i: { id: string; usuario: { nombre: string; email: string; activo: boolean }; capacitaciones: { capacitacion: { id: string; titulo: string; estatus: string; comunidad: { nombre: string } } }[] }) => (
          <Card key={i.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{i.usuario.nombre}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(i)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {!i.usuario.activo && <Badge className="bg-gray-100 text-gray-600 text-xs">Inactivo</Badge>}
                </div>
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" />{i.usuario.email}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <p className="text-xs font-medium text-gray-500">Capacitaciones ({i.capacitaciones.length})</p>
              <div className="space-y-1">
                {i.capacitaciones.slice(0, 3).map((ci) => {
                  const est = ESTATUS_CAPACITACION[ci.capacitacion.estatus];
                  return (
                    <div key={ci.capacitacion.id} className="flex items-center justify-between text-xs bg-gray-50 px-2 py-1 rounded">
                      <span className="flex items-center gap-1 truncate"><BookOpen className="h-3 w-3 text-gray-400 flex-shrink-0" />{ci.capacitacion.titulo}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${est?.color}`}>{est?.label}</span>
                    </div>
                  );
                })}
                {i.capacitaciones.length > 3 && <p className="text-xs text-gray-400">+{i.capacitaciones.length - 3} más</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={openNew} onOpenChange={(v) => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Instructor' : 'Nuevo Instructor'}</DialogTitle></DialogHeader>
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
    </div>
  );
}
