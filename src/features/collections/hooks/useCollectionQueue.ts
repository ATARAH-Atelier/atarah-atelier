import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  cancelPaymentPromise,
  collectionKeys,
  createPaymentPromise,
  getCollectionQueue,
  getPaymentPromises,
  updateCollectionReminderStatus,
} from '../../../services/collection.service'
import type { CreatePaymentPromiseInput } from '../../../types/collection'

export function useCollectionQueue() {
  return useQuery({ queryFn: getCollectionQueue, queryKey: collectionKeys.queue() })
}

export function useCollectionHistory(orderId: string | null) {
  return useQuery({
    enabled: Boolean(orderId),
    queryFn: () => getCollectionQueue().then((queue) => queue.filter((item) => item.orderId === orderId)),
    queryKey: collectionKeys.history(orderId ?? 'none'),
  })
}

export function usePaymentPromises(orderId?: string) {
  return useQuery({ queryFn: () => getPaymentPromises(orderId), queryKey: collectionKeys.promises(orderId) })
}

function useInvalidateCollection() {
  const queryClient = useQueryClient()

  return () => queryClient.invalidateQueries({ queryKey: collectionKeys.all })
}

export function useMarkReminderOpened() {
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (reminderId: string) => updateCollectionReminderStatus(reminderId, 'opened'),
    onSuccess: invalidate,
  })
}

export function useMarkReminderSent() {
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (reminderId: string) => updateCollectionReminderStatus(reminderId, 'sent'),
    onSuccess: invalidate,
  })
}

export function useSkipReminder() {
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (reminderId: string) => updateCollectionReminderStatus(reminderId, 'skipped'),
    onSuccess: invalidate,
  })
}

export function useCreatePaymentPromise() {
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (input: CreatePaymentPromiseInput) => createPaymentPromise(input),
    onSuccess: invalidate,
  })
}

export function useCancelPaymentPromise() {
  const invalidate = useInvalidateCollection()
  return useMutation({
    mutationFn: (promiseId: string) => cancelPaymentPromise(promiseId),
    onSuccess: invalidate,
  })
}
