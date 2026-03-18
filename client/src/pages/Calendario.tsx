import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { es } from 'date-fns/locale';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Building2, 
  ClipboardList,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Consultas de datos
  const { data: capacitaciones } = useQuery({
    queryKey: ['capacitaciones-calendario'],
    queryFn: () => api.get('/capacitaciones').then(r => r.data)
  });

  const { data: eventos } = useQuery({
    queryKey: ['eventos-calendario'],
    queryFn: () => api.get('/eventos').then(r => r.data)
  });

  const { data: visitas } = useQuery({
    queryKey: ['visitas-calendario'],
    queryFn: () => api.get('/visitas').then(r => r.data)
  });

  // Navegación de meses
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Domingo
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const getEventsForDay = (day: Date) => {
    const list = [];
    
    capacitaciones?.forEach((c: any) => {
      if (c.fechaInicio && isSameDay(new Date(c.fechaInicio), day)) {
        list.push({ ...c, type: 'capacitacion', color: 'bg-blue-100 text-blue-700 border-blue-200' });
      }
    });

    eventos?.forEach((e: any) => {
      if (isSameDay(new Date(e.fecha), day)) {
        list.push({ ...e, type: 'evento', color: 'bg-purple-100 text-purple-700 border-purple-200' });
      }
    });

    visitas?.forEach((v: any) => {
      if (isSameDay(new Date(v.fecha), day)) {
        list.push({ ...v, type: 'visita', color: 'bg-green-100 text-green-700 border-green-200' });
      }
    });

    return list;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Calendario de Actividades</h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold">{format(currentDate, 'MMMM yyyy', { locale: es })}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="font-semibold px-4"> Hoy </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-xl ring-1 ring-black/5">
        <div className="grid grid-cols-7 border-b bg-gray-50/50">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest border-r last:border-0">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-white">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDay = isToday(day);

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "min-h-[120px] p-2 border-r border-b relative group cursor-pointer transition-all hover:bg-slate-50",
                  !isCurrentMonth && "bg-gray-50/30 text-gray-300",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <span className={cn(
                  "inline-flex items-center justify-center w-7 h-7 text-xs font-bold rounded-full mb-1 transition-colors",
                  isTodayDay ? "bg-[#BC955C] text-white shadow-md" : "text-gray-500 group-hover:text-gray-900",
                  !isCurrentMonth && "opacity-30"
                )}>
                  {format(day, 'd')}
                </span>
                
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((ev: any, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border truncate shadow-sm font-medium",
                        ev.color
                      )}
                    >
                      {ev.titulo || ev.nombre || 'Visita'}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[9px] text-gray-400 font-bold ml-1">+{dayEvents.length - 3} más</p>
                  )}
                </div>
                
                <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1 rounded-full shadow-md border text-gray-400 hover:text-blue-600">
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Detalle del día */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-[#BC955C] text-white p-2 rounded-lg"><Calendar className="h-4 w-4" /></span>
              {selectedDay && format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedDay && getEventsForDay(selectedDay).length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-xl border border-dashed">No hay actividades programadas</p>
            ) : (
              selectedDay && getEventsForDay(selectedDay).map((ev: any, i) => (
                <div key={i} className={cn("p-4 rounded-xl border flex items-start gap-3 shadow-sm", ev.color)}>
                  {ev.type === 'capacitacion' && <BookOpen className="h-4 w-4 flex-shrink-0 mt-1" />}
                  {ev.type === 'evento' && <Building2 className="h-4 w-4 flex-shrink-0 mt-1" />}
                  {ev.type === 'visita' && <ClipboardList className="h-4 w-4 flex-shrink-0 mt-1" />}
                  <div>
                    <h4 className="text-sm font-bold leading-tight">{ev.titulo || ev.nombre || 'Visita Programada'}</h4>
                    <p className="text-[11px] opacity-80 mt-0.5">Comunidad: <strong>{ev.comunidad?.nombre}</strong></p>
                    {ev.instructores && (
                      <p className="text-[11px] opacity-80">Instructores: {ev.instructores.map((i:any) => i.instructor.usuario.nombre).join(', ')}</p>
                    )}
                    {ev.descripcion && <p className="text-xs mt-2 italic opacity-90 border-t border-black/5 pt-2">{ev.descripcion}</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
