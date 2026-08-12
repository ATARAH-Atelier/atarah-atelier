import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

import type { OrderStatus } from '../types/database'

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs))
}

export function normalizeNumber(value: number | string | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

export function formatCurrency(value: number | string | null | undefined) {
  const amount = normalizeNumber(value)

  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    style: 'currency',
  }).format(amount)
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return 'Sin fecha'
  }

  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatLongDate(value: Date | string) {
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function getInitials(value: string) {
  const words = value.trim().split(/\s+/).slice(0, 2)
  return words.map((word) => word.charAt(0).toUpperCase()).join('') || 'AA'
}

export function getGreeting(date = new Date()) {
  const hours = date.getHours()

  if (hours < 12) {
    return 'Buenos días'
  }

  if (hours < 19) {
    return 'Buenas tardes'
  }

  return 'Buenas noches'
}

export function translateOrderStatus(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    cancelled: 'Cancelado',
    confirmed: 'Confirmado',
    delivered: 'Entregado',
    in_production: 'En confección',
    pending: 'Pendiente',
    ready: 'Listo',
    waiting_for_payment: 'Esperando pago',
  }

  return map[status]
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kilobytes = bytes / 1024

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`
  }

  return `${(kilobytes / 1024).toFixed(1)} MB`
}
