import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function Galeria() {
  const [search, setSearch] = useState('');

  const { data: fotos = [], isLoading } = useQuery({
    queryKey: ['fotografias'],
    queryFn: () => api.get('/fotografias').then((r) => r.data),
  });

  const filtered = fotos.filter((f: { nombreOriginal: string; descripcion?: string }) =>
    !search || f.nombreOriginal.toLowerCase().includes(search.toLowerCase()) || (f.descripcion?.toLowerCase().includes(search.toLowerCase()))
  );

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Galería</h1><p className="text-sm text-gray-500">{fotos.length} fotografía(s)</p></div>
        <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Sin fotografías registradas</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map((f: { id: string; rutaArchivo: string; nombreOriginal: string; descripcion?: string; fecha: string }) => (
            <a key={f.id} href={f.rutaArchivo} target="_blank" rel="noopener noreferrer" className="group block">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border hover:border-blue-400 transition-colors">
                <img
                  src={f.rutaArchivo}
                  alt={f.nombreOriginal}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              {f.descripcion && <p className="text-xs text-gray-500 mt-1 truncate">{f.descripcion}</p>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
