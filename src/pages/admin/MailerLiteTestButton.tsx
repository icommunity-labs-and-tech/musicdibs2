import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

/**
 * Componente temporal para testear integración MailerLite
 * 
 * USO:
 * 1. Importar en cualquier página (ej: Admin Dashboard)
 * 2. Añadir <MailerLiteTestButton /> donde quieras
 * 3. Usar para testear carritos abandonados
 * 4. ELIMINAR después de testing
 */
export function MailerLiteTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Datos del formulario
  const [email, setEmail] = useState('test-cart@musicdibs.com');
  const [locale, setLocale] = useState('es');
  const [planType, setPlanType] = useState('anuales');
  const [amount, setAmount] = useState('99.00');

  const testAbandonedCart = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        'https://kzbmthhtbeddcjrucuex.supabase.co/functions/v1/mailerlite-webhook-handler',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            event: 'cart.abandoned',
            email: email,
            locale: locale,
            plan_type: planType,
            amount: amount,
            currency: 'EUR'
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ Test exitoso! Revisa MailerLite para el email: ${email}`
        });
        console.log('✅ Test result:', data);
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${data.error || 'Unknown error'}`
        });
        console.error('❌ Test error:', data);
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error de red: ${error instanceof Error ? error.message : 'Unknown'}`
      });
      console.error('❌ Network error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testUserSignup = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        'https://kzbmthhtbeddcjrucuex.supabase.co/functions/v1/mailerlite-webhook-handler',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            event: 'user.created',
            email: email,
            full_name: 'Test User',
            id: crypto.randomUUID(),
            locale: locale
          })
        }
      );

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ Usuario creado en MailerLite! Email: ${email}`
        });
        console.log('✅ User created:', data);
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${data.error || 'Unknown error'}`
        });
        console.error('❌ Error:', data);
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`
      });
      console.error('❌ Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">🧪 Test MailerLite Integration</CardTitle>
        <CardDescription>
          Componente temporal para testear sincronización con MailerLite
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Formulario */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@musicdibs.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-locale">Idioma</Label>
            <Select value={locale} onValueChange={setLocale}>
              <SelectTrigger id="test-locale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt-br">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-plan">Plan</Label>
            <Select value={planType} onValueChange={setPlanType}>
              <SelectTrigger id="test-plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensuales">Mensual</SelectItem>
                <SelectItem value="anuales">Anual</SelectItem>
                <SelectItem value="single">Single</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test-amount">Monto (€)</Label>
            <Input
              id="test-amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="99.00"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2">
          <Button
            onClick={testAbandonedCart}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testeando...
              </>
            ) : (
              '🛒 Test Carrito Abandonado'
            )}
          </Button>

          <Button
            onClick={testUserSignup}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testeando...
              </>
            ) : (
              '👤 Test Usuario Nuevo'
            )}
          </Button>
        </div>

        {/* Resultado */}
        {result && (
          <Alert variant={result.success ? 'default' : 'destructive'}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        {/* Instrucciones */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>Verificación post-test:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Ir a MailerLite Dashboard → Subscribers</li>
            <li>Buscar el email testeado</li>
            <li>Verificar campos custom poblados</li>
            <li>Verificar que está en el grupo correcto</li>
          </ol>
          <p className="text-destructive font-medium mt-2">
            ⚠️ ELIMINAR ESTE COMPONENTE después de testing
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
