import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function UserLogin() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showRegPw, setShowRegPw] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });
    if (result?.error) {
      setError(result.error.message || 'Error al iniciar sesión con Google');
      setGoogleLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await signIn(form.get('email') as string, form.get('password') as string);
    setLoading(false);
    if (error) setError(error.message);
    else navigate('/dashboard');
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await signUp(form.get('email') as string, form.get('password') as string);
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess('Revisa tu correo electrónico para confirmar tu cuenta.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #16082a 50%, #0d0618 100%)' }}>
      <Card className="w-full max-w-md border-border/30 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-3">
          <img src="/lovable-uploads/81d79e1f-fd6f-4e2c-a573-89261bcf3879.png" alt="MusicDibs" className="mx-auto h-14 w-auto invert" />
          
          <CardDescription>Accede a tu consola de registro de obras</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="register">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              {forgotMode ? (
                <div className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">Introduce tu email y te enviaremos un enlace para restablecer tu contraseña.</p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input id="forgot-email" type="email" required placeholder="tu@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" /> {success}
                    </div>
                  )}
                  <Button className="w-full" disabled={loading} onClick={async () => {
                    if (!forgotEmail) return;
                    setError(''); setSuccess(''); setLoading(true);
                    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                      redirectTo: `${window.location.origin}/reset-password`,
                    });
                    setLoading(false);
                    if (error) setError(error.message);
                    else setSuccess('Revisa tu correo electrónico para restablecer tu contraseña.');
                  }}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar enlace'}
                  </Button>
                  <button type="button" onClick={() => { setForgotMode(false); setError(''); setSuccess(''); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ← Volver a iniciar sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input id="login-email" name="email" type="email" required placeholder="tu@email.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Contraseña</Label>
                    <div className="relative">
                      <Input id="login-password" name="password" type={showLoginPw ? 'text' : 'password'} required placeholder="••••••••" className="pr-10" />
                      <button type="button" onClick={() => setShowLoginPw(!showLoginPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showLoginPw ? 'Ocultar contraseña' : 'Ver contraseña'}>
                        {showLoginPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" /> {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
                  </Button>
                  <button type="button" onClick={() => { setForgotMode(true); setError(''); }} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                    ¿Olvidaste tu contraseña?
                  </button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input id="reg-email" name="email" type="email" required placeholder="tu@email.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Contraseña</Label>
                  <div className="relative">
                    <Input id="reg-password" name="password" type={showRegPw ? 'text' : 'password'} required minLength={6} placeholder="Mínimo 6 caracteres" className="pr-10" />
                    <button type="button" onClick={() => setShowRegPw(!showRegPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" aria-label={showRegPw ? 'Ocultar contraseña' : 'Ver contraseña'}>
                      {showRegPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" /> {error}
                  </div>
                )}
                {success && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" /> {success}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear cuenta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
