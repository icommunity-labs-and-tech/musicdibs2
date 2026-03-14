import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import logoMusicdibs from '@/assets/logo_musicdibs.jpg'

// Paleta corporativa MusicDibs (extraída de logos oficiales)
const NAVY     = '#1A1C42'
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

export async function generateCertificate(data: CertificateData): Promise<void> {

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
    doc.text(text, x + (bw - tw) / 2, y + bh / 2 + 2.5)
    return bw
  }

  const makeQR = async (url: string): Promise<string> => {
    return await QRCode.toDataURL(url, {
      width: 256,
      margin: 1,
      color: { dark: '#1A1C42', light: '#FFFFFF' }
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

  // ── PRE-GENERAR ASSETS ─────────────────────────────────────
  const [qr1DataUrl, qr2DataUrl, logoDataUrl] = await Promise.all([
    makeQR(data.checkerUrl),
    makeQR(data.ibsUrl),
    imgToBase64(logoMusicdibs),
  ])

  const gradHeader  = makeGradient(630, 150, PURPLE, NAVY)
  const gradFooter  = makeGradient(630, 50,  PURPLE, NAVY)

  // ── FONDO ──────────────────────────────────────────────────
  doc.setFillColor(BGPAGE)
  doc.rect(0, 0, W, H, 'F')

  // Acento lateral izquierdo
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

  const logoH = 22, logoW = logoH * (125 / 126)
  const logoX = M + 2, logoY = (headerH - logoH) / 2
  rr(logoX - 2, logoY - 1, logoW + 4, logoH + 2, 2, NAVY)
  doc.addImage(logoDataUrl, 'JPEG', logoX, logoY, logoW, logoH)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor('#FFFFFF')
  doc.text('COMPROBANTE DE CERTIFICACIÓN', W - M, 16, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#C4C8F0')
  doc.text('Musicdibs certifica que el siguiente documento', W - M, 22.5, { align: 'right' })
  doc.text('ha sido registrado en blockchain', W - M, 27, { align: 'right' })

  rr(W - M - 52, 32, 52, 7, 1.5, '#FFFFFF22')
  doc.setFont('courier', 'bold')
  doc.setFontSize(7)
  doc.setTextColor('#C4C8F0')
  doc.text(`CERT · ${data.evidenceId}`, W - M - 2, 37, { align: 'right' })

  // ── CUERPO ─────────────────────────────────────────────────
  let y = headerH + 9
  const col2 = W / 2 + 2

  // ═══ DATOS DEL CONTENIDO ═══════════════════════════════════
  y = sectionHeader(CX, y, '  DATOS DEL CONTENIDO')

  lbl(CX, y, 'Título de la certificación')
  lbl(col2, y, 'Tipo de archivo')
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(NAVY)
  doc.text(data.title, CX, y)
  badge(col2, y - 4.5, data.fileType, '#EEF2FF', '#6366F1', '#4338CA')
  y += 7

  lbl(CX, y, 'Nombre del fichero')
  lbl(col2, y, 'Tamaño')
  y += 4.5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor('#334155')
  doc.text(data.filename, CX, y)
  doc.text(data.filesize, col2, y)
  y += 7

  if (data.description) {
    lbl(CX, y, 'Descripción de la obra')
    y += 4.5
    rr(CX - 2, y, W - CX - M + 2, 12, 1.5, '#F0F2FF', '#C7D2FE', 0.4)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor('#475569')
    const descLines = doc.splitTextToSize(data.description, W - CX - M - 6)
    doc.text(descLines.slice(0, 2), CX + 2, y + 4)
    y += 17
  }

  div(y); y += 9

  // ═══ DATOS DEL AUTOR ═══════════════════════════════════════
  y = sectionHeader(CX, y, '  DATOS DEL AUTOR')

  lbl(CX, y, 'Nombre completo')
  if (data.authorDocId) lbl(col2, y, 'Documento de identidad')
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(NAVY)
  doc.text(data.authorName, CX, y)
  if (data.authorDocId) {
    badge(col2, y - 4.5, data.authorDocId, LGRAY, LGRAY, '#334155')
  }
  y += 14

  div(y); y += 9

  // ═══ DATOS DE LA TRANSACCIÓN ════════════════════════════════
  y = sectionHeader(CX, y, '  DATOS DE LA TRANSACCIÓN')

  lbl(CX, y, 'Fecha de certificación')
  lbl(col2, y, 'Red de blockchain')
  y += 4.5

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(NAVY)
  doc.text(data.certifiedAt, CX, y)
  badge(col2, y - 4.5, data.network, '#EEEEFF', BLUE_L, BLUE_M)
  y += 8

  lbl(CX, y, 'Identificador de la transacción (TX Hash)')
  y += 5
  rr(CX - 2, y, W - CX - M + 2, 13, 2, NAVY)
  doc.setFont('courier', 'bold')
  doc.setFontSize(7.8)
  doc.setTextColor('#FFFFFF')
  const half = Math.floor(data.txHash.length / 2)
  doc.text(data.txHash.slice(0, half), CX + 3, y + 4)
  doc.text(data.txHash.slice(half), CX + 3, y + 9)
  y += 16

  lbl(CX, y, `Huella digital del archivo · ${data.algorithm}`)
  y += 5
  rr(CX - 2, y, W - CX - M + 2, 13, 2, INDIGO_L, '#C7D2FE', 0.4)
  doc.setFont('courier', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(INDIGO_T)
  const fpHalf = Math.floor(data.fingerprint.length / 2)
  doc.text(data.fingerprint.slice(0, fpHalf), CX + 3, y + 4)
  doc.text(data.fingerprint.slice(fpHalf), CX + 3, y + 9)
  y += 16

  div(y); y += 9

  // ═══ VERIFICACIÓN — 2 QRs ═══════════════════════════════════
  y = sectionHeader(CX, y, '  VERIFICACIÓN INDEPENDIENTE')

  const qrSz = 29
  const mid = W / 2

  // QR 1 — Blockchain Explorer (izquierda)
  rr(CX - 1.5, y, qrSz + 3, qrSz + 3, 2, NAVY)
  doc.addImage(qr1DataUrl, 'PNG', CX, y + 1.5, qrSz, qrSz)

  const tx1 = CX + qrSz + 5
  lbl(tx1, y + 3, 'Checker blockchain explorer')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(NAVY)
  doc.text('iCommunity Checker', tx1, y + 9)
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(BLUE_M)
  const url1Lines = doc.splitTextToSize(data.checkerUrl, W/2 - CX - qrSz - 8)
  doc.text(url1Lines, tx1, y + 14)
  badge(tx1, y + 23, '✓  VÁLIDO EN BLOCKCHAIN', '#ECFDF5', '#059669', '#059669')

  // QR 2 — Panel iBS (derecha)
  const q2x = mid + 2
  const qr2Purple = await QRCode.toDataURL(data.ibsUrl, {
    width: 256, margin: 1,
    color: { dark: '#431884', light: '#FFFFFF' }
  })
  rr(q2x - 1.5, y, qrSz + 3, qrSz + 3, 2, NAVY)
  doc.addImage(qr2Purple, 'PNG', q2x, y + 1.5, qrSz, qrSz)

  const tx2 = q2x + qrSz + 5
  lbl(tx2, y + 3, 'Evidencia en plataforma iBS')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.setTextColor(NAVY)
  doc.text('Panel iCommunity Labs', tx2, y + 9)
  doc.setFont('courier', 'normal')
  doc.setFontSize(5.8)
  doc.setTextColor(BLUE_M)
  const url2Lines = doc.splitTextToSize(data.ibsUrl, W/2 - q2x - qrSz - 5)
  doc.text(url2Lines, tx2, y + 14)
  badge(tx2, y + 23, '⛓  CERTIFICADO iBS', '#EEF2FF', '#6366F1', '#4338CA')

  // ── FOOTER ─────────────────────────────────────────────────
  const footerH = 15
  const footerY = H - footerH
  doc.addImage(gradFooter, 'PNG', 0, footerY, W, footerH)

  doc.setFillColor(BLUE_L)
  doc.rect(0, footerY, W, 1.2, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor('#C4C8F0')
  doc.text(
    'Este certificado acredita el registro de propiedad intelectual en blockchain mediante iCommunity Blockchain Solutions.',
    M + 3, footerY + 6
  )
  doc.text(
    'La huella digital SHA-512 garantiza la inmutabilidad del registro. Documento válido según normativa de PI.',
    M + 3, footerY + 10
  )

  doc.addImage(logoDataUrl, 'JPEG', W - M - 12, footerY + 1.5, 12, 12)

  // ── GUARDAR ────────────────────────────────────────────────
  const safeName = data.title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .substring(0, 40)
  doc.save(`certificado-musicdibs-${safeName}.pdf`)
}
