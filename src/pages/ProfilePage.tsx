import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  User, Mail, Shield, Calendar, Lock, Loader2,
  CheckCircle2, AlertCircle, Eye, EyeOff, Pencil, Save, X, Bell, Volume2,
} from 'lucide-react';
import { fetchDashboardSummary } from '@/services/dashboardApi';
import type { DashboardSummary } from '@/types/dashboard';

function NotifSoundToggle() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('notif_sound') !== 'off');
  const toggle = (val: boolean) => {
    setEnabled(val);
    localStorage.setItem('notif_sound', val ? 'on' : 'off');
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Volume2 className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Sonido de notificación</p>
          <p className="text-xs text-muted-foreground">Reproduce un sonido cuando llega una alerta</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} />
    </div>
  );
}
const kycConfig: Record<string, { label: string; icon: typeof CheckCircle2; badgeClass: string }> = {
  verified: { label: 'Verificado', icon: CheckCircle2, badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  pending: { label: 'En revisión', icon: Loader2, badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  unverified: { label: 'No verificado', icon: AlertCircle, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
};

export default function ProfilePage() {
  const { user } = useAuth();

  // Profile editing
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change
  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // KYC
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    // Load user metadata
    if (user?.user_metadata) {
      setDisplayName(user.user_metadata.display_name || user.user_metadata.full_name || '');
      setPhone(user.user_metadata.phone || '');
    }
    // Load KYC status
    fetchDashboardSummary()
      .then(setSummary)
      .finally(() => setKycLoading(false));
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);
    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), phone: phone.trim() },
    });
    setSaving(false);
    if (error) {
      setSaveMsg({ type: 'error', text: error.message });
    } else {
      setSaveMsg({ type: 'success', text: 'Perfil actualizado correctamente.' });
      setEditing(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setNewPw('');
      setConfirmPw('');
      setShowPwForm(false);
      setTimeout(() => setPwMsg(null), 3000);
    }
  };

  const kyc = kycConfig[summary?.kycStatus || 'unverified'] || kycConfig.unverified;
  const KycIcon = kyc.icon;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Perfil</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* ─── Personal info ─── */}
      <Card className="border-border/40">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Información personal
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input value={user?.email || ''} disabled className="h-9 text-sm bg-muted/50" />
            <p className="text-[10px] text-muted-foreground">El email no se puede cambiar desde aquí.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Nombre para mostrar</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={!editing}
              className={`h-9 text-sm ${!editing ? 'bg-muted/50' : ''}`}
              placeholder="Tu nombre artístico o real"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Teléfono</Label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={!editing}
              className={`h-9 text-sm ${!editing ? 'bg-muted/50' : ''}`}
              placeholder="+34 600 000 000"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Miembro desde
            </Label>
            <Input
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              disabled
              className="h-9 text-sm bg-muted/50"
            />
          </div>

          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" className="gap-1" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Guardar
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
            </div>
          )}

          {saveMsg && (
            <div className={`flex items-center gap-2 text-xs ${saveMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
              {saveMsg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {saveMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── KYC status ─── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Verificación de identidad (KYC)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando estado…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`gap-1.5 ${kyc.badgeClass}`}>
                  <KycIcon className={`h-3.5 w-3.5 ${summary?.kycStatus === 'pending' ? 'animate-spin' : ''}`} />
                  {kyc.label}
                </Badge>
                {summary?.subscriptionPlan && (
                  <Badge variant="secondary" className="text-xs">Plan {summary.subscriptionPlan}</Badge>
                )}
              </div>
              {summary?.kycStatus === 'verified' && (
                <p className="text-xs text-muted-foreground">
                  Tu identidad ha sido verificada. Puedes registrar obras sin restricciones.
                </p>
              )}
              {summary?.kycStatus === 'pending' && (
                <p className="text-xs text-muted-foreground">
                  Tu verificación está en proceso. Puede tardar hasta 48 horas.
                </p>
              )}
              {summary?.kycStatus === 'unverified' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Necesitas verificar tu identidad para poder registrar obras.
                  </p>
                  <Button variant="outline" size="sm">Iniciar verificación</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Notification Preferences ─── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> Preferencias de notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotifSoundToggle />
        </CardContent>
      </Card>

      {/* ─── Security / Password ─── */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPwForm ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPwForm(true)}>
              <Lock className="h-3.5 w-3.5" /> Cambiar contraseña
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
              <div className="space-y-2">
                <Label className="text-xs">Nueva contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    minLength={6}
                    className="h-9 text-sm pr-9"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPw(v => !v)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Confirmar contraseña</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 text-sm"
                  placeholder="Repite la contraseña"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={pwLoading}>
                  {pwLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Actualizar'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowPwForm(false); setNewPw(''); setConfirmPw(''); setPwMsg(null); }}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {pwMsg && (
            <div className={`flex items-center gap-2 text-xs ${pwMsg.type === 'success' ? 'text-emerald-600' : 'text-destructive'}`}>
              {pwMsg.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
              {pwMsg.text}
            </div>
          )}

          <Separator />

          <div>
            <p className="text-xs text-muted-foreground">
              Última sesión: {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('es-ES') : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
