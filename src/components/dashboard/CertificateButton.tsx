import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateCertificate, CertificateData } from '@/lib/generateCertificate'
import { useTranslation } from 'react-i18next'

interface Props {
  work: {
    id: string
    title: string
    original_filename?: string
    file_size?: number
    type: string
    description?: string
    blockchain_hash: string
    blockchain_network: string
    checker_url?: string
    ibs_evidence_id: string
    certified_at?: string
    created_at: string
  }
  authorName: string
  authorDocId?: string
}

export function CertificateButton({ work, authorName, authorDocId }: Props) {
  const [generating, setGenerating] = useState(false)
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage === 'pt-BR' ? 'pt-BR' : (i18n.resolvedLanguage || i18n.language || 'es')

  // Solo visible si la obra está certificada
  if (!work.blockchain_hash || !work.ibs_evidence_id) return null

  const handleDownload = async () => {
    setGenerating(true)
    try {
      const network = work.blockchain_network || 'Polygon'
      const checkerNetwork = ['fantom_opera_mainnet', 'fantom', 'opera'].includes(network.toLowerCase())
        ? 'opera'
        : network.toLowerCase()

      const certData: CertificateData = {
        title:       work.title,
        filename:    work.original_filename || `${work.title}.mp3`,
        filesize:    work.file_size
                       ? `${work.file_size.toLocaleString(locale)} bytes`
                       : t('dashboard.certificate.notAvailable'),
        fileType:    work.type || t('dashboard.certificate.fileTypeFallback'),
        description: work.description || undefined,
        authorName,
        authorDocId,
        certifiedAt: new Date(work.certified_at || work.created_at).toLocaleDateString(locale, {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        }),
        network,
        txHash:      work.blockchain_hash,
        fingerprint: work.blockchain_hash,
        algorithm:   'base64 SHA-512',
        checkerUrl:  work.checker_url ||
          `https://checker.icommunitylabs.com/check/${checkerNetwork}/${work.blockchain_hash}`,
        ibsUrl:      `https://app.icommunitylabs.com/evidences/${work.ibs_evidence_id}`,
        evidenceId:  work.ibs_evidence_id,
      }
      await generateCertificate(certData, locale)
      toast.success(t('dashboard.certificate.downloadSuccess'))
    } catch (e) {
      console.error(e)
      toast.error(t('dashboard.certificate.generateError'))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={generating}
      className="gap-2"
    >
      {generating
        ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('dashboard.certificate.generating')}</>
        : <><FileText className="h-4 w-4" /> {t('dashboard.certificate.pdfLabel')}</>
      }
    </Button>
  )
}
