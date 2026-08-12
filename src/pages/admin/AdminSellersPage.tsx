import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, Pencil, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'

import { EmptyState } from '../../components/common/EmptyState'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { formatDate } from '../../lib/utils'
import {
  createAdminSeller,
  getAdminSellers,
  setAdminSellerActive,
  updateAdminSeller,
  type AdminSeller,
} from '../../services/sellers.service'

const PHONE_PREFIXES = ['0412', '0414', '0416', '0424', '0426'] as const

const sellerCreateSchema = z.object({
  email: z.string().trim().email('Ingresa un correo valido.'),
  full_name: z.string().trim().min(3, 'Ingresa el nombre del vendedor.'),
  password: z.string().min(6, 'La contrasena debe tener al menos 6 caracteres.'),
  phone: z.string().regex(/^0(412|414|416|424|426)\d{7}$/, 'Ingresa un telefono venezolano valido.'),
})

const sellerEditSchema = z.object({
  email: z.string().trim().email('Ingresa un correo valido.'),
  full_name: z.string().trim().min(3, 'Ingresa el nombre del vendedor.'),
  phone: z.string().regex(/^0(412|414|416|424|426)\d{7}$/, 'Ingresa un telefono venezolano valido.'),
})

function splitPhone(value: string | null | undefined) {
  const normalized = (value ?? '').replace(/\D/g, '')
  const prefix = normalized.slice(0, 4)
  const number = normalized.slice(4, 11)

  if (PHONE_PREFIXES.includes(prefix as (typeof PHONE_PREFIXES)[number])) {
    return { number, prefix }
  }

  return { number: normalized.slice(0, 7), prefix: PHONE_PREFIXES[0] }
}

