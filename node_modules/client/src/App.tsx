import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from '@/components/Layout';
import PrivateRoute from '@/components/PrivateRoute';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Comunidades from '@/pages/Comunidades';
import ComunidadDetalle from '@/pages/ComunidadDetalle';
import Promotores from '@/pages/Promotores';
import Instructores from '@/pages/Instructores';
import Capacitaciones from '@/pages/Capacitaciones';
import Proyectos from '@/pages/Proyectos';
import Visitas from '@/pages/Visitas';
import Eventos from '@/pages/Eventos';
import Reportes from '@/pages/Reportes';
import Presupuesto from '@/pages/Presupuesto';
import Proveedores from '@/pages/Proveedores';
import ProveedorDetalle from '@/pages/ProveedorDetalle';
import Requisitos from '@/pages/Requisitos';
import Galeria from '@/pages/Galeria';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function AppRoutes() {
  const { user } = useAuth();

  const defaultRoute = () => {
    if (!user) return <Navigate to="/login" replace />;
    if (user.rol === 'ADMIN') return <Navigate to="/dashboard" replace />;
    if (user.rol === 'PROMOTOR') return <Navigate to="/comunidades" replace />;
    return <Navigate to="/capacitaciones" replace />;
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={defaultRoute()} />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<PrivateRoute roles={['ADMIN']}><Dashboard /></PrivateRoute>} />
                <Route path="/comunidades" element={<Comunidades />} />
                <Route path="/comunidades/:id" element={<ComunidadDetalle />} />
                <Route path="/promotores" element={<PrivateRoute roles={['ADMIN']}><Promotores /></PrivateRoute>} />
                <Route path="/instructores" element={<PrivateRoute roles={['ADMIN']}><Instructores /></PrivateRoute>} />
                <Route path="/capacitaciones" element={<Capacitaciones />} />
                <Route path="/proyectos" element={<Proyectos />} />
                <Route path="/visitas" element={<Visitas />} />
                <Route path="/eventos" element={<Eventos />} />
                <Route path="/reportes" element={<Reportes />} />
                <Route path="/presupuesto" element={<PrivateRoute roles={['ADMIN']}><Presupuesto /></PrivateRoute>} />
                <Route path="/proveedores" element={<PrivateRoute roles={['ADMIN']}><Proveedores /></PrivateRoute>} />
                <Route path="/proveedores/:id" element={<PrivateRoute roles={['ADMIN']}><ProveedorDetalle /></PrivateRoute>} />
                <Route path="/requisitos" element={<PrivateRoute roles={['ADMIN']}><Requisitos /></PrivateRoute>} />
                <Route path="/galeria" element={<Galeria />} />
              </Routes>
            </Layout>
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
