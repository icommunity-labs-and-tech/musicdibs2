import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import logoMusicdibs from '@/assets/logo_musicdibs_black.jpg'

// ── Palette ──────────────────────────────────────────────────
const BLACK   = '#111111'
const GRAY_D  = '#444444'
const GRAY_M  = '#999999'
const RED_CORP = '#E8364E'
const WHITE   = '#FFFFFF'

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

// ── Labels per locale ────────────────────────────────────────
interface CertLabels {
  headerTitle: string
  headerIntro: string
  sectionContent: string
  titleLabel: string
  filenameLabel: string
  sizeLabel: string
  descriptionLabel: string
  sectionAuthor: string
  authorNameLabel: string
  authorDocLabel: string
  sectionTransaction: string
  txIdLabel: string
  fingerprintLabel: string
  algorithmLabel: string
  networkLabel: string
  dateLabel: string
  verifyLabel: string
  footerPowered: string
  filePrefix: string
}

const labelsMap: Record<string, CertLabels> = {
  es: {
    headerTitle: 'Comprobante de certificación',
    headerIntro: 'Musicdibs certifica que el siguiente documento ha sido registrado en blockchain',
    sectionContent: 'Datos del contenido',
    titleLabel: 'Título de la certificación:',
    filenameLabel: 'Nombre del fichero:',
    sizeLabel: 'Tamaño del fichero:',
    descriptionLabel: 'Descripción:',
    sectionAuthor: 'Datos del autor',
    authorNameLabel: 'Nombre:',
    authorDocLabel: 'Documento:',
    sectionTransaction: 'Datos de la transacción',
    txIdLabel: 'Identificador de la transacción:',
    fingerprintLabel: 'Huella digital del archivo:',
    algorithmLabel: 'Algoritmo de huella digital:',
    networkLabel: 'Red de blockchain:',
    dateLabel: 'Fecha:',
    verifyLabel: 'Verificar',
    footerPowered: 'powered by',
    filePrefix: 'certificado-musicdibs',
  },
  en: {
    headerTitle: 'Certification receipt',
    headerIntro: 'Musicdibs certifies that the following document has been registered on blockchain',
    sectionContent: 'Content data',
    titleLabel: 'Certification title:',
    filenameLabel: 'File name:',
    sizeLabel: 'File size:',
    descriptionLabel: 'Description:',
    sectionAuthor: 'Author data',
    authorNameLabel: 'Name:',
    authorDocLabel: 'Document:',
    sectionTransaction: 'Transaction data',
    txIdLabel: 'Transaction identifier:',
    fingerprintLabel: 'File digital fingerprint:',
    algorithmLabel: 'Fingerprint algorithm:',
    networkLabel: 'Blockchain network:',
    dateLabel: 'Date:',
    verifyLabel: 'Verify',
    footerPowered: 'powered by',
    filePrefix: 'certificate-musicdibs',
  },
  'pt-BR': {
    headerTitle: 'Comprovante de certificação',
    headerIntro: 'Musicdibs certifica que o seguinte documento foi registrado em blockchain',
    sectionContent: 'Dados do conteúdo',
    titleLabel: 'Título da certificação:',
    filenameLabel: 'Nome do arquivo:',
    sizeLabel: 'Tamanho do arquivo:',
    descriptionLabel: 'Descrição:',
    sectionAuthor: 'Dados do autor',
    authorNameLabel: 'Nome:',
    authorDocLabel: 'Documento:',
    sectionTransaction: 'Dados da transação',
    txIdLabel: 'Identificador da transação:',
    fingerprintLabel: 'Impressão digital do arquivo:',
    algorithmLabel: 'Algoritmo de impressão digital:',
    networkLabel: 'Rede de blockchain:',
    dateLabel: 'Data:',
    verifyLabel: 'Verificar',
    footerPowered: 'powered by',
    filePrefix: 'certificado-musicdibs',
  },
}

function getLabels(locale?: string): CertLabels {
  if (!locale) return labelsMap.es
  if (labelsMap[locale]) return labelsMap[locale]
  const base = locale.split('-')[0]
  if (labelsMap[base]) return labelsMap[base]
  return labelsMap.es
}

// ── Helpers ──────────────────────────────────────────────────

