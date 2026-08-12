import { MessageCircle } from 'lucide-react'

const whatsappNumber = import.meta.env.VITE_ATARAH_WHATSAPP_NUMBER

export function buildWhatsAppUrl(message: string) {
  if (!whatsappNumber) {
    return null
  }

  return `https://wa.me/${whatsappNumber}??text=${encodeURIComponent(message)}`
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

export function formatPhoneForDisplay(value: string) {
  const normalized = normalizePhone(value)

  if (normalized.length === 11) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 7)}-${normalized.slice(7)}`
  }

  return value
}

export function getOrderStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: 'Cancelado',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    in_production: 'En confección',
    pending: 'Pedido recibido',
    ready: 'Listo para entregar',
    waiting_for_payment: 'Esperando pago',
  }

  return labels[status] ?? status
}

export function getOrderStatusDescription(status: string) {
  const descriptions: Record<string, string> = {
    cancelled: 'El pedido fue cancelado.',
    confirmed: 'El equipo confirmó los detalles del pedido.',
    delivered: 'El pedido fue entregado.',
    in_production: 'El pedido está en proceso de confección.',
    pending: 'Recibimos tu solicitud y pronto la revisaremos.',
    ready: 'El pedido está listo para entrega o despacho.',
    waiting_for_payment: 'Estamos a la espera de confirmar el pago.',
  }

  return descriptions[status] ?? 'Seguimiento del pedido en proceso.'
}

export function getMadeToOrderNotice() {
  return 'Cada uniforme se confecciona bajo pedido. El tiempo mostrado es estimado y será confirmado por Atarah Atelier.'
}

export { MessageCircle }
