import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Loader2, CheckCircle2, XCircle, FileUp, FileText } from 'lucide-react';
import { verifyFile } from '@/services/dashboardApi';
import type { VerificationResult } from '@/types/dashboard';
import { generateCertificate, CertificateData } from '@/lib/generateCertificate';
import { toast } from 'sonner';

export function VerifyRegistration() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage || 'es';
  const locale = i18n.resolvedLanguage === 'pt-BR' ? 'pt-BR' : (i18n.resolvedLanguage || i18n.language || 'es');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVerify = async () => {
    if (!file) return;
    setLoading(true); setResult(null);
    try {
      const res = await verifyFile(file);
      setResult(res);
    } catch { setResult({ found: false }); }
    setLoading(false);
  };

  const handleDownloadCertificate = async () => {
    if (!result || !result.found || !result.blockchainHash || !result.ibsEvidenceId) return;
    setGenerating(true);
    try {
      const network = result.blockchainNetwork || 'Polygon';
      const checkerNetwork = ['fantom_opera_mainnet', 'fantom', 'opera'].includes(network.toLowerCase())
        ? 'opera'
        : network.toLowerCase();

      const certData: CertificateData = {
        title: result.title || '',
        filename: file?.name || `${result.title}.mp3`,
        filesize: file ? `${file.size.toLocaleString(locale)} bytes` : t('dashboard.certificate.notAvailable'),
        fileType: result.workType || t('dashboard.certificate.fileTypeFallback'),
        description: result.description || undefined,
        authorName: result.author || t('dashboard.certificate.notAvailable'),
        certifiedAt: new Date(result.registeredAt!).toLocaleDateString(locale, {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        }),
        network,
        txHash: result.blockchainHash,
        fingerprint: result.blockchainHash,
        algorithm: 'base64 SHA-512',
        checkerUrl: result.certificateUrl ||
          `https://checker.icommunitylabs.com/check/${checkerNetwork}/${result.blockchainHash}`,
        ibsUrl: `https://app.icommunitylabs.com/evidences/${result.ibsEvidenceId}`,
        evidenceId: result.ibsEvidenceId,
      };
      await generateCertificate(certData, locale);
      toast.success(t('dashboard.certificate.downloadSuccess'));
    } catch (e) {
      console.error(e);
      toast.error(t('dashboard.certificate.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-6 flex flex-col items-center text-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-6 w-6 text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold">{t('dashboard.verify.title')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.verify.description')}
          </p>
        </div>
        <div
          className="flex items-center gap-2 rounded-md border border-dashed border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <FileUp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">
            {file ? file.name : t('dashboard.verify.selectFile')}
          </span>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => { setFile(e.target.files?.[0] || null); setResult(null); }} />

        <Button className="w-full" size="sm" onClick={handleVerify} disabled={!file || loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('dashboard.verify.verify')}
        </Button>

        {result && (
          result.found ? (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                <CheckCircle2 className="h-4 w-4" /> {t('dashboard.verify.found')}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{result.title}</span> — {t('dashboard.verify.registeredOn')}{' '}
                {new Date(result.registeredAt!).toLocaleDateString(lang)}
              </p>
              {result.blockchainHash && result.ibsEvidenceId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-1.5 text-xs"
                  onClick={handleDownloadCertificate}
                  disabled={generating}
                >
                  {generating
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('dashboard.certificate.generating')}</>
                    : <><FileText className="h-3.5 w-3.5" /> {t('dashboard.certificate.pdfLabel')}</>
                  }
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
              <div className="flex items-center gap-2 text-destructive font-medium text-sm">
                <XCircle className="h-4 w-4" /> {t('dashboard.verify.notFound')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t('dashboard.verify.notFoundDesc')}
              </p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
