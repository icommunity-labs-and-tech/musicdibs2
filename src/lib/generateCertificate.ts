import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import logoMusicdibs from '@/assets/logo_musicdibs.jpg'

// Paleta corporativa MusicDibs
const NAVY     = '#1A1C42'
const NAVY2    = '#13153A'
const PURPLE   = '#431884'
const BLUE_M   = '#3A50B0'
const BLUE_L   = '#5972C2'
const INDIGO_L = '#EEF2FF'
const INDIGO_T = '#3730A3'
const SILVER   = '#94A3B8'
const LGRAY    = '#E2E8F0'
const BGPAGE   = '#F8F9FF'

export interface CertificateData {
  title: string
  filename: string
  filesize: string
  fileType: string
  description?: string
  authorName: string
  authorDocId?: string
  certifiedAt: string
  network: string
  txHash: string
  fingerprint: string
  algorithm: string
  checkerUrl: string
  ibsUrl: string
  evidenceId: string
}

// ── CERTIFICATE LABELS PER LOCALE ────────────────────────────
interface CertLabels {
  headerTitle: string
  headerSub1: string
  headerSub2: string
  sectionContent: string
  titleLabel: string
  fileTypeLabel: string
  filenameLabel: string
  sizeLabel: string
  descriptionLabel: string
  sectionAuthor: string
  fullNameLabel: string
  docIdLabel: string
  sectionTransaction: string
  certDateLabel: string
  networkLabel: string
  txHashLabel: string
  fingerprintLabel: string
  sectionVerification: string
  checkerLabel: string
  ibsLabel: string
  badgeBlockchain: string
  badgeIbs: string
  footer1: string
  footer2: string
  filePrefix: string
}

