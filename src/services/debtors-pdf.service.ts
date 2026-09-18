import { jsPDF } from 'jspdf'

import type { ReportsDebtorPoint } from '../types/reports'

const currencyFormatter = new Intl.NumberFormat('es-VE', {
  currency: 'USD',
  style: 'currency',
})

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(value))
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    in_production: 'En produccion',
    pending: 'Pendiente',
    ready: 'Listo',
    waiting_for_payment: 'En espera de pago',
  }

  return labels[status] ?? status
}

function drawPageHeader(document: jsPDF, generatedAt: string) {
  document.setFillColor(105, 33, 41)
  document.rect(0, 0, 210, 30, 'F')
  document.setTextColor(255, 255, 255)
  document.setFont('helvetica', 'bold')
  document.setFontSize(17)
  document.text('Atarah Atelier', 14, 13)
  document.setFontSize(11)
  document.text('Reporte de deudores', 14, 21)
  document.setFont('helvetica', 'normal')
  document.setFontSize(8)
  document.text(`Generado: ${generatedAt}`, 196, 21, { align: 'right' })
  document.setTextColor(44, 37, 37)
}

function ensureSpace(document: jsPDF, y: number, requiredHeight: number, generatedAt: string) {
  if (y + requiredHeight <= 278) {
    return y
  }

  document.addPage()
  drawPageHeader(document, generatedAt)
  return 39
}

export function downloadDebtorsPdf(debtors: ReportsDebtorPoint[], totalOutstanding: number) {
  const document = new jsPDF({ format: 'a4', unit: 'mm' })
  const generatedAt = new Intl.DateTimeFormat('es-VE', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date())

  drawPageHeader(document, generatedAt)

  document.setFillColor(253, 250, 245)
  document.roundedRect(14, 38, 182, 19, 3, 3, 'F')
  document.setFont('helvetica', 'bold')
  document.setFontSize(10)
  document.text(`${debtors.length} clientes con saldo pendiente`, 20, 46)
  document.setTextColor(105, 33, 41)
  document.setFontSize(14)
  document.text(formatCurrency(totalOutstanding), 190, 50, { align: 'right' })
  document.setTextColor(44, 37, 37)

  let y = 67

  for (const debtor of debtors) {
    const contact = [debtor.phone || 'Sin telefono', debtor.email || 'Sin correo']
      .filter(Boolean)
      .join('  |  ')
    const address = [debtor.city, debtor.state, debtor.address].filter(Boolean).join(', ') || 'Sin direccion registrada'
    const minimumHeight = 33 + debtor.orders.length * 18
    y = ensureSpace(document, y, minimumHeight, generatedAt)

    document.setFillColor(241, 231, 212)
    document.roundedRect(14, y, 182, 7, 2, 2, 'F')
    document.setFont('helvetica', 'bold')
    document.setFontSize(11)
    document.text(debtor.name, 18, y + 5)
    document.setTextColor(127, 31, 41)
    document.text(`Saldo: ${formatCurrency(debtor.outstanding)}`, 192, y + 5, { align: 'right' })
    document.setTextColor(44, 37, 37)
    y += 12

    document.setFont('helvetica', 'normal')
    document.setFontSize(8.5)
    document.text(contact, 18, y)
    y += 4.5
    const addressLines = document.splitTextToSize(address, 174)
    document.text(addressLines, 18, y)
    y += addressLines.length * 4.2 + 3

    for (const order of debtor.orders) {
      y = ensureSpace(document, y, 20, generatedAt)
      document.setDrawColor(222, 204, 178)
      document.roundedRect(18, y, 174, 15, 2, 2, 'S')
      document.setFont('helvetica', 'bold')
      document.setFontSize(9)
      document.text(`${order.orderNumber}  |  ${getStatusLabel(order.status)}`, 22, y + 5)
      document.text(`Debe ${formatCurrency(order.balance)}`, 188, y + 5, { align: 'right' })
      document.setFont('helvetica', 'normal')
      document.setFontSize(8)
      const items = order.items.length
        ? order.items.map((item) => `${item.productName} x${item.quantity}`).join(' | ')
        : 'Pedido sin detalle visible'
      const itemLines = document.splitTextToSize(`Items: ${items}  |  Fecha: ${formatDate(order.createdAt)}`, 166)
      document.text(itemLines, 22, y + 10)
      y += Math.max(17, 9 + itemLines.length * 3.8)
    }

    y += 6
  }

  const pageCount = document.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    document.setPage(page)
    document.setFont('helvetica', 'normal')
    document.setFontSize(8)
    document.setTextColor(108, 98, 96)
    document.text(`Pagina ${page} de ${pageCount}`, 196, 291, { align: 'right' })
  }

  document.save(`deudores-atarah-${new Date().toISOString().slice(0, 10)}.pdf`)
}