export function AdminSellersPage() {
  const [search, setSearch] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreatePasswordVisible, setIsCreatePasswordVisible] = useState(false)
  const [createForm, setCreateForm] = useState({ email: '', full_name: '', password: '', phone: '' })
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({})
  const [createPhonePrefix, setCreatePhonePrefix] = useState<string>(PHONE_PREFIXES[0])
  const [createPhoneNumber, setCreatePhoneNumber] = useState('')
  const [editingSeller, setEditingSeller] = useState<AdminSeller | null>(null)
  const [editForm, setEditForm] = useState({ email: '', full_name: '', phone: '' })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [editPhonePrefix, setEditPhonePrefix] = useState<string>(PHONE_PREFIXES[0])
  const [editPhoneNumber, setEditPhoneNumber] = useState('')
  const [sellerToToggle, setSellerToToggle] = useState<AdminSeller | null>(null)
  const queryClient = useQueryClient()

  useDocumentTitle('Vendedores | Atarah Atelier')

  const sellersQuery = useQuery({
    queryFn: getAdminSellers,
    queryKey: ['admin-sellers'],
  })

  const createSellerMutation = useMutation({
    mutationFn: createAdminSeller,
    onSuccess: async (_, values) => {
      toast.success('Vendedor creado.', {
        description: `${values.full_name} ya puede ingresar al panel.`,
      })
      setIsCreateModalOpen(false)
      setCreateForm({ email: '', full_name: '', password: '', phone: '' })
      setCreateErrors({})
      setCreatePhonePrefix(PHONE_PREFIXES[0])
      setCreatePhoneNumber('')
      await queryClient.invalidateQueries({ queryKey: ['admin-sellers'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible crear el vendedor.')
    },
  })

  const updateSellerMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: { email: string; full_name: string; phone: string } }) =>
      updateAdminSeller(id, values),
    onSuccess: async () => {
      toast.success('Vendedor actualizado.')
      setEditingSeller(null)
      setEditErrors({})
      await queryClient.invalidateQueries({ queryKey: ['admin-sellers'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el vendedor.')
    },
  })

  const toggleSellerMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setAdminSellerActive(id, isActive),
    onSuccess: async (_, values) => {
      toast.success(values.isActive ? 'Vendedor activado.' : 'Vendedor desactivado.')
      setSellerToToggle(null)
      await queryClient.invalidateQueries({ queryKey: ['admin-sellers'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No fue posible actualizar el estado del vendedor.')
    },
  })

  useEffect(() => {
    if (!editingSeller) {
      setEditForm({ email: '', full_name: '', phone: '' })
      setEditErrors({})
      setEditPhonePrefix(PHONE_PREFIXES[0])
      setEditPhoneNumber('')
      return
    }

    const { prefix, number } = splitPhone(editingSeller.phone)
    setEditPhonePrefix(prefix)
    setEditPhoneNumber(number)
    setEditForm({
      email: editingSeller.email ?? '',
      full_name: editingSeller.full_name,
      phone: `${prefix}${number}`,
    })
  }, [editingSeller])

  const filteredSellers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return (sellersQuery.data ?? []).filter((seller) => {
      if (!query) {
        return true
      }

      return [seller.full_name, seller.email ?? '', seller.phone ?? '']
        .join(' ')
        .toLowerCase()
        .includes(query)
    })
  }, [search, sellersQuery.data])

  function updateCreateField(field: 'email' | 'full_name' | 'password' | 'phone', value: string) {
    setCreateForm((current) => ({ ...current, [field]: value }))
    setCreateErrors((current) => ({ ...current, [field]: '' }))
  }

  function updateEditField(field: 'email' | 'full_name' | 'phone', value: string) {
    setEditForm((current) => ({ ...current, [field]: value }))
    setEditErrors((current) => ({ ...current, [field]: '' }))
  }

  function handleCreatePhoneChange(prefix: string, number: string) {
    const cleaned = number.replace(/\D/g, '').slice(0, 7)
    setCreatePhonePrefix(prefix)
    setCreatePhoneNumber(cleaned)
    updateCreateField('phone', `${prefix}${cleaned}`)
  }

  function handleEditPhoneChange(prefix: string, number: string) {
    const cleaned = number.replace(/\D/g, '').slice(0, 7)
    setEditPhonePrefix(prefix)
    setEditPhoneNumber(cleaned)
    updateEditField('phone', `${prefix}${cleaned}`)
  }

  async function handleCreateSeller() {
    const parsed = sellerCreateSchema.safeParse(createForm)

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0] ?? '')] = issue.message
      }
      setCreateErrors(fieldErrors)
      return
    }

    await createSellerMutation.mutateAsync({ ...parsed.data, role: 'seller' })
  }

  async function handleUpdateSeller() {
    if (!editingSeller) {
      return
    }

    const parsed = sellerEditSchema.safeParse(editForm)

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[String(issue.path[0] ?? '')] = issue.message
      }
      setEditErrors(fieldErrors)
      return
    }

    await updateSellerMutation.mutateAsync({ id: editingSeller.id, values: parsed.data })
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Vendedores"
          description="Gestiona el equipo comercial: crea cuentas, corrige datos de contacto y controla sus accesos."
          action={
            <Button leftIcon={<UserPlus className="size-4" />} onClick={() => setIsCreateModalOpen(true)}>
              Crear vendedor
            </Button>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="space-y-2 border-none bg-white shadow-md shadow-atarah-gold-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-atarah-charcoal-500">Total</p>
            <p className="font-display text-4xl font-bold text-atarah-wine-900">{sellersQuery.data?.length ?? 0}</p>
            <p className="text-sm text-atarah-charcoal-600">Vendedores registrados</p>
          </Card>
          <Card className="space-y-2 border-none bg-white shadow-md shadow-atarah-gold-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-atarah-charcoal-500">Activos</p>
            <p className="font-display text-4xl font-bold text-emerald-700">{(sellersQuery.data ?? []).filter((seller) => seller.is_active).length}</p>
            <p className="text-sm text-atarah-charcoal-600">Con acceso habilitado</p>
          </Card>
          <Card className="space-y-2 border-none bg-white shadow-md shadow-atarah-gold-200/20">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-atarah-charcoal-500">Ventas</p>
            <p className="font-display text-4xl font-bold text-atarah-wine-900">{(sellersQuery.data ?? []).reduce((total, seller) => total + seller.orders_count, 0)}</p>
            <p className="text-sm text-atarah-charcoal-600">Pedidos creados por vendedores</p>
          </Card>
        </div>

        <Card className="space-y-4 border-none bg-white shadow-md shadow-atarah-gold-200/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-atarah-wine-900">Equipo comercial</h2>
              <p className="text-sm text-atarah-charcoal-600">Consulta su estado actual, sus datos y quien puede entrar al panel.</p>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-4 size-4 text-atarah-charcoal-600" />
              <Input
                id="sellers-search"
                className="pl-11"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, correo o telefono"
              />
            </div>
          </div>

          {sellersQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p>{sellersQuery.error.message}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void sellersQuery.refetch()}>
                Intentar nuevamente
              </Button>
            </div>
          ) : sellersQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 animate-pulse rounded-2xl bg-atarah-cream-100" />
              ))}
            </div>
          ) : filteredSellers.length ? (
            <>
              <div className="hidden overflow-x-auto xl:block">
                <table className="min-w-full table-fixed">
                  <thead>
                    <tr className="border-b border-atarah-gold-300/60 text-left text-xs uppercase tracking-[0.18em] text-atarah-charcoal-600">
                      <th className="pb-3">Vendedor</th>
                      <th className="pb-3">Contacto</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Pedidos</th>
                      <th className="pb-3">Ultimo pedido</th>
                      <th className="pb-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-atarah-gold-300/40">
                    {filteredSellers.map((seller) => (
                      <tr key={seller.id}>
                        <td className="py-4">
                          <p className="font-semibold text-atarah-charcoal-900">{seller.full_name}</p>
                          <p className="text-xs text-atarah-charcoal-500">Registro: {formatDate(seller.created_at)}</p>
                        </td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">
                          <p>{seller.email ?? 'Sin correo de contacto'}</p>
                          <p>{seller.phone ?? 'Sin telefono'}</p>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${seller.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                            {seller.is_active ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-4 text-sm font-medium text-atarah-charcoal-900">{seller.orders_count}</td>
                        <td className="py-4 text-sm text-atarah-charcoal-600">{formatDate(seller.last_order_at)}</td>
                        <td className="py-4">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-4" />} onClick={() => setEditingSeller(seller)}>
                              Editar
                            </Button>
                            <Button variant={seller.is_active ? 'outline' : 'primary'} size="sm" leftIcon={<ShieldCheck className="size-4" />} onClick={() => setSellerToToggle(seller)}>
                              {seller.is_active ? 'Desactivar' : 'Activar'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 xl:hidden">
                {filteredSellers.map((seller) => (
                  <Card key={seller.id} variant="muted" className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-atarah-charcoal-900">{seller.full_name}</p>
                        <p className="text-sm text-atarah-charcoal-600">{seller.email ?? 'Sin correo de contacto'}</p>
                        <p className="text-sm text-atarah-charcoal-600">{seller.phone ?? 'Sin telefono'}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${seller.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                        {seller.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="grid gap-2 text-sm text-atarah-charcoal-600">
                      <p>Pedidos: {seller.orders_count}</p>
                      <p>Ultimo pedido: {formatDate(seller.last_order_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="flex-1" leftIcon={<Pencil className="size-4" />} onClick={() => setEditingSeller(seller)}>
                        Editar
                      </Button>
                      <Button variant={seller.is_active ? 'outline' : 'primary'} size="sm" className="flex-1" leftIcon={<ShieldCheck className="size-4" />} onClick={() => setSellerToToggle(seller)}>
                        {seller.is_active ? 'Desactivar' : 'Activar'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No hay vendedores registrados"
              description="Crea la primera cuenta comercial para comenzar a registrar pedidos internos."
            />
          )}
        </Card>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-atarah-charcoal-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-atarah-gold-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-atarah-wine-900">Crear vendedor</h2>
                <p className="mt-1 text-sm text-atarah-charcoal-600">Genera una cuenta nueva y guarda sus datos de contacto.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input id="seller-create-name" label="Nombre completo" value={createForm.full_name} onChange={(event) => updateCreateField('full_name', event.target.value)} error={createErrors.full_name} />
              <Input id="seller-create-email" type="email" label="Correo" value={createForm.email} onChange={(event) => updateCreateField('email', event.target.value)} error={createErrors.email} helperText="Correo de acceso y de contacto al crear la cuenta." />
              <div>
                <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">Telefono</label>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                  <Select value={createPhonePrefix} onChange={(event) => handleCreatePhoneChange(event.target.value, createPhoneNumber)}>
                    {PHONE_PREFIXES.map((prefix) => (
                      <option key={prefix} value={prefix}>{prefix}</option>
                    ))}
                  </Select>
                  <Input id="seller-create-phone" inputMode="numeric" maxLength={7} placeholder="0000000" value={createPhoneNumber} onChange={(event) => handleCreatePhoneChange(createPhonePrefix, event.target.value)} error={createErrors.phone} />
                </div>
                {!createErrors.phone ? <p className="mt-1 text-xs text-atarah-charcoal-500">Ejemplo: {createPhonePrefix}1234567</p> : null}
              </div>
              <div className="relative">
                <Input id="seller-create-password" type={isCreatePasswordVisible ? 'text' : 'password'} label="Contrasena temporal" className="pr-12" value={createForm.password} onChange={(event) => updateCreateField('password', event.target.value)} error={createErrors.password} />
                <button type="button" className="absolute right-4 top-[2.8rem] rounded-full p-1 text-atarah-charcoal-600 transition hover:text-atarah-wine-900" onClick={() => setIsCreatePasswordVisible((current) => !current)}>
                  {isCreatePasswordVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button loading={createSellerMutation.isPending} onClick={() => void handleCreateSeller()}>Crear vendedor</Button>
            </div>
          </div>
        </div>
      ) : null}

      {editingSeller ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-atarah-charcoal-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-atarah-gold-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-atarah-wine-900">Editar vendedor</h2>
                <p className="mt-1 text-sm text-atarah-charcoal-600">Puedes corregir nombre, correo y telefono de contacto.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingSeller(null)}>
                <X className="size-5" />
              </Button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Input id="seller-edit-name" label="Nombre completo" value={editForm.full_name} onChange={(event) => updateEditField('full_name', event.target.value)} error={editErrors.full_name} />
              <Input id="seller-edit-email" type="email" label="Correo de contacto" value={editForm.email} onChange={(event) => updateEditField('email', event.target.value)} error={editErrors.email} helperText="El correo real de acceso de Supabase Auth requiere gestion aparte." />
              <div>
                <label className="mb-2 block text-sm font-semibold text-atarah-charcoal-700">Telefono</label>
                <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
                  <Select value={editPhonePrefix} onChange={(event) => handleEditPhoneChange(event.target.value, editPhoneNumber)}>
                    {PHONE_PREFIXES.map((prefix) => (
                      <option key={prefix} value={prefix}>{prefix}</option>
                    ))}
                  </Select>
                  <Input id="seller-edit-phone" inputMode="numeric" maxLength={7} placeholder="0000000" value={editPhoneNumber} onChange={(event) => handleEditPhoneChange(editPhonePrefix, event.target.value)} error={editErrors.phone} />
                </div>
                {!editErrors.phone ? <p className="mt-1 text-xs text-atarah-charcoal-500">Ejemplo: {editPhonePrefix}1234567</p> : null}
              </div>
              <Input id="seller-edit-status" label="Estado" value={editingSeller.is_active ? 'Activo' : 'Inactivo'} readOnly />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditingSeller(null)}>Cancelar</Button>
              <Button loading={updateSellerMutation.isPending} onClick={() => void handleUpdateSeller()}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(sellerToToggle)}
        title={sellerToToggle?.is_active ? 'Desactivar vendedor' : 'Activar vendedor'}
        description={sellerToToggle?.is_active ? 'El vendedor dejara de poder iniciar sesion y registrar pedidos hasta que lo vuelvas a activar.' : 'El vendedor recuperara acceso al panel y podra volver a registrar pedidos.'}
        confirmLabel={sellerToToggle?.is_active ? 'Desactivar' : 'Activar'}
        tone={sellerToToggle?.is_active ? 'danger' : 'default'}
        onCancel={() => setSellerToToggle(null)}
        onConfirm={() => {
          if (!sellerToToggle) {
            return
          }

          void toggleSellerMutation.mutateAsync({
            id: sellerToToggle.id,
            isActive: !sellerToToggle.is_active,
          })
        }}
      />
    </>
  )
}