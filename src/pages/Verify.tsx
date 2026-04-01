import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Upload, ShieldCheck, FileSearch, AlertCircle, CheckCircle2, XCircle, FileText, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "@/components/SEO";
import { verifyFile } from "@/services/dashboardApi";
import type { VerificationResult } from "@/types/dashboard";
import { generateCertificate, CertificateData } from "@/lib/generateCertificate";
import { toast } from "sonner";

const Verify = () => {
  const { t, i18n } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleVerify = async () => {
    if (!file) return;
    setVerifying(true);
    setResult(null);
    try {
      const res = await verifyFile(file);
      setResult(res);
    } catch {
      setResult({ found: false });
    }
    setVerifying(false);
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

  const locale = i18n.language === 'pt-BR' ? 'pt-BR' : i18n.language?.split('-')[0] || 'es';

  const steps = [
    { step: "01", title: t('verify.step1Title'), desc: t('verify.step1Desc') },
    { step: "02", title: t('verify.step2Title'), desc: t('verify.step2Desc') },
    { step: "03", title: t('verify.step3Title'), desc: t('verify.step3Desc') },
  ];

  return (
    <div className="min-h-screen page-bg" key={i18n.language}>
      <SEO title={t('verify.seoTitle')} description={t('verify.seoDesc')} path="/verify" />
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-8">
            <ShieldCheck className="w-5 h-5 text-pink-300" />
            <span className="text-white/90 text-sm font-medium">{t('verify.badge')}</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {t('verify.title1')}<br />
            <span className="bg-gradient-to-r from-pink-400 to-purple-300 bg-clip-text text-transparent">{t('verify.title2')}</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            {t('verify.subtitle')} <strong className="text-white">Musicdibs</strong>{t('verify.subtitleEnd')}
          </p>
        </div>
      </section>

      {/* Verify Card */}
      <section className="px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <FileSearch className="w-6 h-6 text-pink-400" />
              <h2 className="text-xl font-semibold text-white">{t('verify.cardTitle')}</h2>
            </div>

            <p className="text-white/60 mb-8 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('verify.cardDesc') }} />

            {/* Drop zone */}
            <div
              className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-6 ${
                dragOver
                  ? "border-pink-400 bg-pink-400/10"
                  : file
                  ? "border-green-400/50 bg-green-400/5"
                  : "border-white/20 hover:border-white/40 bg-white/5"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                  <span className="text-white/90 font-medium truncate max-w-xs">{file.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="text-white/40 hover:text-white/80 transition-colors ml-2"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-white/30 mx-auto mb-3" />
                  <p className="text-white/60 text-sm">
                    <span className="text-pink-400 font-medium">{t('verify.dropClick')}</span> {t('verify.dropDrag')}
                  </p>
                  <p className="text-white/30 text-xs mt-1">{t('verify.dropHint')}</p>
                </>
              )}
            </div>

            {/* Verify button */}
            <Button
              onClick={handleVerify}
              disabled={!file || verifying}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-6 text-lg rounded-xl transition-all duration-200 disabled:opacity-40"
            >
              {verifying ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('verify.verifying')}
                </span>
              ) : (
                t('verify.verifyBtn')
              )}
            </Button>

            {/* Result */}
            {result && result.found && (
              <div className="mt-6 p-5 bg-green-500/10 border border-green-400/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-6 h-6 text-green-400 mt-0.5 shrink-0" />
                <div className="space-y-2">
                  <p className="text-green-300 font-semibold">{t('verify.foundTitle')}</p>
                  <p className="text-green-200/70 text-sm">
                    {t('verify.foundDesc', {
                      title: result.title,
                      date: new Date(result.registeredAt!).toLocaleDateString(locale),
                    })}
                  </p>
                  {result.blockchainHash && result.ibsEvidenceId && (
                    <button
                      onClick={handleDownloadCertificate}
                      disabled={generating}
                      className="inline-flex items-center gap-1.5 text-sm text-pink-400 hover:text-pink-300 transition-colors disabled:opacity-50"
                    >
                      {generating
                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('dashboard.certificate.generating')}</>
                        : <><FileText className="w-4 h-4" /> {t('dashboard.certificate.pdfLabel')}</>
                      }
                    </button>
                  )}
                </div>
              </div>
            )}
            {result && !result.found && (
              <div className="mt-6 p-5 bg-amber-500/10 border border-amber-400/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="w-6 h-6 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 font-semibold">{t('verify.notFoundTitle')}</p>
                  <p className="text-amber-200/70 text-sm mt-1">{t('verify.notFoundDesc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">{t('verify.howTitle')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-5xl font-black bg-gradient-to-b from-pink-400/60 to-transparent bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Verify;
