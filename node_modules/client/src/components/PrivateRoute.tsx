import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

interface Props {
  children: React.ReactNode;
  roles?: string[];
}

export default function PrivateRoute({ children, roles }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.rol)) return <Navigate to="/" replace />;

  return <>{children}</>;
}
