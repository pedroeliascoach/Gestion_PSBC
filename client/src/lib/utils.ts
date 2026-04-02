import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date));
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

export const ETAPAS: Record<number, { label: string; color: string }> = {
  1: { label: 'Apertura', color: 'bg-blue-100 text-blue-800' },
  2: { label: 'Continuidad', color: 'bg-yellow-100 text-yellow-800' },
  3: { label: 'Consolidación', color: 'bg-orange-100 text-orange-800' },
  4: { label: 'Salida', color: 'bg-green-100 text-green-800' },
};

export const COMPONENTES_PROGRAMA: Record<string, string> = {
  AUTOCUIDADO: 'Autocuidado',
  ALIMENTACION: 'Alimentación',
  ECONOMIA_SOLIDARIA: 'Economía solidaria',
  ESPACIOS_HABITABLES: 'Espacios habitables sustentables',
  GESTION_RIESGOS: 'Gestión integral de riesgos',
  RECREACION: 'Recreación',
};

export const ESTATUS_CAPACITACION: Record<string, { label: string; color: string }> = {
  PLANEADA: { label: 'Planeada', color: 'bg-gray-100 text-gray-800' },
  EN_PROGRESO: { label: 'En Progreso', color: 'bg-blue-100 text-blue-800' },
  COMPLETADA: { label: 'Completada', color: 'bg-green-100 text-green-800' },
  CANCELADA: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
};

export const ESTATUS_PROYECTO: Record<string, { label: string; color: string }> = {
  PLANEADO: { label: 'Planeado', color: 'bg-gray-100 text-gray-800' },
  EN_EJECUCION: { label: 'En Ejecución', color: 'bg-blue-100 text-blue-800' },
  COMPLETADO: { label: 'Completado', color: 'bg-green-100 text-green-800' },
  CANCELADO: { label: 'Cancelado', color: 'bg-red-100 text-red-800' },
};

export const ESTATUS_PAGO: Record<string, { label: string; color: string }> = {
  PENDIENTE: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800' },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-blue-100 text-blue-800' },
  PAGADO: { label: 'Pagado', color: 'bg-green-100 text-green-800' },
};
