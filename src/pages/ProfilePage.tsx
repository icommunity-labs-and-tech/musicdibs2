import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  User, Mail, Shield, Calendar, Lock, Loader2,
  CheckCircle2, AlertCircle, Eye, EyeOff, Pencil, Save, X, Bell, Volume2, Globe,
} from 'lucide-react';
import { fetchDashboardSummary } from '@/services/dashboardApi';
import type { DashboardSummary } from '@/types/dashboard';

function NotifSoundToggle() {
  const { t } = useTranslation();
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
          <p className="text-sm font-medium">{t('dashboard.profile.notifSound')}</p>
          <p className="text-xs text-muted-foreground">{t('dashboard.profile.notifSoundDesc')}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={toggle} />
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';

  const [editing, setEditing] = useState(false);
  const [userLang, setUserLang] = useState(i18n.resolvedLanguage || 'es');
  const [langSaving, setLangSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showPwForm, setShowPwForm] = useState(false);
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    if (user?.user_metadata) {
      setDisplayName(user.user_metadata.display_name || user.user_metadata.full_name || '');
      setPhone(user.user_metadata.phone || '');
    }
    setEmail(user?.email || '');
    fetchDashboardSummary()
      .then(setSummary)
      .finally(() => setKycLoading(false));
    // Load language from profile
    if (user?.id) {
      supabase.from('profiles').select('language').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data?.language) setUserLang(data.language);
        });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMsg(null);

    const emailChanged = email.trim().toLowerCase() !== (user?.email || '').toLowerCase();

    const { error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim(), phone: phone.trim() },
    });

    if (error) {
      setSaving(false);
      setSaveMsg({ type: 'error', text: error.message });
      return;
    }

    await supabase.from('profiles').update({
      display_name: displayName.trim(),
      phone: phone.trim() || null,
    }).eq('user_id', user!.id);

    if (emailChanged) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: email.trim(),
      });
      setSaving(false);
      if (emailError) {
        setSaveMsg({ type: 'error', text: emailError.message });
      } else {
        setSaveMsg({ type: 'success', text: t('dashboard.profile.profileUpdatedEmail') });
        setEditing(false);
        setTimeout(() => setSaveMsg(null), 8000);
      }
      return;
    }

    setSaving(false);
    setSaveMsg({ type: 'success', text: t('dashboard.profile.profileUpdated') });
    setEditing(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw.length < 6) {
      setPwMsg({ type: 'error', text: t('dashboard.profile.pwMinLength') });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: 'error', text: t('dashboard.profile.pwMismatch') });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwLoading(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
    } else {
      setPwMsg({ type: 'success', text: t('dashboard.profile.pwUpdated') });
      setNewPw('');
      setConfirmPw('');
      setShowPwForm(false);
      setTimeout(() => setPwMsg(null), 3000);
    }
  };

  const kycMap: Record<string, { label: string; icon: typeof CheckCircle2; badgeClass: string }> = {
    verified: { label: t('dashboard.profile.kycVerified'), icon: CheckCircle2, badgeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    pending: { label: t('dashboard.profile.kycPending'), icon: Loader2, badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
    unverified: { label: t('dashboard.profile.kycUnverified'), icon: AlertCircle, badgeClass: 'bg-destructive/10 text-destructive border-destructive/20' },
  };

  const kyc = kycMap[summary?.kycStatus || 'unverified'] || kycMap.unverified;
  const KycIcon = kyc.icon;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">{t('dashboard.profile.title')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Personal info */}
      <Card className="border-border/40">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> {t('dashboard.profile.personalInfo')}
          </CardTitle>
          {!editing && (
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> {t('dashboard.profile.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> {t('dashboard.profile.email')}
            </Label>
            <Input
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={!editing}
              className={`h-9 text-sm ${!editing ? 'bg-muted/50' : ''}`}
              type="email"
              placeholder="tu@email.com"
            />
            {editing && email.trim().toLowerCase() !== (user?.email || '').toLowerCase() && (
              <p className="text-[10px] text-amber-600">{t('dashboard.profile.emailConfirmNote')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('dashboard.profile.displayName')}</Label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={!editing}
              className={`h-9 text-sm ${!editing ? 'bg-muted/50' : ''}`}
              placeholder={t('dashboard.profile.displayNamePlaceholder')}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t('dashboard.profile.phone')}</Label>
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
              <Calendar className="h-3.5 w-3.5" /> {t('dashboard.profile.memberSince')}
            </Label>
            <Input
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
              disabled
              className="h-9 text-sm bg-muted/50"
            />
          </div>

          {editing && (
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" className="gap-1" onClick={handleSaveProfile} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {t('dashboard.profile.save')}
              </Button>
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setEditing(false)}>
                <X className="h-3.5 w-3.5" /> {t('dashboard.profile.cancel')}
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

      {/* KYC */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> {t('dashboard.profile.kycTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> {t('dashboard.profile.kycLoading')}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`gap-1.5 ${kyc.badgeClass}`}>
                  <KycIcon className={`h-3.5 w-3.5 ${summary?.kycStatus === 'pending' ? 'animate-spin' : ''}`} />
                  {kyc.label}
                </Badge>
                {summary?.subscriptionPlan && (
                  <Badge variant="secondary" className="text-xs">{t('dashboard.profile.plan')} {summary.subscriptionPlan}</Badge>
                )}
              </div>
              {summary?.kycStatus === 'verified' && (
                <p className="text-xs text-muted-foreground">{t('dashboard.profile.kycVerifiedDesc')}</p>
              )}
              {summary?.kycStatus === 'pending' && (
                <p className="text-xs text-muted-foreground">{t('dashboard.profile.kycPendingDesc')}</p>
              )}
              {summary?.kycStatus === 'unverified' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">{t('dashboard.profile.kycUnverifiedDesc')}</p>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate('/dashboard/verify-identity')}>
                    <Shield className="h-3.5 w-3.5" /> {t('dashboard.profile.startVerification')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> {t('dashboard.profile.languageTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t('dashboard.profile.languageDesc')}</p>
          <Select
            value={userLang}
            onValueChange={async (val) => {
              setUserLang(val);
              setLangSaving(true);
              i18n.changeLanguage(val);
              await supabase.from('profiles').update({ language: val }).eq('user_id', user!.id);
              setLangSaving(false);
            }}
          >
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="es">🇪🇸 Español</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="pt">🇧🇷 Português</SelectItem>
            </SelectContent>
          </Select>
          {langSaving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> {t('dashboard.profile.saving')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" /> {t('dashboard.profile.notifPreferences')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotifSoundToggle />
        </CardContent>
      </Card>

      {/* Security */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> {t('dashboard.profile.security')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPwForm ? (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPwForm(true)}>
              <Lock className="h-3.5 w-3.5" /> {t('dashboard.profile.changePassword')}
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-sm">
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.profile.newPassword')}</Label>
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    required
                    minLength={6}
                    className="h-9 text-sm pr-9"
                    placeholder={t('dashboard.profile.newPasswordPlaceholder')}
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
                <Label className="text-xs">{t('dashboard.profile.confirmPassword')}</Label>
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  required
                  minLength={6}
                  className="h-9 text-sm"
                  placeholder={t('dashboard.profile.confirmPasswordPlaceholder')}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" size="sm" disabled={pwLoading}>
                  {pwLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('dashboard.profile.update')}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setShowPwForm(false); setNewPw(''); setConfirmPw(''); setPwMsg(null); }}>
                  {t('dashboard.profile.cancel')}
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
              {t('dashboard.profile.lastSession')} {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString(lang) : 'N/A'}
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
