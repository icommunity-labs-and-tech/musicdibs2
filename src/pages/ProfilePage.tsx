import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Shield, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">Perfil</h2>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Información personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
            <Input value={user?.email || ''} disabled className="h-9 text-sm bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Miembro desde</Label>
            <Input value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : ''} disabled className="h-9 text-sm bg-muted/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Verificación de identidad</Label>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Verificado</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm">Cambiar contraseña</Button>
        </CardContent>
      </Card>
    </div>
  );
}
