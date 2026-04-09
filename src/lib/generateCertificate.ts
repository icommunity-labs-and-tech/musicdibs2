import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import logoMusicdibs from '@/assets/logo_musicdibs.jpg'

// ── Premium Legal Palette ────────────────────────────────────
const BLACK    = '#111111'
const GRAY_D   = '#444444'
const GRAY_L   = '#EAEAEA'
const GRAY_M   = '#999999'
const RED_CORP = '#E8364E' // MusicDibs corporate red/pink
const WHITE    = '#FFFFFF'
const BG_PAGE  = '#FAFAFA'

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
  headerSub: string
  headerIntro: string
  sectionContent: string
  titleLabel: string
  filenameLabel: string
  sizeLabel: string
  descriptionLabel: string
  sectionTransaction: string
  certDateLabel: string
  txIdLabel: string
  fingerprintLabel: string
  networkLabel: string
  algorithmLabel: string
  sectionVerification: string
  verificationText: string
  verifyQrLabel: string
  badgeBlockchain: string
  badgeSeal: string
  legalLine: string
  footerPowered: string
  filePrefix: string
}

const labelsMap: Record<string, CertLabels> = {
  es: {
    headerTitle: 'COMPROBANTE DE CERTIFICACIÓN',
    headerSub: 'Certificación de registro en blockchain',
    headerIntro: 'MusicDibs certifica que el siguiente contenido ha sido registrado en una red blockchain, garantizando su integridad, trazabilidad y existencia en el tiempo.',
    sectionContent: 'Datos del contenido',
    titleLabel: 'Título de la canción',
    filenameLabel: 'Nombre del fichero',
    sizeLabel: 'Tamaño del fichero',
    descriptionLabel: 'Descripción',
    sectionTransaction: 'Datos de la transacción',
    certDateLabel: 'Fecha de registro',
    txIdLabel: 'Identificador de la transacción',
    fingerprintLabel: 'Huella digital (hash)',
    networkLabel: 'Red',
    algorithmLabel: 'Algoritmo',
    sectionVerification: 'Verificación blockchain',
    verificationText: 'Este certificado puede ser verificado de forma independiente mediante el identificador de transacción y su huella digital. La información contenida en este documento es inmutable y ha sido registrada en blockchain.',
    verifyQrLabel: 'Verificar certificado',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Certificado digital inmutable',
    legalLine: 'Este documento constituye evidencia digital verificable mediante tecnología blockchain.',
    footerPowered: 'powered by iCommunity',
    filePrefix: 'certificado-musicdibs',
  },
  en: {
    headerTitle: 'CERTIFICATION RECEIPT',
    headerSub: 'Blockchain registration certificate',
    headerIntro: 'MusicDibs certifies that the following content has been registered on a blockchain network, ensuring its integrity, traceability and existence over time.',
    sectionContent: 'Content data',
    titleLabel: 'Song title',
    filenameLabel: 'File name',
    sizeLabel: 'File size',
    descriptionLabel: 'Description',
    sectionTransaction: 'Transaction data',
    certDateLabel: 'Registration date',
    txIdLabel: 'Transaction identifier',
    fingerprintLabel: 'Digital fingerprint (hash)',
    networkLabel: 'Network',
    algorithmLabel: 'Algorithm',
    sectionVerification: 'Blockchain verification',
    verificationText: 'This certificate can be independently verified using the transaction identifier and digital fingerprint. The information in this document is immutable and has been registered on blockchain.',
    verifyQrLabel: 'Verify certificate',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Immutable digital certificate',
    legalLine: 'This document constitutes verifiable digital evidence through blockchain technology.',
    footerPowered: 'powered by iCommunity',
    filePrefix: 'certificate-musicdibs',
  },
  'pt-BR': {
    headerTitle: 'COMPROVANTE DE CERTIFICAÇÃO',
    headerSub: 'Certificação de registro em blockchain',
    headerIntro: 'MusicDibs certifica que o seguinte conteúdo foi registrado em uma rede blockchain, garantindo sua integridade, rastreabilidade e existência ao longo do tempo.',
    sectionContent: 'Dados do conteúdo',
    titleLabel: 'Título da música',
    filenameLabel: 'Nome do arquivo',
    sizeLabel: 'Tamanho do arquivo',
    descriptionLabel: 'Descrição',
    sectionTransaction: 'Dados da transação',
    certDateLabel: 'Data de registro',
    txIdLabel: 'Identificador da transação',
    fingerprintLabel: 'Impressão digital (hash)',
    networkLabel: 'Rede',
    algorithmLabel: 'Algoritmo',
    sectionVerification: 'Verificação blockchain',
    verificationText: 'Este certificado pode ser verificado de forma independente por meio do identificador de transação e sua impressão digital. As informações contidas neste documento são imutáveis e foram registradas em blockchain.',
    verifyQrLabel: 'Verificar certificado',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Certificado digital imutável',
    legalLine: 'Este documento constitui evidência digital verificável mediante tecnologia blockchain.',
    footerPowered: 'powered by iCommunity',
    filePrefix: 'certificado-musicdibs',
  },
  fr: {
    headerTitle: 'ATTESTATION DE CERTIFICATION',
    headerSub: 'Certification d\'enregistrement blockchain',
    headerIntro: 'MusicDibs certifie que le contenu suivant a été enregistré sur un réseau blockchain, garantissant son intégrité, sa traçabilité et son existence dans le temps.',
    sectionContent: 'Données du contenu',
    titleLabel: 'Titre de la chanson',
    filenameLabel: 'Nom du fichier',
    sizeLabel: 'Taille du fichier',
    descriptionLabel: 'Description',
    sectionTransaction: 'Données de la transaction',
    certDateLabel: 'Date d\'enregistrement',
    txIdLabel: 'Identifiant de la transaction',
    fingerprintLabel: 'Empreinte numérique (hash)',
    networkLabel: 'Réseau',
    algorithmLabel: 'Algorithme',
    sectionVerification: 'Vérification blockchain',
    verificationText: 'Ce certificat peut être vérifié de manière indépendante au moyen de l\'identifiant de transaction et de son empreinte numérique. Les informations contenues dans ce document sont immuables et ont été enregistrées sur la blockchain.',
    verifyQrLabel: 'Vérifier le certificat',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Certificat numérique immuable',
    legalLine: 'Ce document constitue une preuve numérique vérifiable grâce à la technologie blockchain.',
    footerPowered: 'powered by iCommunity',
    filePrefix: 'certificat-musicdibs',
  },
  it: {
    headerTitle: 'RICEVUTA DI CERTIFICAZIONE',
    headerSub: 'Certificazione di registrazione blockchain',
    headerIntro: 'MusicDibs certifica che il seguente contenuto è stato registrato su una rete blockchain, garantendone l\'integrità, la tracciabilità e l\'esistenza nel tempo.',
    sectionContent: 'Dati del contenuto',
    titleLabel: 'Titolo del brano',
    filenameLabel: 'Nome del file',
    sizeLabel: 'Dimensione del file',
    descriptionLabel: 'Descrizione',
    sectionTransaction: 'Dati della transazione',
    certDateLabel: 'Data di registrazione',
    txIdLabel: 'Identificativo della transazione',
    fingerprintLabel: 'Impronta digitale (hash)',
    networkLabel: 'Rete',
    algorithmLabel: 'Algoritmo',
    sectionVerification: 'Verifica blockchain',
    verificationText: 'Questo certificato può essere verificato in modo indipendente tramite l\'identificativo della transazione e la sua impronta digitale. Le informazioni contenute in questo documento sono immutabili e sono state registrate su blockchain.',
    verifyQrLabel: 'Verifica certificato',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Certificato digitale immutabile',
    legalLine: 'Questo documento costituisce evidenza digitale verificabile mediante tecnologia blockchain.',
    footerPowered: 'powered by iCommunity',
    filePrefix: 'certificato-musicdibs',
  },
  de: {
    headerTitle: 'ZERTIFIZIERUNGSBELEG',
    headerSub: 'Blockchain-Registrierungszertifikat',
    headerIntro: 'MusicDibs bestätigt, dass der folgende Inhalt in einem Blockchain-Netzwerk registriert wurde und damit seine Integrität, Rückverfolgbarkeit und zeitliche Existenz gewährleistet.',
    sectionContent: 'Inhaltsdaten',
    titleLabel: 'Songtitel',
    filenameLabel: 'Dateiname',
    sizeLabel: 'Dateigröße',
    descriptionLabel: 'Beschreibung',
    sectionTransaction: 'Transaktionsdaten',
    certDateLabel: 'Registrierungsdatum',
    txIdLabel: 'Transaktionskennung',
    fingerprintLabel: 'Digitaler Fingerabdruck (Hash)',
    networkLabel: 'Netzwerk',
    algorithmLabel: 'Algorithmus',
    sectionVerification: 'Blockchain-Verifizierung',
    verificationText: 'Dieses Zertifikat kann unabhängig anhand der Transaktionskennung und des digitalen Fingerabdrucks verifiziert werden. Die in diesem Dokument enthaltenen Informationen sind unveränderlich und wurden auf der Blockchain registriert.',
    verifyQrLabel: 'Zertifikat verifizieren',
    badgeBlockchain: 'Blockchain Verified',
    badgeSeal: 'Unveränderliches digitales Zertifikat',
    legalLine: 'Dieses Dokument stellt eine überprüfbare digitale Evidenz mittels Blockchain-Technologie dar.',
    footerPowered: 'powered by iCommunity',
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
  const ML = 22, MR = 22
  const contentW = W - ML - MR

  // ── HELPERS ────────────────────────────────────────────────
  const hex = (c: string) => doc.setTextColor(c)
  const font = (name: string, style: string, size: number) => {
    doc.setFont(name, style)
    doc.setFontSize(size)
  }

  const redLine = (y: number) => {
    doc.setDrawColor(RED_CORP)
    doc.setLineWidth(0.6)
    doc.line(ML, y, W - MR, y)
  }

  const grayLine = (y: number) => {
    doc.setDrawColor(GRAY_L)
    doc.setLineWidth(0.3)
    doc.line(ML, y, W - MR, y)
  }

  const labelValue = (y: number, label: string, value: string, mono = false): number => {
    font('helvetica', 'normal', 7.5)
    hex(GRAY_D)
    doc.text(label, ML, y)
    y += 4.5
    font(mono ? 'courier' : 'helvetica', mono ? 'normal' : 'bold', mono ? 7.5 : 9.5)
    hex(BLACK)
    const lines = doc.splitTextToSize(value, contentW)
    const visible = lines.slice(0, 3)
    doc.text(visible, ML, y)
    return y + visible.length * (mono ? 3.8 : 4.5) + 3
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

  // ── PRE-GENERATE ASSETS ───────────────────────────────────
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(data.checkerUrl, {
      width: 300, margin: 1,
      color: { dark: BLACK, light: WHITE },
    }),
    imgToBase64(logoMusicdibs),
  ])
  const logoFormat = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'

  // ── WATERMARK (center logo, very low opacity) ─────────────
  const makeWatermark = (): string => {
    const scale = 3
    const canvas = document.createElement('canvas')
    canvas.width = W * scale
    canvas.height = H * scale
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Large centered "MUSICDIBS" text as watermark
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate(-25 * Math.PI / 180)
    ctx.font = `bold ${60 * scale}px Helvetica, Arial, sans-serif`
    ctx.fillStyle = 'rgba(17, 17, 17, 0.025)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('MUSICDIBS', 0, 0)

    // Smaller repeated check marks
    ctx.font = `${30 * scale}px Helvetica, Arial, sans-serif`
    ctx.fillStyle = 'rgba(17, 17, 17, 0.018)'
    ctx.fillText('✓', 0, 55 * scale)
    ctx.restore()
    return canvas.toDataURL('image/png')
  }

  const watermarkImg = makeWatermark()

  // ── PAGE BACKGROUND ───────────────────────────────────────
  doc.setFillColor(BG_PAGE)
  doc.rect(0, 0, W, H, 'F')
  doc.addImage(watermarkImg, 'PNG', 0, 0, W, H)

  // ═══════════════════════════════════════════════════════════
  // ── HEADER ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  let y = 20

  // Left: Title
  font('helvetica', 'bold', 16)
  hex(BLACK)
  doc.text(L.headerTitle, ML, y)
  y += 5.5

  font('helvetica', 'normal', 9)
  hex(GRAY_D)
  doc.text(L.headerSub, ML, y)

  // Right: Logo
  const logoAspect = 701 / 486
  const logoH = 14
  const logoW = logoH * logoAspect
  doc.addImage(logoDataUrl, logoFormat, W - MR - logoW, 12, logoW, logoH)

  y += 8

  // Intro text
  font('helvetica', 'normal', 8)
  hex(GRAY_D)
  const introLines = doc.splitTextToSize(L.headerIntro, contentW)
  doc.text(introLines, ML, y)
  y += introLines.length * 3.8 + 4

  // Red horizontal line
  redLine(y)
  y += 10

  // ═══════════════════════════════════════════════════════════
  // ── SECTION 1: CONTENT DATA ───────────────────────────────
  // ═══════════════════════════════════════════════════════════

  font('helvetica', 'bold', 10)
  hex(BLACK)
  doc.text(L.sectionContent, ML, y)
  y += 8

  y = labelValue(y, L.titleLabel, data.title)
  y = labelValue(y, L.filenameLabel, data.filename)
  y = labelValue(y, L.sizeLabel, data.filesize)

  if (data.description) {
    font('helvetica', 'normal', 7.5)
    hex(GRAY_D)
    doc.text(L.descriptionLabel + ':', ML, y)
    y += 5
    font('helvetica', 'normal', 8.5)
    hex(BLACK)
    const descLines = doc.splitTextToSize(data.description, contentW)
    const visibleDesc = descLines.slice(0, 6)
    doc.text(visibleDesc, ML, y)
    y += visibleDesc.length * 4 + 4
  }

  // ═══════════════════════════════════════════════════════════
  // ── SECTION 2: TRANSACTION DATA ───────────────────────────
  // ═══════════════════════════════════════════════════════════

  redLine(y)
  y += 10

  font('helvetica', 'bold', 10)
  hex(BLACK)
  doc.text(L.sectionTransaction, ML, y)
  y += 8

  y = labelValue(y, L.certDateLabel, data.certifiedAt)

  // TX ID
  font('helvetica', 'normal', 7.5)
  hex(GRAY_D)
  doc.text(L.txIdLabel + ':', ML, y)
  y += 5
  font('courier', 'normal', 7.5)
  hex(BLACK)
  const txLines = doc.splitTextToSize(data.txHash, contentW)
  doc.text(txLines.slice(0, 2), ML, y)
  y += txLines.slice(0, 2).length * 3.8 + 4

  // Fingerprint (hash)
  font('helvetica', 'normal', 7.5)
  hex(GRAY_D)
  doc.text(L.fingerprintLabel + ':', ML, y)
  y += 5
  font('courier', 'normal', 7.5)
  hex(BLACK)
  const fpLines = doc.splitTextToSize(data.fingerprint, contentW)
  doc.text(fpLines.slice(0, 2), ML, y)
  y += fpLines.slice(0, 2).length * 3.8 + 4

  // Network & algorithm on same line
  font('helvetica', 'normal', 7.5)
  hex(GRAY_D)
  doc.text(L.networkLabel + ':', ML, y)
  font('helvetica', 'bold', 8.5)
  hex(BLACK)
  doc.text(data.network, ML + doc.getTextWidth(L.networkLabel + ':  ') + 2, y)

  const algoX = ML + 60
  font('helvetica', 'normal', 7.5)
  hex(GRAY_D)
  doc.text(L.algorithmLabel + ':', algoX, y)
  font('helvetica', 'bold', 8.5)
  hex(BLACK)
  doc.text(data.algorithm, algoX + doc.getTextWidth(L.algorithmLabel + ':  ') + 2, y)
  y += 10

  // ═══════════════════════════════════════════════════════════
  // ── VALIDATION BLOCK (Premium Seal) ───────────────────────
  // ═══════════════════════════════════════════════════════════

  redLine(y)
  y += 8

  // Light gray background block
  const blockH = 38
  doc.setFillColor('#F4F4F4')
  doc.roundedRect(ML, y, contentW, blockH, 2, 2, 'F')

  // Border left accent
  doc.setFillColor(RED_CORP)
  doc.rect(ML, y, 1.2, blockH, 'F')

  const blockPad = 6
  let by = y + blockPad

  font('helvetica', 'bold', 9.5)
  hex(BLACK)
  doc.text(L.sectionVerification, ML + blockPad, by)
  by += 6

  font('helvetica', 'normal', 7.5)
  hex(GRAY_D)
  const verLines = doc.splitTextToSize(L.verificationText, contentW - blockPad * 2 - 32)
  doc.text(verLines.slice(0, 4), ML + blockPad, by)

  // QR inside the block, right side
  const qrSz = 26
  const qrX = W - MR - qrSz - blockPad + 2
  const qrY = y + (blockH - qrSz - 6) / 2
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSz, qrSz)

  font('helvetica', 'normal', 6)
  hex(GRAY_M)
  doc.text(L.verifyQrLabel, qrX + qrSz / 2, qrY + qrSz + 4, { align: 'center' })

  y += blockH + 8

  // ── BADGES ────────────────────────────────────────────────
  // "Blockchain Verified" badge
  font('helvetica', 'bold', 7.5)
  const bvText = `✓  ${L.badgeBlockchain}`
  const bvW = doc.getTextWidth(bvText) + 10
  doc.setFillColor('#111111')
  doc.roundedRect(ML, y, bvW, 7, 1.5, 1.5, 'F')
  hex(WHITE)
  doc.text(bvText, ML + 5, y + 4.8)

  // "Certificado digital inmutable" seal
  font('helvetica', 'normal', 7)
  const sealText = `⛓  ${L.badgeSeal}`
  const sealW = doc.getTextWidth(sealText) + 10
  doc.setDrawColor(GRAY_D)
  doc.setLineWidth(0.4)
  doc.roundedRect(ML + bvW + 4, y, sealW, 7, 1.5, 1.5, 'D')
  hex(GRAY_D)
  doc.text(sealText, ML + bvW + 4 + 5, y + 4.8)

  y += 14

  // ── LEGAL LINE ────────────────────────────────────────────
  font('helvetica', 'italic', 7)
  hex(GRAY_M)
  doc.text(L.legalLine, W / 2, y, { align: 'center' })

  // ═══════════════════════════════════════════════════════════
  // ── FOOTER ────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════

  const footerY = H - 14

  grayLine(footerY)

  font('helvetica', 'normal', 7)
  hex(GRAY_M)
  doc.text('musicdibs.com', ML, footerY + 6)

  font('helvetica', 'normal', 6.5)
  hex(GRAY_M)
  doc.text(`ID: ${data.evidenceId}`, W / 2, footerY + 6, { align: 'center' })

  font('helvetica', 'italic', 6.5)
  hex(GRAY_M)
  doc.text(L.footerPowered, W - MR, footerY + 6, { align: 'right' })

  // ── SAVE ──────────────────────────────────────────────────
  const safeName = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
  doc.save(`${L.filePrefix}-${safeName}.pdf`)
}
