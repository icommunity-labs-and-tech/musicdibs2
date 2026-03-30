import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LifeBuoy, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function SupportPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold">{t('dashboard.support.title')}</h2>

      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" /> {t('dashboard.support.contactSupport')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-medium">{t('dashboard.support.messageSent')}</p>
              <p className="text-sm text-muted-foreground">{t('dashboard.support.messageSentDesc')}</p>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>{t('dashboard.support.sendAnother')}</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.support.category')}</Label>
                <Select defaultValue="general">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('dashboard.support.catGeneral')}</SelectItem>
                    <SelectItem value="billing">{t('dashboard.support.catBilling')}</SelectItem>
                    <SelectItem value="technical">{t('dashboard.support.catTechnical')}</SelectItem>
                    <SelectItem value="registration">{t('dashboard.support.catRegistration')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.support.subject')}</Label>
                <Input required className="h-9 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('dashboard.support.message')}</Label>
                <Textarea required rows={5} className="text-sm" />
              </div>
              <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> {t('dashboard.support.send')}</>}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