const labelsMap: Record<string, CertLabels> = {
  es: {
    headerTitle: 'COMPROBANTE DE CERTIFICACIÓN',
    headerSub1: 'Musicdibs certifica que el siguiente documento',
    headerSub2: 'ha sido registrado en blockchain',
    sectionContent: '  DATOS DEL CONTENIDO',
    titleLabel: 'Título de la certificación',
    fileTypeLabel: 'Tipo de archivo',
    filenameLabel: 'Nombre del fichero',
    sizeLabel: 'Tamaño',
    descriptionLabel: 'Descripción de la obra',
    sectionAuthor: '  DATOS DEL AUTOR',
    fullNameLabel: 'Nombre completo',
    docIdLabel: 'Documento de identidad',
    sectionTransaction: '  DATOS DE LA TRANSACCIÓN',
    certDateLabel: 'Fecha de certificación',
    networkLabel: 'Red de blockchain',
    txHashLabel: 'Identificador de la transacción (TX Hash)',
    fingerprintLabel: 'Huella digital del archivo',
    sectionVerification: '  VERIFICACIÓN INDEPENDIENTE',
    checkerLabel: 'Checker blockchain explorer',
    ibsLabel: 'Evidencia en plataforma iBS',
    badgeBlockchain: '✓  VÁLIDO EN BLOCKCHAIN',
    badgeIbs: '⛓  CERTIFICADO iBS',
    footer1: 'Este certificado acredita el registro de propiedad intelectual en blockchain mediante iCommunity Blockchain Solutions.',
    footer2: 'La huella digital SHA-512 garantiza la inmutabilidad del registro. Documento válido según normativa de PI.',
    filePrefix: 'certificado-musicdibs',
  },
  en: {
    headerTitle: 'CERTIFICATION RECEIPT',
    headerSub1: 'Musicdibs certifies that the following document',
    headerSub2: 'has been registered on blockchain',
    sectionContent: '  CONTENT DATA',
    titleLabel: 'Certification title',
    fileTypeLabel: 'File type',
    filenameLabel: 'File name',
    sizeLabel: 'Size',
    descriptionLabel: 'Work description',
    sectionAuthor: '  AUTHOR DATA',
    fullNameLabel: 'Full name',
    docIdLabel: 'Identity document',
    sectionTransaction: '  TRANSACTION DATA',
    certDateLabel: 'Certification date',
    networkLabel: 'Blockchain network',
    txHashLabel: 'Transaction identifier (TX Hash)',
    fingerprintLabel: 'File fingerprint',
    sectionVerification: '  INDEPENDENT VERIFICATION',
    checkerLabel: 'Checker blockchain explorer',
    ibsLabel: 'Evidence on iBS platform',
    badgeBlockchain: '✓  VALID ON BLOCKCHAIN',
    badgeIbs: '⛓  iBS CERTIFIED',
    footer1: 'This certificate attests the intellectual property registration on blockchain via iCommunity Blockchain Solutions.',
    footer2: 'The SHA-512 fingerprint guarantees the immutability of the record. Document valid under IP regulations.',
    filePrefix: 'certificate-musicdibs',
  },
  'pt-BR': {
    headerTitle: 'COMPROVANTE DE CERTIFICAÇÃO',
    headerSub1: 'Musicdibs certifica que o seguinte documento',
    headerSub2: 'foi registrado em blockchain',
    sectionContent: '  DADOS DO CONTEÚDO',
    titleLabel: 'Título da certificação',
    fileTypeLabel: 'Tipo de arquivo',
    filenameLabel: 'Nome do arquivo',
    sizeLabel: 'Tamanho',
    descriptionLabel: 'Descrição da obra',
    sectionAuthor: '  DADOS DO AUTOR',
    fullNameLabel: 'Nome completo',
    docIdLabel: 'Documento de identidade',
    sectionTransaction: '  DADOS DA TRANSAÇÃO',
    certDateLabel: 'Data de certificação',
    networkLabel: 'Rede de blockchain',
    txHashLabel: 'Identificador da transação (TX Hash)',
    fingerprintLabel: 'Impressão digital do arquivo',
    sectionVerification: '  VERIFICAÇÃO INDEPENDENTE',
    checkerLabel: 'Checker blockchain explorer',
    ibsLabel: 'Evidência na plataforma iBS',
    badgeBlockchain: '✓  VÁLIDO NA BLOCKCHAIN',
    badgeIbs: '⛓  CERTIFICADO iBS',
    footer1: 'Este certificado comprova o registro de propriedade intelectual em blockchain através da iCommunity Blockchain Solutions.',
    footer2: 'A impressão digital SHA-512 garante a imutabilidade do registro. Documento válido conforme regulamentação de PI.',
    filePrefix: 'certificado-musicdibs',
  },
  fr: {
    headerTitle: 'ATTESTATION DE CERTIFICATION',
    headerSub1: 'Musicdibs certifie que le document suivant',
    headerSub2: 'a été enregistré sur la blockchain',
    sectionContent: '  DONNÉES DU CONTENU',
    titleLabel: 'Titre de la certification',
    fileTypeLabel: 'Type de fichier',
    filenameLabel: 'Nom du fichier',
    sizeLabel: 'Taille',
    descriptionLabel: 'Description de l\'œuvre',
    sectionAuthor: '  DONNÉES DE L\'AUTEUR',
    fullNameLabel: 'Nom complet',
    docIdLabel: 'Document d\'identité',
    sectionTransaction: '  DONNÉES DE LA TRANSACTION',
    certDateLabel: 'Date de certification',
    networkLabel: 'Réseau blockchain',
    txHashLabel: 'Identifiant de la transaction (TX Hash)',
    fingerprintLabel: 'Empreinte numérique du fichier',
    sectionVerification: '  VÉRIFICATION INDÉPENDANTE',
    checkerLabel: 'Checker blockchain explorer',
    ibsLabel: 'Preuve sur la plateforme iBS',
    badgeBlockchain: '✓  VALIDE SUR BLOCKCHAIN',
    badgeIbs: '⛓  CERTIFIÉ iBS',
    footer1: 'Ce certificat atteste l\'enregistrement de propriété intellectuelle sur blockchain via iCommunity Blockchain Solutions.',
    footer2: 'L\'empreinte SHA-512 garantit l\'immuabilité de l\'enregistrement. Document valide selon la réglementation PI.',
    filePrefix: 'certificat-musicdibs',
  },
  it: {
    headerTitle: 'RICEVUTA DI CERTIFICAZIONE',
    headerSub1: 'Musicdibs certifica che il seguente documento',
    headerSub2: 'è stato registrato su blockchain',
    sectionContent: '  DATI DEL CONTENUTO',
    titleLabel: 'Titolo della certificazione',
    fileTypeLabel: 'Tipo di file',
    filenameLabel: 'Nome del file',
    sizeLabel: 'Dimensione',
    descriptionLabel: 'Descrizione dell\'opera',
    sectionAuthor: '  DATI DELL\'AUTORE',
    fullNameLabel: 'Nome completo',
    docIdLabel: 'Documento d\'identità',
    sectionTransaction: '  DATI DELLA TRANSAZIONE',
    certDateLabel: 'Data di certificazione',
    networkLabel: 'Rete blockchain',
    txHashLabel: 'Identificativo della transazione (TX Hash)',
    fingerprintLabel: 'Impronta digitale del file',
    sectionVerification: '  VERIFICA INDIPENDENTE',
    checkerLabel: 'Checker blockchain explorer',
    ibsLabel: 'Evidenza sulla piattaforma iBS',
    badgeBlockchain: '✓  VALIDO SU BLOCKCHAIN',
    badgeIbs: '⛓  CERTIFICATO iBS',
    footer1: 'Questo certificato attesta la registrazione della proprietà intellettuale su blockchain tramite iCommunity Blockchain Solutions.',
    footer2: 'L\'impronta SHA-512 garantisce l\'immutabilità della registrazione. Documento valido secondo la normativa PI.',
    filePrefix: 'certificato-musicdibs',
  },
  de: {
    headerTitle: 'ZERTIFIZIERUNGSBELEG',
    headerSub1: 'Musicdibs bestätigt, dass das folgende Dokument',
    headerSub2: 'auf der Blockchain registriert wurde',
    sectionContent: '  INHALTSDATEN',
    titleLabel: 'Zertifizierungstitel',
    fileTypeLabel: 'Dateityp',
    filenameLabel: 'Dateiname',
    sizeLabel: 'Größe',
    descriptionLabel: 'Werkbeschreibung',
    sectionAuthor: '  AUTORDATEN',
    fullNameLabel: 'Vollständiger Name',
    docIdLabel: 'Ausweisdokument',
    sectionTransaction: '  TRANSAKTIONSDATEN',
    certDateLabel: 'Zertifizierungsdatum',
    networkLabel: 'Blockchain-Netzwerk',
    txHashLabel: 'Transaktionskennung (TX Hash)',
    fingerprintLabel: 'Digitaler Fingerabdruck der Datei',
    sectionVerification: '  UNABHÄNGIGE VERIFIZIERUNG',
    checkerLabel: 'Checker Blockchain Explorer',
    ibsLabel: 'Nachweis auf der iBS-Plattform',
    badgeBlockchain: '✓  GÜLTIG AUF BLOCKCHAIN',
    badgeIbs: '⛓  iBS ZERTIFIZIERT',
    footer1: 'Dieses Zertifikat bescheinigt die Registrierung geistigen Eigentums auf der Blockchain über iCommunity Blockchain Solutions.',
    footer2: 'Der SHA-512-Fingerabdruck gewährleistet die Unveränderlichkeit der Registrierung. Dokument gültig gemäß IP-Vorschriften.',
    filePrefix: 'zertifikat-musicdibs',
  },
}

