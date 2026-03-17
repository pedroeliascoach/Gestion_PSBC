import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { MapPin, GraduationCap, FolderOpen, Eye, Truck, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

const ETAPA_COLORS = ['#3b82f6', '#f59e0b', '#f97316', '#22c55e'];

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { kpis, comunidadesPorEtapa, presupuestoResumen, actividadReciente } = data || {};

  const kpiCards = [
    { label: 'Comunidades Activas', value: kpis?.comunidadesActivas ?? 0, icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Capacitaciones en Progreso', value: kpis?.capacitacionesEnProgreso ?? 0, icon: GraduationCap, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Proyectos en Ejecución', value: kpis?.proyectosEnEjecucion ?? 0, icon: FolderOpen, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Visitas este Mes', value: kpis?.visitasMes ?? 0, icon: Eye, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Proveedores con Pendientes', value: kpis?.proveedoresConPendientes ?? 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Ejecución Presupuestal', value: `${kpis?.porcentajeEjecucion ?? 0}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  const etapaData = [1, 2, 3, 4].map((e) => ({
    name: `Etapa ${e}`,
    total: comunidadesPorEtapa?.find((c: { etapa: number; total: number }) => c.etapa === e)?.total ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Programa de Salud y Bienestar Comunitario</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpiCards.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${k.bg}`}>
                  <Icon className={`h-5 w-5 ${k.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{k.value}</p>
                  <p className="text-xs text-gray-500 leading-tight">{k.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Etapas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Comunidades por Etapa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={etapaData} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                  {etapaData.map((_, i) => <Cell key={i} fill={ETAPA_COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Presupuesto */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Presupuesto por Comunidad</CardTitle>
            <div className="flex gap-4 text-sm text-gray-500 mt-1">
              <span>Total: <strong>{formatCurrency(kpis?.totalPresupuesto)}</strong></span>
              <span>Gastado: <strong>{formatCurrency(kpis?.totalGastado)}</strong></span>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={(presupuestoResumen ?? []).slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="comunidad" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="monto" fill="#3b82f6" name="Asignado" />
                <Bar dataKey="gastado" fill="#22c55e" name="Gastado" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente */}
      <Card>
        <CardHeader><CardTitle className="text-base">Actividad Reciente</CardTitle></CardHeader>
        <CardContent>
          {actividadReciente?.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">Sin actividad reciente</p>
          ) : (
            <div className="space-y-3">
              {actividadReciente?.map((v: { id: string; comunidad: { nombre: string }; promotor: { usuario: { nombre: string } }; fecha: string; descripcion?: string }) => (
                <div key={v.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Eye className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Visita a <strong>{v.comunidad?.nombre}</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      {v.promotor?.usuario?.nombre} · {new Date(v.fecha).toLocaleDateString('es-MX')}
                    </p>
                    {v.descripcion && <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{v.descripcion}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
