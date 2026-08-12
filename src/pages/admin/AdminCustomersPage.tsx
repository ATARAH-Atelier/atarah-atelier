import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Search, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../lib/utils'
import { getAdminCustomers, updateAdminCustomer } from '../../services/customers.service'
import type { Customer } from '../../types/database'

type CustomerFormState = {
  address: string
  city: string
  email: string
  full_name: string
  phone: string
  state: string
}

const emptyCustomerForm: CustomerFormState = {
  address: '',
  city: '',
  email: '',
  full_name: '',
  phone: '',
  state: '',
}

export function AdminCustomersPage() {
  const [search, setSearch] = useState('')
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<CustomerFormState>(emptyCustomerForm)
  const queryClient = useQueryClient()

  useDocumentTitle('Clientes | Atarah Atelier')

  const customersQuery = useQuery({
    queryFn: getAdminCustomers,
    queryKey: ['admin-customers'],
  })

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: CustomerFormState }) =>
      updateAdminCustomer(id, {
        address: values.address || null,
        city: values.city || null,
        email: values.email || null,
        full_name: values.full_name,
        phone: values.phone || null,
        state: values.state || null,
      }),
    onSuccess: async () => {
      toast.success('Cliente actualizado.')
      await queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
      setEditingCustomer(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el cliente.')
    },
  })

  useEffect(() => {
    if (!editingCustomer) {
      setForm(emptyCustomerForm)
      return
    }

    setForm({
      address: editingCustomer.address ?? '',
      city: editingCustomer.city ?? '',
      email: editingCustomer.email ?? '',
      full_name: editingCustomer.full_name ?? '',
      phone: editingCustomer.phone ?? '',
      state: editingCustomer.state ?? '',
    })
  }, [editingCustomer])

  const filteredCustomers =
    customersQuery.data?.filter((customer) => {
      const query = search.trim().toLowerCase()

      return (
        !query ||
        customer.full_name.toLowerCase().includes(query) ||
        (customer.email ?? '').toLowerCase().includes(query) ||
        (customer.phone ?? '').toLowerCase().includes(query) ||
        (customer.city ?? '').toLowerCase().includes(query) ||
        (customer.state ?? '').toLowerCase().includes(query)
      )
    }) ?? []

  function updateField<Key extends keyof CustomerFormState>(key: Key, value: CustomerFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit() {
    if (!editingCustomer) return
    await updateCustomerMutation.mutateAsync({ id: editingCustomer.id, values: form })
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Clientes"
          description="Base de clientes registrada para seguimiento comercial y operativo."
        />

        <Card className="space-y-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-4 top-4 size-4 text-atarah-charcoal-600" />
            <Input
              id="customers-search"
              placeholder="Buscar por nombre, correo o telÃ³fono"
              className="pl-11"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {customersQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>{customersQuery.error.message}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void customersQuery.refetch()}
              >
                Intentar nuevamente
              </Button>
            </div>
          ) : customersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl bg-atarah-cream-100"
                />
              ))}
            </div>
          ) : filteredCustomers.length ? (
            <>
              <div className="hidden overflow-x-auto 2xl:block">
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="border-b border-atarah-gold-300/60 text-left text-xs uppercase tracking-[0.18em] text-atarah-charcoal-600">
                      <th className="pb-3">Nombre</th>
                      <th className="pb-3">TelÃ³fono</th>
                      <th className="pb-3">Correo</th>
                      <th className="pb-3">Ciudad</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Registro</th>
                      <th className="pb-3">Pedidos</th>
                      <th className="pb-3 text-right">AcciÃ³n</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atarah-gold-300/40">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td className="py-4 font-semibold text-atarah-charcoal-900">
                          {customer.full_name}
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          {customer.phone ?? 'Sin tel?fono'}
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          {customer.email ?? 'Sin correo'}
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          {customer.city ?? 'Sin ciudad'}
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          {customer.state ?? 'Sin estado'}
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="py-4 text-sm font-medium text-atarah-charcoal-900">
                          {customer.orders_count}
                        </td>
                        <td className="py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Pencil className="size-4" />}
                            onClick={() => setEditingCustomer(customer)}
                          >
                            Editar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 2xl:hidden">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} variant="muted" className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-atarah-charcoal-900">
                          {customer.full_name}
                        </p>
                        <p className="text-sm text-atarah-charcoal-600">
                          {customer.email ?? 'Sin correo'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Pencil className="size-4" />}
                        onClick={() => setEditingCustomer(customer)}
                      >
                        Editar
                      </Button>
                    </div>
                    <div className="grid gap-2 text-sm text-atarah-charcoal-600 sm:grid-cols-2">
                      <p>TelÃ³fono: {customer.phone ?? 'Sin tel?fono'}</p>
                      <p>Ciudad: {customer.city ?? 'Sin ciudad'}</p>
                      <p>Estado: {customer.state ?? 'Sin estado'}</p>
                      <p>Pedidos: {customer.orders_count}</p>
                      <p>Registro: {formatDate(customer.created_at)}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No hay clientes registrados"
              description="Los clientes aparecer?n aqu? cuando existan registros en Supabase."
            />
          )}
        </Card>
      </div>

      {editingCustomer ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-atarah-charcoal-900/40 p-3 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border border-atarah-gold-200 bg-white p-4 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-atarah-wine-900">Editar cliente</h2>
                <p className="mt-1 text-sm text-atarah-charcoal-600">Corrige la informaciÃ³n del cliente si hubo un error al registrarlo.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingCustomer(null)}>
                <X className="size-5" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input id="customer-full-name" label="Nombre completo" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} />
              <Input id="customer-phone" label="TelÃ³fono" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
              <Input id="customer-email" label="Correo" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
              <Input id="customer-city" label="Ciudad" value={form.city} onChange={(event) => updateField('city', event.target.value)} />
              <Input id="customer-state" label="Estado" value={form.state} onChange={(event) => updateField('state', event.target.value)} />
              <div className="sm:col-span-2">
                <Textarea id="customer-address" label="Direcci?n" value={form.address} onChange={(event) => updateField('address', event.target.value)} />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setEditingCustomer(null)}>
                Cancelar
              </Button>
              <Button loading={updateCustomerMutation.isPending} onClick={() => void handleSubmit()}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}