function getLabels(locale?: string): CertLabels {
  if (!locale) return labelsMap.es
  if (labelsMap[locale]) return labelsMap[locale]
  const base = locale.split('-')[0]
  if (labelsMap[base]) return labelsMap[base]
  return labelsMap.es
}

export async function generateCertificate(data: CertificateData, locale?: string): Promise<void> {

  const L = getLabels(locale)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const M = 18, CX = M + 3

  // ── HELPERS ────────────────────────────────────────────────

  const rr = (
    x: number, y: number, w: number, h: number,
    r = 2,
    fill?: string, stroke?: string, lw = 0.5
  ) => {
    if (fill)   { doc.setFillColor(fill) }
    if (stroke) { doc.setDrawColor(stroke); doc.setLineWidth(lw) }
    const style = fill && stroke ? 'FD' : fill ? 'F' : 'D'
    doc.roundedRect(x, y, w, h, r, r, style)
  }

  const div = (y: number, x1 = CX, x2 = W - M) => {
    doc.setDrawColor(LGRAY)
    doc.setLineWidth(0.35)
    doc.line(x1, y, x2, y)
  }

  const lbl = (x: number, y: number, text: string) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(SILVER)
    doc.text(text.toUpperCase(), x, y)
  }

  const sectionHeader = (x: number, y: number, text: string): number => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    const tw = doc.getTextWidth(text) + 10
    rr(x - 2, y, tw, 7, 1.5, NAVY)
    doc.setTextColor('#FFFFFF')
    doc.text(text, x + 1, y + 4.8)
    return y + 12
  }

  // Badge helper — corrected vertical text centering
  const badge = (
    x: number, y: number, text: string,
    fill: string, stroke: string, tc: string,
    bh = 6.5, r = 1.5, sz = 7.5
  ): number => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(sz)
    const tw = doc.getTextWidth(text)
    const bw = tw + 8
    rr(x, y, bw, bh, r, fill, stroke, 0.5)
    doc.setTextColor(tc)
    const fontMm = sz * 0.3528
    doc.text(text, x + (bw - tw) / 2, y + (bh + fontMm * 0.7) / 2)
    return bw
  }

  const makeQR = async (url: string, dark = '#1A1C42'): Promise<string> => {
    return await QRCode.toDataURL(url, {
      width: 256,
      margin: 1,
      color: { dark, light: '#FFFFFF' }
    })
  }

  const makeGradient = (
    widthPx: number, heightPx: number,
    colorLeft: string, colorRight: string
  ): string => {
    const canvas = document.createElement('canvas')
    canvas.width = widthPx; canvas.height = heightPx
    const ctx = canvas.getContext('2d')!
    const grad = ctx.createLinearGradient(0, 0, widthPx, 0)
    grad.addColorStop(0, colorLeft)
    grad.addColorStop(1, colorRight)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, widthPx, heightPx)
    return canvas.toDataURL('image/png')
  }

  const imgToBase64 = async (src: string): Promise<string> => {
    const res = await fetch(src)
    const blob = await res.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  }

  const truncateText = (text: string, maxWidth: number): string => {
    if (doc.getTextWidth(text) <= maxWidth) return text
    let t = text
    while (t.length > 3 && doc.getTextWidth(t + '…') > maxWidth) {
      t = t.slice(0, -1)
    }
    return t + '…'
  }

  // ── PRE-GENERAR ASSETS ─────────────────────────────────────
  const [qr1DataUrl, qr2DataUrl, logoDataUrl] = await Promise.all([
    makeQR(data.checkerUrl, NAVY),
    makeQR(data.ibsUrl, PURPLE),
    imgToBase64(logoMusicdibs),
  ])

  const logoFormat = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'

  const gradHeader  = makeGradient(630, 150, PURPLE, NAVY)
  const gradFooter  = makeGradient(630, 50,  PURPLE, NAVY)

  const makeWatermark = (pageW: number, pageH: number): string => {
    const scale = 3
    const canvas = document.createElement('canvas')
    canvas.width = pageW * scale
    canvas.height = pageH * scale
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-35 * Math.PI / 180)
    ctx.font = `bold ${42 * scale}px Helvetica, Arial, sans-serif`
    ctx.fillStyle = 'rgba(26, 28, 66, 0.04)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let row = -3; row <= 3; row++) {
      for (let col = -2; col <= 2; col++) {
        ctx.fillText('MUSICDIBS', col * 220 * scale, row * 80 * scale)
      }
    }
    ctx.restore()
    return canvas.toDataURL('image/png')
  }

  const watermarkImg = makeWatermark(W, H)

  // ── FONDO ──────────────────────────────────────────────────
  doc.setFillColor(BGPAGE)
  doc.rect(0, 0, W, H, 'F')

  doc.addImage(watermarkImg, 'PNG', 0, 0, W, H)

  const lateralColors = [PURPLE, BLUE_M, BLUE_L, '#8090D0', LGRAY]
  lateralColors.forEach((color, i) => {
    doc.setFillColor(color)
    doc.rect(0, 0, (5 - i), H, 'F')
  })

  // ── CABECERA ───────────────────────────────────────────────
  const headerH = 50
  doc.addImage(gradHeader, 'PNG', 0, 0, W, headerH)

  doc.setFillColor(BLUE_L)
  doc.rect(0, headerH - 1.5, W, 1.5, 'F')

  const logoAspect = 701 / 486
  const logoH = 22, logoW = logoH * logoAspect
  const logoX = M + 2, logoY = (headerH - logoH) / 2
  rr(logoX - 2, logoY - 1, logoW + 4, logoH + 2, 2, NAVY2)
  doc.addImage(logoDataUrl, logoFormat, logoX, logoY, logoW, logoH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor('#FFFFFF')
  doc.text(L.headerTitle, W - M, 16, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#C4C8F0')
  doc.text(L.headerSub1, W - M, 22.5, { align: 'right' })
  doc.text(L.headerSub2, W - M, 27, { align: 'right' })

  rr(W - M - 52, 32, 52, 7, 1.5, NAVY2)
  doc.setFont('courier', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#C4C8F0')
  doc.text(`CERT · ${data.evidenceId}`, W - M - 2, 37, { align: 'right' })

  // ── CUERPO ─────────────────────────────────────────────────
  let y = headerH + 9
  const col2 = W / 2 + 2
  const maxTitleW = col2 - CX - 4
  const maxCol2W = W - M - col2 - 2

  // ═══ DATOS DEL CONTENIDO ═══════════════════════════════════
  y = sectionHeader(CX, y, L.sectionContent)

  lbl(CX, y, L.titleLabel)
  lbl(col2, y, L.fileTypeLabel)
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(NAVY)
  const titleLines = doc.splitTextToSize(data.title, maxTitleW)
  doc.text(titleLines.slice(0, 2), CX, y)
  badge(col2, y - 4.5, data.fileType, '#EEF2FF', '#6366F1', '#4338CA')
  y += titleLines.length > 1 ? 12 : 7

  lbl(CX, y, L.filenameLabel)
  lbl(col2, y, L.sizeLabel)
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#334155')
  doc.text(truncateText(data.filename, maxTitleW), CX, y)
  doc.text(data.filesize, col2, y)
  y += 7

  if (data.description) {
    lbl(CX, y, L.descriptionLabel)
    y += 4.5
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor('#475569')
    const descLines = doc.splitTextToSize(data.description, W - CX - M - 6)
    const visibleLines = descLines.slice(0, 3)
    const boxH = Math.max(10, visibleLines.length * 4 + 4)
    rr(CX - 2, y, W - CX - M + 2, boxH, 1.5, '#F0F2FF', '#C7D2FE', 0.4)
    doc.text(visibleLines, CX + 2, y + 4)
    y += boxH + 5
  }

  div(y); y += 9

  // ═══ DATOS DEL AUTOR ═══════════════════════════════════════
  y = sectionHeader(CX, y, L.sectionAuthor)

  lbl(CX, y, L.fullNameLabel)
  if (data.authorDocId) lbl(col2, y, L.docIdLabel)
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(NAVY)
  doc.text(truncateText(data.authorName, maxTitleW), CX, y)
  if (data.authorDocId) {
    badge(col2, y - 4.5, data.authorDocId, LGRAY, LGRAY, '#334155')
  }
  y += 14

  div(y); y += 9

  // ═══ DATOS DE LA TRANSACCIÓN ════════════════════════════════
  y = sectionHeader(CX, y, L.sectionTransaction)

  lbl(CX, y, L.certDateLabel)
  lbl(col2, y, L.networkLabel)
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(NAVY)
  doc.text(data.certifiedAt, CX, y)
  badge(col2, y - 4.5, data.network, '#EEEEFF', BLUE_L, BLUE_M)
  y += 8

  lbl(CX, y, L.txHashLabel)
  y += 5
  const hashBoxW = W - CX - M + 2
  rr(CX - 2, y, hashBoxW, 13, 2, NAVY)
  doc.setFont('courier', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor('#FFFFFF')
  const hashMaxChars = Math.floor(hashBoxW / 2.2)
  if (data.txHash.length > hashMaxChars) {
    doc.text(data.txHash.slice(0, hashMaxChars), CX + 3, y + 4)
    doc.text(data.txHash.slice(hashMaxChars), CX + 3, y + 9)
  } else {
    doc.text(data.txHash, CX + 3, y + 7)
  }
  y += 16

  lbl(CX, y, `${L.fingerprintLabel} · ${data.algorithm}`)
  y += 5
  rr(CX - 2, y, hashBoxW, 13, 2, INDIGO_L, '#C7D2FE', 0.4)
  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(INDIGO_T)
  if (data.fingerprint.length > hashMaxChars) {
    doc.text(data.fingerprint.slice(0, hashMaxChars), CX + 3, y + 4)
    doc.text(data.fingerprint.slice(hashMaxChars), CX + 3, y + 9)
  } else {
    doc.text(data.fingerprint, CX + 3, y + 7)
  }
  y += 16

  div(y); y += 9

  // ═══ VERIFICACIÓN — 2 QRs ═══════════════════════════════════
  y = sectionHeader(CX, y, L.sectionVerification)

  const qrSz = 29
  const qrBoxSz = qrSz + 3

  rr(CX - 1.5, y, qrBoxSz, qrBoxSz, 2, NAVY)
  doc.addImage(qr1DataUrl, 'PNG', CX, y + 1.5, qrSz, qrSz)

  const tx1 = CX + qrBoxSz + 4
  const labelW1 = W / 2 - tx1 - 2
  lbl(tx1, y + 3, L.checkerLabel)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(NAVY)
  doc.text('iCommunity Checker', tx1, y + 9)
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(BLUE_M)
  const url1Lines = doc.splitTextToSize(data.checkerUrl, labelW1)
  doc.text(url1Lines.slice(0, 2), tx1, y + 14)
  badge(tx1, y + 23, L.badgeBlockchain, '#ECFDF5', '#059669', '#059669', 5.5, 1.5, 6.5)

  const q2x = W / 2 + 2
  rr(q2x - 1.5, y, qrBoxSz, qrBoxSz, 2, NAVY)
  doc.addImage(qr2DataUrl, 'PNG', q2x, y + 1.5, qrSz, qrSz)

  const tx2 = q2x + qrBoxSz + 4
  const labelW2 = W - M - tx2 - 2
  lbl(tx2, y + 3, L.ibsLabel)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(NAVY)
  doc.text('Panel iCommunity Labs', tx2, y + 9)
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(BLUE_M)
  const url2Lines = doc.splitTextToSize(data.ibsUrl, labelW2)
  doc.text(url2Lines.slice(0, 2), tx2, y + 14)
  badge(tx2, y + 23, L.badgeIbs, '#EEF2FF', '#6366F1', '#4338CA', 5.5, 1.5, 6.5)

  // ── FOOTER ─────────────────────────────────────────────────
  const footerH = 15
  const footerY = H - footerH
  doc.addImage(gradFooter, 'PNG', 0, footerY, W, footerH)

  doc.setFillColor(BLUE_L)
  doc.rect(0, footerY, W, 1.2, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor('#C4C8F0')
  doc.text(L.footer1, M + 3, footerY + 6)
  doc.text(L.footer2, M + 3, footerY + 10)

  const footLogoH = 11
  const footLogoW = footLogoH * logoAspect
  doc.addImage(logoDataUrl, logoFormat, W - M - footLogoW, footerY + 2, footLogoW, footLogoH)

  // ── GUARDAR ────────────────────────────────────────────────
  const safeName = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
  doc.save(`${L.filePrefix}-${safeName}.pdf`)
}
