import { AlertCircle, Check, Clock3, MessageCircle, Plus, Search, Send, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../../components/common/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { formatCurrency } from '../../../lib/utils'
import type { CollectionQueueItem } from '../../../types/collection'
import {
  useCollectionHistory,
  useCollectionQueue,
  useCreatePaymentPromise,
  useMarkReminderOpened,
  useMarkReminderSent,
  usePaymentPromises,
  useSkipReminder,
} from '../hooks/useCollectionQueue'
import { buildWhatsAppUrl, getCollectionStageLabel, getPromiseStatus } from '../collection.utils'
import { paymentPromiseSchema, validatePaymentPromiseDate } from '../schemas/payment-promise.schema'

type QueueFilter = 'all' | 'pending' | 'due_soon' | 'due_today' | 'overdue' | 'promises' | 'manual_followup'

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)) : 'Sin vencimiento'
}

function getFallbackMessage(item: CollectionQueueItem) {
  return `Hola ${item.customerName}, te contactamos de Atarah Atelier por el pedido ${item.orderNumber}. Tienes un saldo pendiente de ${formatCurrency(item.balance)}.${item.dueDate ? ` Su fecha de vencimiento es ${formatDate(item.dueDate)}.` : ''}`
}

export function CollectionPanel() {
  const queueQuery = useCollectionQueue()
  const promisesQuery = usePaymentPromises()
  const markOpened = useMarkReminderOpened()
  const markSent = useMarkReminderSent()
  const skipReminder = useSkipReminder()
  const createPromise = useCreatePaymentPromise()
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [search, setSearch] = useState('')
  const [whatsAppItem, setWhatsAppItem] = useState<CollectionQueueItem | null>(null)
  const [message, setMessage] = useState('')
  const [promiseItem, setPromiseItem] = useState<CollectionQueueItem | null>(null)
  const [promiseAmount, setPromiseAmount] = useState('')
  const [promiseDate, setPromiseDate] = useState('')
  const [promiseNotes, setPromiseNotes] = useState('')
  const [historyOrderId, setHistoryOrderId] = useState<string | null>(null)
  const historyQuery = useCollectionHistory(historyOrderId)

  const queue = queueQuery.data ?? []
  const promises = promisesQuery.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  const brokenOrderIds = new Set(promises.filter((promise) => getPromiseStatus(promise) === 'broken').map((promise) => promise.order_id))
  const pendingPromiseByOrder = new Map(promises.filter((promise) => getPromiseStatus(promise) === 'pending').map((promise) => [promise.order_id, promise]))

  const visibleQueue = (() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es')
    return queue
      .filter((item) => {
        const matchesSearch = !normalizedSearch || [item.customerName, item.orderNumber, item.phone]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase('es').includes(normalizedSearch))
        if (!matchesSearch) return false
        if (filter === 'all') return true
        if (filter === 'pending') return item.status === 'pending' || item.status === 'opened'
        if (filter === 'due_soon') return item.stage === 'due_soon'
        if (filter === 'due_today') return item.stage === 'due_today'
        if (filter === 'overdue') return item.daysOverdue > 0
        if (filter === 'promises') return pendingPromiseByOrder.has(item.orderId) || brokenOrderIds.has(item.orderId)
        return item.stage === 'manual_followup'
      })
      .sort((first, second) => {
        const firstBroken = Number(brokenOrderIds.has(first.orderId))
        const secondBroken = Number(brokenOrderIds.has(second.orderId))
        if (firstBroken !== secondBroken) return secondBroken - firstBroken
        const firstManual = Number(first.stage === 'manual_followup')
        const secondManual = Number(second.stage === 'manual_followup')
        if (firstManual !== secondManual) return secondManual - firstManual
        return second.priority - first.priority || second.daysOverdue - first.daysOverdue || second.balance - first.balance
      })
  })()

  const totalOutstanding = queue.reduce((sum, item) => sum + item.balance, 0)
  const totalOverdue = queue.filter((item) => item.daysOverdue > 0).reduce((sum, item) => sum + item.balance, 0)
  const pendingCount = queue.filter((item) => item.status === 'pending' || item.status === 'opened').length
  const upcomingPromises = promises.filter((promise) => getPromiseStatus(promise) === 'pending' && promise.promised_date >= today).length
  const brokenPromises = promises.filter((promise) => getPromiseStatus(promise) === 'broken').length

  function openWhatsApp(item: CollectionQueueItem) {
    setWhatsAppItem(item)
    setMessage(item.message || getFallbackMessage(item))
  }

  async function handleOpenWhatsApp() {
    if (!whatsAppItem?.phone) {
      toast.error('Este cliente no tiene un telefono para WhatsApp.')
      return
    }
    await markOpened.mutateAsync(whatsAppItem.reminderId)
    window.open(buildWhatsAppUrl(whatsAppItem.phone, message), '_blank', 'noopener,noreferrer')
    setWhatsAppItem(null)
  }

  async function handleCreatePromise() {
    if (!promiseItem) return
    const parsed = paymentPromiseSchema.safeParse({ amount: promiseAmount, notes: promiseNotes, promisedDate: promiseDate })
    if (!parsed.success || !validatePaymentPromiseDate(promiseDate)) {
      toast.error('Revisa el monto, la fecha y las notas de la promesa.')
      return
    }
    if (parsed.data.amount > promiseItem.balance) {
      toast.error('La promesa no puede superar el saldo pendiente.')
      return
    }
    await createPromise.mutateAsync({
      amount: parsed.data.amount,
      customerId: promiseItem.customerId,
      notes: parsed.data.notes.trim() || null,
      orderId: promiseItem.orderId,
      promisedDate: parsed.data.promisedDate,
    })
    toast.success('Promesa de pago registrada.')
    setPromiseItem(null)
  }

  if (queueQuery.isLoading || promisesQuery.isLoading) {
    return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-white" />)}</div>
  }

  if (queueQuery.isError || promisesQuery.isError) {
    return <Card className="border-rose-200 bg-rose-50 p-6 text-rose-800">No fue posible cargar la informacion de cobranza.</Card>
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total pendiente', formatCurrency(totalOutstanding)],
          ['Total vencido', formatCurrency(totalOverdue)],
          ['Gestiones pendientes', `${pendingCount}`],
          ['Promesas proximas', `${upcomingPromises}`],
          ['Promesas incumplidas', `${brokenPromises}`],
        ].map(([label, value]) => <Card key={label} className="border-atarah-gold-200 p-4"><p className="text-xs text-atarah-charcoal-600">{label}</p><p className="mt-1 text-xl font-bold text-atarah-wine-900">{value}</p></Card>)}
      </div>

      <Card className="border-atarah-gold-200 p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
          <div className="relative"><Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-atarah-charcoal-500" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente, pedido o telefono" className="pl-11" /></div>
          <Select value={filter} onChange={(event) => setFilter(event.target.value as QueueFilter)}>
            <option value="all">Todos</option><option value="pending">Pendientes</option><option value="due_soon">Por vencer</option><option value="due_today">Vence hoy</option><option value="overdue">Vencidos</option><option value="promises">Promesas</option><option value="manual_followup">Requiere contacto personal</option>
          </Select>
        </div>
      </Card>

      {visibleQueue.length ? <div className="space-y-3">
        {visibleQueue.map((item) => {
          const promise = pendingPromiseByOrder.get(item.orderId)
          const isBroken = brokenOrderIds.has(item.orderId)
          return <Card key={item.reminderId} className="border-atarah-gold-200 p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-atarah-charcoal-900">{item.customerName}</p><span className="rounded-full bg-atarah-cream-100 px-2 py-1 text-xs font-semibold text-atarah-wine-800">{getCollectionStageLabel(item.stage)}</span>{isBroken ? <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Promesa incumplida</span> : null}</div><p className="mt-1 text-sm text-atarah-charcoal-600">{item.orderNumber} | Saldo {formatCurrency(item.balance)} | Vence {formatDate(item.dueDate)} | {item.daysOverdue > 0 ? `${item.daysOverdue} dias vencido` : 'Sin atraso'}</p><p className="mt-1 text-xs text-atarah-charcoal-500">Estado: {item.status} | Prioridad {item.priority}{promise ? ` | Promesa ${formatCurrency(promise.amount)} para ${formatDate(promise.promised_date)}` : ''}</p></div>
              <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" leftIcon={<Clock3 className="size-4" />} onClick={() => setHistoryOrderId(item.orderId)}>Historial</Button><Button size="sm" variant="outline" leftIcon={<Plus className="size-4" />} onClick={() => { setPromiseItem(item); setPromiseAmount(''); setPromiseDate(''); setPromiseNotes('') }}>Promesa</Button><Button size="sm" leftIcon={<MessageCircle className="size-4" />} onClick={() => openWhatsApp(item)}>WhatsApp</Button>{item.status === 'opened' ? <Button size="sm" variant="outline" leftIcon={<Check className="size-4" />} onClick={() => void markSent.mutateAsync(item.reminderId)}>Marcar enviado</Button> : null}{item.status === 'pending' ? <Button size="sm" variant="ghost" onClick={() => void skipReminder.mutateAsync(item.reminderId)}>Omitir</Button> : null}</div>
            </div>
          </Card>
        })}
      </div> : <EmptyState icon={AlertCircle} title="No hay gestiones de cobranza pendientes." description="Cuando n8n cree recordatorios, apareceran en esta cola." />}

      {whatsAppItem ? <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center"><Card className="w-full max-w-xl p-6"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-2xl font-bold text-atarah-wine-900">Enviar recordatorio</h2><p className="mt-1 text-sm text-atarah-charcoal-600">{whatsAppItem.customerName} | {whatsAppItem.orderNumber} | {formatCurrency(whatsAppItem.balance)}</p></div><Button variant="ghost" size="sm" onClick={() => setWhatsAppItem(null)}><X className="size-4" /></Button></div><Textarea className="mt-5" value={message} onChange={(event) => setMessage(event.target.value)} rows={7} /><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setWhatsAppItem(null)}>Cancelar</Button><Button leftIcon={<Send className="size-4" />} loading={markOpened.isPending} onClick={() => void handleOpenWhatsApp()}>Abrir WhatsApp</Button></div></Card></div> : null}

      {promiseItem ? <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center"><Card className="w-full max-w-lg p-6"><h2 className="font-display text-2xl font-bold text-atarah-wine-900">Registrar promesa</h2><p className="mt-1 text-sm text-atarah-charcoal-600">Saldo disponible: {formatCurrency(promiseItem.balance)}</p><div className="mt-5 grid gap-4"><Input label="Monto" inputMode="decimal" value={promiseAmount} onChange={(event) => setPromiseAmount(event.target.value)} /><Input label="Fecha prometida" type="date" min={today} value={promiseDate} onChange={(event) => setPromiseDate(event.target.value)} /><Textarea label="Notas" value={promiseNotes} onChange={(event) => setPromiseNotes(event.target.value)} /></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setPromiseItem(null)}>Cancelar</Button><Button loading={createPromise.isPending} onClick={() => void handleCreatePromise()}>Guardar promesa</Button></div></Card></div> : null}

      {historyOrderId ? <div className="fixed inset-0 z-50 flex items-end bg-black/40 p-4 sm:items-center sm:justify-center"><Card className="w-full max-w-xl p-6"><div className="flex justify-between gap-4"><h2 className="font-display text-2xl font-bold text-atarah-wine-900">Historial de cobranza</h2><Button variant="ghost" size="sm" onClick={() => setHistoryOrderId(null)}><X className="size-4" /></Button></div><div className="mt-5 space-y-3">{historyQuery.data?.map((entry) => <div key={entry.reminderId} className="rounded-2xl bg-atarah-cream-50 p-3 text-sm"><p className="font-semibold">{getCollectionStageLabel(entry.stage)} | {entry.status}</p><p className="mt-1 text-atarah-charcoal-600">{entry.message || 'Sin mensaje guardado'}</p><p className="mt-1 text-xs text-atarah-charcoal-500">{entry.sentByName || 'Sin usuario'} | {entry.sentAt || entry.openedAt || 'Sin fecha'}</p></div>)}</div></Card></div> : null}
    </div>
  )
}
