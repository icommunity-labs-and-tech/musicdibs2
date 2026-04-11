import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, CreditCard, Shield, Calendar, Hash, FileText, Clock } from 'lucide-react';
import UserPurchasesPanel from './UserPurchasesPanel';
import UserUsagePanel from './UserUsagePanel';
import DisputeTimeline from './DisputeTimeline';

interface UserDetailSheetProps {
  user: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({ icon: Icon, label, value, badge }: { icon: any; label: string; value: React.ReactNode; badge?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5">{badge ? value : <p className="text-sm font-medium break-all">{value || '—'}</p>}</div>
      </div>
    </div>
  );
}

export default function UserDetailSheet({ user, open, onOpenChange }: UserDetailSheetProps) {
  if (!user) return null;

  const kycMap: Record<string, string> = {
    verified: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    unverified: 'bg-muted text-muted-foreground',
    rejected: 'bg-destructive/20 text-destructive',
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Perfil de usuario
          </SheetTitle>
        </SheetHeader>

        {/* Header card */}
        <div className="rounded-lg border border-border/40 bg-muted/20 p-4 mb-6">
          <p className="text-lg font-semibold">{user.display_name || '—'}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {user.role === 'admin' && <Badge className="bg-primary/20 text-primary border-primary/30">Admin</Badge>}
            {user.is_blocked
              ? <Badge className="bg-destructive/20 text-destructive">Bloqueado</Badge>
              : <Badge className="bg-green-500/20 text-green-400">Activo</Badge>}
            <Badge className={kycMap[user.kyc_status] || kycMap.unverified}>KYC: {user.kyc_status}</Badge>
          </div>
        </div>

        {/* Info sections */}
        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contacto</h3>
          <DetailRow icon={Mail} label="Email" value={user.email} />
          <DetailRow icon={Phone} label="Teléfono" value={user.phone} />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suscripción y créditos</h3>
          <DetailRow icon={CreditCard} label="Plan" value={<Badge variant="outline">{user.subscription_plan}</Badge>} badge />
          <DetailRow icon={Hash} label="Créditos disponibles" value={
            <span className="font-mono text-sm font-semibold text-primary">{user.available_credits}</span>
          } badge />
          <DetailRow icon={CreditCard} label="Stripe Customer ID" value={
            user.stripe_customer_id
              ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{user.stripe_customer_id}</code>
              : '—'
          } badge />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Verificación y seguridad</h3>
          <DetailRow icon={Shield} label="Estado KYC" value={
            <Badge className={kycMap[user.kyc_status] || kycMap.unverified}>{user.kyc_status}</Badge>
          } badge />
          <DetailRow icon={Shield} label="Rol" value={
            <Badge variant="outline">{user.role || 'user'}</Badge>
          } badge />
          <DetailRow icon={Hash} label="iBS Signature ID" value={
            user.ibs_signature_id
              ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{user.ibs_signature_id}</code>
              : '—'
          } badge />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actividad</h3>
          <DetailRow icon={FileText} label="Obras registradas" value={
            <span className="font-mono text-sm font-semibold">{user.works_count}</span>
          } badge />
          <DetailRow icon={Calendar} label="Fecha de alta" value={new Date(user.created_at).toLocaleString()} />
          <DetailRow icon={Clock} label="Última actualización" value={new Date(user.updated_at).toLocaleString()} />
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">IDs internos</h3>
          <DetailRow icon={Hash} label="User ID" value={
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{user.user_id}</code>
          } badge />
          <DetailRow icon={Hash} label="Profile ID" value={
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono break-all">{user.id}</code>
          } badge />
        </div>

        <Separator className="my-4" />

        {/* Purchase evidences */}
        <UserPurchasesPanel userId={user.user_id} userEmail={user.email} />

        <Separator className="my-4" />

        {/* Usage evidences */}
        <UserUsagePanel userId={user.user_id} />

        <Separator className="my-4" />

        {/* Dispute timeline */}
        <DisputeTimeline userId={user.user_id} />
      </SheetContent>
    </Sheet>
  );
}
