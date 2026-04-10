import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import logoMusicdibs from '@/assets/logo_musicdibs_black.jpg'

// ── Palette ──────────────────────────────────────────────────
const BLACK   = '#111111'
const GRAY_D  = '#444444'
const GRAY_M  = '#999999'
const RED_CORP = '#E8364E'
const WHITE   = '#FFFFFF'

export interface UsageEvent {
  eventType: string;
  eventTimestamp: string;
  certificationStatus?: string;
}

export interface PurchaseEvidenceData {
  // Buyer
  email: string
  displayName?: string
  ipAddress?: string
  userAgent?: string
  browserLanguage?: string
  // Payment
  productType: string
  productName?: string
  amount: number
  currency: string
  paymentIntentId?: string
  chargeId?: string
  paymentStatus: string
  // Legal
  acceptedTerms?: boolean
  acceptedTermsVersion?: string
  acceptedTermsTimestamp?: string
  // Certification
  evidenceHash?: string
  ibsTransactionId?: string
  ibsRegisteredAt?: string
  certificationStatus: string
  // Meta
  createdAt: string
  checkerUrl?: string
  // Usage (post-purchase activity)
  usageEvents?: UsageEvent[]
}

// ── Labels ───────────────────────────────────────────────────
interface Labels {
  headerTitle: string
  headerIntro: string
  sectionBuyer: string
  sectionPayment: string
  sectionLegal: string
  sectionCertification: string
  emailLabel: string
  nameLabel: string
  ipLabel: string
  browserLabel: string
  languageLabel: string
  productLabel: string
  amountLabel: string
  currencyLabel: string
  dateLabel: string
  piLabel: string
  chargeLabel: string
  statusLabel: string
  termsLabel: string
  termsVersionLabel: string
  termsDateLabel: string
  certDateLabel: string
  txIdLabel: string
  hashLabel: string
  verifyLabel: string
  footerPowered: string
  filePrefix: string
  yesVal: string
  noVal: string
  sectionUsage: string
  usageLegal: string
}

const labelsMap: Record<string, Labels> = {
  es: {
    headerTitle: 'Comprobante de compra certificada',
    headerIntro: 'MusicDibs certifica que la siguiente operación ha sido registrada y sellada como evidencia digital verificable',
    sectionBuyer: 'Datos del comprador',
    sectionPayment: 'Datos de la operación',
    sectionLegal: 'Datos legales',
    sectionCertification: 'Datos de certificación',
    emailLabel: 'Email:', nameLabel: 'Usuario:', ipLabel: 'IP:', browserLabel: 'Navegador:', languageLabel: 'Idioma:',
    productLabel: 'Producto:', amountLabel: 'Importe:', currencyLabel: 'Moneda:', dateLabel: 'Fecha y hora:',
    piLabel: 'Payment Intent ID:', chargeLabel: 'Charge ID:', statusLabel: 'Estado:',
    termsLabel: 'Aceptación de términos:', termsVersionLabel: 'Versión de términos:', termsDateLabel: 'Fecha de aceptación:',
    certDateLabel: 'Fecha de certificación:', txIdLabel: 'ID de transacción iBS:', hashLabel: 'Hash de la evidencia:',
    verifyLabel: 'Verificar', footerPowered: 'powered by', filePrefix: 'comprobante-compra-musicdibs',
    yesVal: 'Sí', noVal: 'No',
    sectionUsage: 'Actividad posterior a la compra',
    usageLegal: 'Tras la compra, el usuario accedió y utilizó el servicio desde el entorno técnico registrado, lo que refuerza la validez de la transacción.',
  },
  en: {
    headerTitle: 'Certified purchase receipt',
    headerIntro: 'MusicDibs certifies that the following transaction has been registered and sealed as verifiable digital evidence',
    sectionBuyer: 'Buyer data',
    sectionPayment: 'Transaction data',
    sectionLegal: 'Legal data',
    sectionCertification: 'Certification data',
    emailLabel: 'Email:', nameLabel: 'User:', ipLabel: 'IP:', browserLabel: 'Browser:', languageLabel: 'Language:',
    productLabel: 'Product:', amountLabel: 'Amount:', currencyLabel: 'Currency:', dateLabel: 'Date & time:',
    piLabel: 'Payment Intent ID:', chargeLabel: 'Charge ID:', statusLabel: 'Status:',
    termsLabel: 'Terms acceptance:', termsVersionLabel: 'Terms version:', termsDateLabel: 'Acceptance date:',
    certDateLabel: 'Certification date:', txIdLabel: 'iBS transaction ID:', hashLabel: 'Evidence hash:',
    verifyLabel: 'Verify', footerPowered: 'powered by', filePrefix: 'purchase-receipt-musicdibs',
    yesVal: 'Yes', noVal: 'No',
    sectionUsage: 'Post-purchase activity',
    usageLegal: 'After the purchase, the user accessed and used the service from the registered technical environment, which reinforces the validity of the transaction.',
  },
  'pt-BR': {
    headerTitle: 'Comprovante de compra certificada',
    headerIntro: 'MusicDibs certifica que a seguinte operação foi registrada e selada como evidência digital verificável',
    sectionBuyer: 'Dados do comprador',
    sectionPayment: 'Dados da operação',
    sectionLegal: 'Dados legais',
    sectionCertification: 'Dados de certificação',
    emailLabel: 'Email:', nameLabel: 'Usuário:', ipLabel: 'IP:', browserLabel: 'Navegador:', languageLabel: 'Idioma:',
    productLabel: 'Produto:', amountLabel: 'Valor:', currencyLabel: 'Moeda:', dateLabel: 'Data e hora:',
    piLabel: 'Payment Intent ID:', chargeLabel: 'Charge ID:', statusLabel: 'Estado:',
    termsLabel: 'Aceitação de termos:', termsVersionLabel: 'Versão dos termos:', termsDateLabel: 'Data de aceitação:',
    certDateLabel: 'Data de certificação:', txIdLabel: 'ID de transação iBS:', hashLabel: 'Hash da evidência:',
    verifyLabel: 'Verificar', footerPowered: 'powered by', filePrefix: 'comprovante-compra-musicdibs',
    yesVal: 'Sim', noVal: 'Não',
    sectionUsage: 'Atividade posterior à compra',
    usageLegal: 'Após a compra, o usuário acessou e utilizou o serviço a partir do ambiente técnico registrado, o que reforça a validade da transação.',
  },
}

