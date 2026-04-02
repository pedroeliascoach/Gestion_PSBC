import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';

import logo from '@/assets/logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  const [requiresSelection, setRequiresSelection] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      if (res?.requiresSelection) {
        setRequiresSelection(true);
        setAvailableRoles(res.roles);
      } else {
        navigate('/');
      }
    } catch {
      setError('Credenciales incorrectas. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRoleSelect(role: string) {
    setError('');
    setLoading(true);
    try {
      await login(email, password, role);
      navigate('/');
    } catch {
      setError('Error al seleccionar perfil. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#691C32] to-[#4A1022] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-white rounded-2xl shadow-xl mb-6 ring-4 ring-[#BC955C]/20 overflow-hidden">
            <img src={logo} alt="Logo DIF" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight uppercase">DIF Tamaulipas</h1>
          <p className="text-[#BC955C] font-semibold text-sm mt-2 uppercase tracking-widest">Desarrollo Comunitario</p>
          <p className="text-white/70 text-xs mt-1 italic">Programa de Salud y Bienestar Comunitario</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-lg">
              {requiresSelection ? 'Selecciona tu Perfil' : 'Iniciar Sesión'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requiresSelection ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 text-center mb-4">
                  Se han detectado múltiples perfiles asociados a tu cuenta. Elige con cuál deseas ingresar:
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {availableRoles.map((role) => (
                    <Button
                      key={role}
                      onClick={() => handleRoleSelect(role)}
                      variant="outline"
                      className="h-16 flex flex-col items-center justify-center border-2 hover:border-[#BC955C] hover:bg-[#BC955C]/5"
                      disabled={loading}
                    >
                      <span className="font-bold text-lg">{role}</span>
                      <span className="text-xs text-gray-500 capitalize">Ingresar como {role.toLowerCase()}</span>
                    </Button>
                  ))}
                </div>
                <Button 
                  variant="ghost" 
                  className="w-full text-xs" 
                  onClick={() => setRequiresSelection(false)}
                  disabled={loading}
                >
                  Volver al formulario
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@diftamaulipas.gob.mx"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                
                {/* Aviso de cambio de contraseña */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 mt-4">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-xs text-amber-800 leading-tight">
                      Por seguridad, se recomienda cambiar su contraseña periódicamente. Si su contraseña es la predeterminada, cámbiela ahora.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button"
                      className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => setShowChangePassword(true)}
                    >
                      <KeyRound className="h-3 w-3 mr-1" /> Cambiar contraseña
                    </Button>
                  </div>
                </div>
                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
