import { useState, useEffect } from 'react';
import { Loader2, Key, LinkIcon, RefreshCw } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { listIbsSignatures, createIbsSignature, syncIbsSignatures } from '@/services/dashboardApi';
import type { IbsSignature } from '@/types/dashboard';

interface SignatureSelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export function SignatureSelector({ value, onChange }: SignatureSelectorProps) {
  const { t } = useTranslation();
  const [signatures, setSignatures] = useState<IbsSignature[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [kycUrl, setKycUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      await syncIbsSignatures();
      const sigs = await listIbsSignatures();
      setSignatures(sigs);
      const active = sigs.find((s: IbsSignature) => s.status === 'success');
      if (active && !value) onChange(active.ibs_signature_id);
    } catch (err) {
      console.error('Error loading signatures:', err);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const result = await createIbsSignature(newName.trim());
      if (result.kycUrl) setKycUrl(result.kycUrl);
      setNewName('');
      await load();
    } catch (err) {
      console.error('Error creating signature:', err);
    }
    setCreating(false);
  };

  const active = signatures.filter((s: IbsSignature) => s.status === 'success');
  const pending = signatures.filter((s: IbsSignature) => s.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('wizard.signature.loading')}
      </div>
    );
  }

  if (active.length > 0) {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <Key className="h-3 w-3" /> {t('wizard.signature.label')}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder={t('wizard.signature.selectPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {active.map((sig: IbsSignature) => (
              <SelectItem key={sig.ibs_signature_id} value={sig.ibs_signature_id}>
                {sig.signature_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-dashed border-amber-400/50 bg-amber-50/50 dark:bg-amber-900/10">
      <p className="text-xs text-amber-700 dark:text-amber-400">{t('wizard.signature.needCreate')}</p>
      <div className="flex gap-2">
        <Input placeholder={t('wizard.signature.namePlaceholder')} value={newName} onChange={(e) => setNewName(e.target.value)} className="h-8 text-xs flex-1" />
        <Button type="button" size="sm" className="h-8 text-xs" disabled={creating || !newName.trim()} onClick={handleCreate}>
          {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : t('wizard.signature.create')}
        </Button>
      </div>
      {kycUrl && (
        <a href={kycUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
          <LinkIcon className="h-3 w-3" /> {t('wizard.signature.completeKyc')}
        </a>
      )}
      {pending.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{t('wizard.signature.pendingTitle')}</p>
          {pending.map((s: IbsSignature) => (
            <div key={s.id} className="flex items-center gap-2">
              <Badge variant="outline" className="text-amber-600 text-xs">{t('wizard.signature.pendingBadge', { name: s.signature_name })}</Badge>
              {s.kyc_url && (
                <a href={s.kyc_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">{t('wizard.signature.verify')}</a>
              )}
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={load}>
            <RefreshCw className="h-3 w-3 mr-1" /> {t('wizard.signature.refreshStatus')}
          </Button>
        </div>
      )}
    </div>
  );
}