function getLabels(locale?: string): Labels {
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

function makeWatermark(W: number, H: number): string {
  const scale = 3
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.globalAlpha = 0.04
  for (let i = 0; i < 8; i++) {
    const r = 90 * scale - i * 10 * scale
    if (r <= 0) break
    ctx.beginPath()
    ctx.arc(canvas.width * 0.52, canvas.height * 0.58, r, 0, Math.PI * 2)
    ctx.strokeStyle = '#888888'
    ctx.lineWidth = 1.5 * scale
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(canvas.width * 0.52, canvas.height * 0.58, 6 * scale, 0, Math.PI * 2)
  ctx.fillStyle = '#888888'
  ctx.globalAlpha = 0.03
  ctx.fill()

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

export async function generatePurchaseCertificate(data: PurchaseEvidenceData, locale?: string): Promise<void> {
  const L = getLabels(locale)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297
  const ML = 25, MR = 25
  const contentW = W - ML - MR

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
  const checkerUrl = data.checkerUrl || (data.ibsTransactionId
    ? `https://checker.icommunitylabs.com/check/opera/${data.ibsTransactionId}`
    : 'https://musicdibs.com')

  const [qrDataUrl, logoDataUrl] = await Promise.all([
    QRCode.toDataURL(checkerUrl, {
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

  const logoAspect = 125 / 126
  const logoH = 18
  const logoW = logoH * logoAspect
  doc.addImage(logoDataUrl, logoFmt, W - MR - logoW, 14, logoW, logoH)

  font('bold', 18)
  hex(BLACK)
  doc.text(L.headerTitle, ML, y)
  y += 9

  font('normal', 9.5)
  hex(GRAY_D)
  const introLines = doc.splitTextToSize(L.headerIntro, contentW - logoW - 5)
  doc.text(introLines, ML, y)
  y += introLines.length * 4.5 + 10

  redLine(y)
  y += 12

  // ══════════════════════════════════════════════════════════
  // SECTION 1: BUYER DATA
  // ══════════════════════════════════════════════════════════

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionBuyer, ML, y)
  y += 10

  if (data.displayName) y = field(y, L.nameLabel, data.displayName)
  y = field(y, L.emailLabel, data.email)
  if (data.ipAddress) y = field(y, L.ipLabel, data.ipAddress)
  if (data.userAgent) y = field(y, L.browserLabel, data.userAgent)
  if (data.browserLanguage) y = field(y, L.languageLabel, data.browserLanguage)

  // ══════════════════════════════════════════════════════════
  // SECTION 2: PAYMENT DATA
  // ══════════════════════════════════════════════════════════

  redLine(y)
  y += 12

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionPayment, ML, y)
  y += 10

  y = field(y, L.productLabel, data.productName || data.productType)
  y = field(y, L.amountLabel, `${data.amount.toFixed(2)} ${data.currency.toUpperCase()}`)
  y = field(y, L.dateLabel, new Date(data.createdAt).toLocaleString())
  y = field(y, L.statusLabel, data.paymentStatus)
  if (data.paymentIntentId) y = field(y, L.piLabel, data.paymentIntentId, true)
  if (data.chargeId) y = field(y, L.chargeLabel, data.chargeId, true)

  // ══════════════════════════════════════════════════════════
  // SECTION 3: LEGAL DATA
  // ══════════════════════════════════════════════════════════

  redLine(y)
  y += 12

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionLegal, ML, y)
  y += 10

  y = field(y, L.termsLabel, data.acceptedTerms ? L.yesVal : L.noVal)
  if (data.acceptedTermsVersion) y = field(y, L.termsVersionLabel, data.acceptedTermsVersion)
  if (data.acceptedTermsTimestamp) y = field(y, L.termsDateLabel, new Date(data.acceptedTermsTimestamp).toLocaleString())

  // ══════════════════════════════════════════════════════════
  // SECTION 4: CERTIFICATION DATA
  // ══════════════════════════════════════════════════════════

  redLine(y)
  y += 12

  font('bold', 12)
  hex(BLACK)
  doc.text(L.sectionCertification, ML, y)
  y += 10

  if (data.ibsRegisteredAt) y = field(y, L.certDateLabel, new Date(data.ibsRegisteredAt).toLocaleString())
  if (data.ibsTransactionId) y = field(y, L.txIdLabel, data.ibsTransactionId, true)
  if (data.evidenceHash) y = field(y, L.hashLabel, data.evidenceHash, true)

  // ══════════════════════════════════════════════════════════
  // SECTION 5: POST-PURCHASE USAGE
  // ══════════════════════════════════════════════════════════

  if (data.usageEvents && data.usageEvents.length > 0) {
    // Check if we need a new page
    if (y > H - 100) {
      doc.addPage()
      y = 28
      const wm2 = makeWatermark(W, H)
      doc.addImage(wm2, 'PNG', 0, 0, W, H)
    }

    redLine(y)
    y += 12

    font('bold', 12)
    hex(BLACK)
    doc.text(L.sectionUsage, ML, y)
    y += 8

    // Legal text
    font('italic', 8.5)
    hex(GRAY_D)
    const legalLines = doc.splitTextToSize(L.usageLegal, contentW)
    doc.text(legalLines, ML, y)
    y += legalLines.length * 3.8 + 6

    const EVENT_LABELS_PDF: Record<string, Record<string, string>> = {
      es: {
        login_after_purchase: 'Login tras compra',
        dashboard_access: 'Acceso al dashboard',
        ai_song_generated: 'Generación de canción IA',
        credits_used: 'Uso de créditos',
        asset_created: 'Asset creado',
        download_attempt: 'Intento de descarga',
        distribution_started: 'Distribución iniciada',
        promotion_created: 'Promoción creada',
      },
      en: {
        login_after_purchase: 'Login after purchase',
        dashboard_access: 'Dashboard access',
        ai_song_generated: 'AI song generation',
        credits_used: 'Credits used',
        asset_created: 'Asset created',
        download_attempt: 'Download attempt',
        distribution_started: 'Distribution started',
        promotion_created: 'Promotion created',
      },
      'pt-BR': {
        login_after_purchase: 'Login após compra',
        dashboard_access: 'Acesso ao dashboard',
        ai_song_generated: 'Geração de música IA',
        credits_used: 'Uso de créditos',
        asset_created: 'Asset criado',
        download_attempt: 'Tentativa de download',
        distribution_started: 'Distribuição iniciada',
        promotion_created: 'Promoção criada',
      },
    }

    const lang = locale?.startsWith('pt') ? 'pt-BR' : (locale?.startsWith('en') ? 'en' : 'es')
    const evLabels = EVENT_LABELS_PDF[lang] || EVENT_LABELS_PDF.es

    // Show up to 8 most recent events
    const eventsToShow = data.usageEvents.slice(0, 8)
    for (const ev of eventsToShow) {
      const label = evLabels[ev.eventType] || ev.eventType
      const ts = new Date(ev.eventTimestamp).toLocaleString()
      const statusIcon = ev.certificationStatus === 'certified' ? '✓' : '○'
      
      font('normal', 9)
      hex(BLACK)
      doc.text(`${statusIcon}  ${label}`, ML + 2, y)
      
      font('normal', 8)
      hex(GRAY_M)
      doc.text(ts, W - MR, y, { align: 'right' })
      y += 5.5
    }
  }

  // ══════════════════════════════════════════════════════════
  // QR CODE
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

  doc.setDrawColor(RED_CORP)
  doc.setLineWidth(1)
  doc.line(ML, footerY, ML + 18, footerY)

  font('normal', 8)
  hex(BLACK)
  doc.text('musicdibs.com', ML, footerY + 6)

  font('normal', 7)
  hex(GRAY_M)
  doc.text(L.footerPowered, W - MR, footerY + 2, { align: 'right' })

  font('bold', 8)
  hex(BLACK)
  doc.text('icommunity', W - MR, footerY + 7, { align: 'right' })

  // ── Save ───────────────────────────────────────────────────
  const safeName = (data.productName || data.productType)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40)
  doc.save(`${L.filePrefix}-${safeName}.pdf`)
}