async function imgToBase64(src: string): Promise<string> {
  const res = await fetch(src)
  const blob = await res.blob()
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

/** Draw a vinyl-disc + checkmark watermark matching the reference PDF */
function makeWatermark(W: number, H: number): string {
  const scale = 3
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // ── Vinyl disc (center-right, lower half) ──
  const cx = canvas.width * 0.52
  const cy = canvas.height * 0.58
  const maxR = 90 * scale

  // Draw concentric rings
  ctx.globalAlpha = 0.04
  for (let i = 0; i < 8; i++) {
    const r = maxR - i * 10 * scale
    if (r <= 0) break
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 1.5 * scale
    ctx.stroke()
  }

  // Center hole
  ctx.beginPath()
  ctx.arc(cx, cy, 6 * scale, 0, Math.PI * 2)
  ctx.fillStyle = '#888888'
  ctx.globalAlpha = 0.03
  ctx.fill()

  // ── Large checkmark (pink, low opacity) ──
  ctx.globalAlpha = 0.06
  ctx.strokeStyle = RED_CORP
  ctx.lineWidth = 12 * scale
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const checkX = canvas.width * 0.42
  const checkY = canvas.height * 0.62
  ctx.moveTo(checkX - 30 * scale, checkY)
  ctx.lineTo(checkX, checkY + 28 * scale)
  ctx.lineTo(checkX + 50 * scale, checkY - 40 * scale)
  ctx.stroke()

  ctx.globalAlpha = 1
  return canvas.toDataURL('image/png')
}

// ── Main generator ───────────────────────────────────────────

export async function generateCertificate(data: CertificateData, locale?: string): Promise<void> {
  const L = getLabels(locale)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const ML = 25, MR = 25
  const contentW = W - ML - MR

  // helpers
  const hex = (c: string) => doc.setTextColor(c)
  const font = (style: string, size: number, family = 'helvetica') => {
    doc.setFont(family, style)
    doc.setFontSize(size)
  }
  const redLine = (y: number) => {
    doc.setDrawColor(RED_CORP)
    doc.setLineWidth(0.7)
    doc.line(ML, y, W - MR, y)
  }

  /** Print label + value block (label gray on one line, value black below) */
  const field = (y: number, label: string, value: string, mono = false): number => {
    font('normal', 9.5)
    hex(GRAY_D)
    doc.text(label, ML, y)
    y += 5
    font('normal', 9.5, mono ? 'courier' : 'helvetica')
    hex(BLACK)
    const lines = doc.splitTextToSize(value, contentW)
    const visible = lines.slice(0, 4)
    doc.text(visible, ML, y)
    return y + visible.length * 4.2 + 4
  }

  // ── Pre-generate assets ────────────────────────────────────
  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(data.checkerUrl, {
      width: 300, margin: 1,
      color: { dark: BLACK, light: WHITE },
    }),
    imgToBase64(logoMusicdibs),
  ])
  const logoFmt = logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG'

  // ── Watermark ──────────────────────────────────────────────
  const watermark = makeWatermark(W, H)
  doc.addImage(watermark, 'PNG', 0, 0, W, H)

  // ══════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════

  let y = 28

  // Logo top-right
  const logoAspect = 125 / 126
  const logoH = 18
  const logoW = logoH * logoAspect
  doc.addImage(logoDataUrl, logoFmt, W - MR - logoW, 14, logoW, logoH)

  // Title
  font('bold', 20)
  hex(BLACK)
  doc.text(L.headerTitle, ML, y)
  y += 10

  // Intro line
  font('normal', 10)
  hex(GRAY_D)
  const introLines = doc.splitTextToSize(L.headerIntro, contentW - logoW - 5)
  doc.text(introLines, ML, y)
  y += introLines.length * 4.5 + 10

  // Red separator
  redLine(y)
  y += 12

  // ══════════════════════════════════════════════════════════
  // SECTION 1: DATOS DEL CONTENIDO
  // ══════════════════════════════════════════════════════════

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionContent, ML, y)
  y += 10

  y = field(y, L.titleLabel, data.title)
  y = field(y, L.filenameLabel, data.filename)
  y = field(y, L.sizeLabel, data.filesize)

  if (data.description) {
    y = field(y, L.descriptionLabel, data.description)
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 2: DATOS DEL AUTOR
  // ══════════════════════════════════════════════════════════

  redLine(y)
  y += 12

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionAuthor, ML, y)
  y += 10

  y = field(y, L.authorNameLabel, data.authorName)
  if (data.authorDocId) {
    y = field(y, L.authorDocLabel, data.authorDocId)
  }

  // ══════════════════════════════════════════════════════════
  // SECTION 3: DATOS DE LA TRANSACCIÓN
  // ══════════════════════════════════════════════════════════

  redLine(y)
  y += 12

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionTransaction, ML, y)
  y += 10

  y = field(y, L.txIdLabel, data.txHash, true)
  y = field(y, L.fingerprintLabel, data.fingerprint, true)
  y = field(y, L.algorithmLabel, data.algorithm)
  y = field(y, L.networkLabel, data.network)
  y = field(y, L.dateLabel, data.certifiedAt)

  // ══════════════════════════════════════════════════════════
  // QR CODE (bottom-right)
  // ══════════════════════════════════════════════════════════

  const qrSz = 32
  const qrX = W - MR - qrSz
  const qrY = H - 65

  font('bold', 10)
  hex(BLACK)
  doc.text(L.verifyLabel, qrX + qrSz / 2, qrY - 3, { align: 'center' })
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSz, qrSz)

  // ══════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════

  const footerY = H - 18

  // Short red accent line above footer (left)
  doc.setDrawColor(RED_CORP)
  doc.setLineWidth(1)
  doc.line(ML, footerY, ML + 18, footerY)

  // musicdibs.com
  font('normal', 8)
  hex(BLACK)
  doc.text('musicdibs.com', ML, footerY + 6)

  // powered by icommunity (right)
  font('normal', 7)
  hex(GRAY_M)
  doc.text(L.footerPowered, W - MR, footerY + 2, { align: 'right' })

  font('bold', 8)
  hex(BLACK)
  doc.text('icommunity', W - MR, footerY + 7, { align: 'right' })

  // ── Save ───────────────────────────────────────────────────
  const safeName = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
  doc.save(`${L.filePrefix}-${safeName}.pdf`)
}
