import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, MapPin, Users, GraduationCap, FolderOpen,
  DollarSign, Truck, FileText, Image, LogOut, Menu, X,
  ClipboardList, BookOpen, ChevronRight, Building2
} from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ADMIN'] },
  { path: '/comunidades', label: 'Comunidades', icon: MapPin, roles: ['ADMIN', 'PROMOTOR'] },
  { path: '/promotores', label: 'Promotores', icon: Users, roles: ['ADMIN'] },
  { path: '/instructores', label: 'Instructores', icon: GraduationCap, roles: ['ADMIN'] },
  { path: '/capacitaciones', label: 'Capacitaciones', icon: BookOpen, roles: ['ADMIN', 'PROMOTOR', 'INSTRUCTOR'] },
  { path: '/proyectos', label: 'Proyectos', icon: FolderOpen, roles: ['ADMIN', 'PROMOTOR'] },
  { path: '/visitas', label: 'Visitas', icon: ClipboardList, roles: ['ADMIN', 'PROMOTOR'] },
  { path: '/eventos', label: 'Eventos', icon: Building2, roles: ['ADMIN', 'PROMOTOR'] },
  { path: '/reportes', label: 'Reportes', icon: FileText, roles: ['ADMIN', 'PROMOTOR', 'INSTRUCTOR'] },
  { path: '/presupuesto', label: 'Presupuesto', icon: DollarSign, roles: ['ADMIN'] },
  { path: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['ADMIN'] },
  { path: '/requisitos', label: 'Catálogo Requisitos', icon: ClipboardList, roles: ['ADMIN'] },
  { path: '/galeria', label: 'Galería', icon: Image, roles: ['ADMIN', 'PROMOTOR', 'INSTRUCTOR'] },
];

import logo from '@/assets/logo.png';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = navItems.filter((item) => item.roles.includes(user?.rol ?? ''));

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const Sidebar = () => (
    <div className="flex h-full flex-col bg-[#4A1022] text-white border-r border-white/10">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-white/10">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-inner">
          <img src={logo} alt="Logo" className="w-full h-full object-contain p-1" />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight tracking-wide uppercase">DIF Tamaulipas</p>
          <p className="text-[10px] text-[#BC955C] font-semibold leading-tight uppercase tracking-tighter">Desarrollo Comunitario</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                active
                  ? 'bg-[#BC955C] text-white shadow-lg'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{item.label}</span>
              {active && <ChevronRight className="ml-auto h-3 w-3" />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-6 bg-black/10">
        <div className="mb-3">
          <p className="text-sm font-bold truncate">{user?.nombre}</p>
          <p className="text-[10px] text-white/50 truncate mb-2 uppercase tracking-widest">{user?.email}</p>
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-[#BC955C]/20 text-[#BC955C] border border-[#BC955C]/30 font-bold uppercase">
            {user?.rol}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-shrink-0 flex-col">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex w-64 flex-col z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center border-b bg-white px-4 gap-3 md:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">DIF Tamaulipas</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
