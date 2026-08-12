import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ProtectedRoute } from '../components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '../components/auth/PublicOnlyRoute'
import { AdminLayout } from '../layouts/AdminLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { AdminCategoriesPage } from '../pages/admin/AdminCategoriesPage'
import { AdminCustomersPage } from '../pages/admin/AdminCustomersPage'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminDebtorsPage } from '../pages/admin/AdminDebtorsPage'
import { AdminDiscountsPage } from '../pages/admin/AdminDiscountsPage'
import { AdminProductFormPage } from '../pages/admin/AdminProductFormPage'
import { NotFoundAdminPage } from '../pages/admin/NotFoundAdminPage'
import { AdminOrdersPage } from '../pages/admin/AdminOrdersPage'
import { AdminReportsPage } from '../pages/admin/AdminReportsPage'
import { AdminProductsPage } from '../pages/admin/AdminProductsPage'
import { AdminSellerOrderCreatePage } from '../pages/admin/AdminSellerOrderCreatePage'
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage'
import { AdminSellersPage } from '../pages/admin/AdminSellersPage'
import { AdminLoginPage } from '../pages/auth/AdminLoginPage'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { RegisterPage } from '../pages/auth/RegisterPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { CartPage } from '../pages/public/CartPage'
import { CatalogPage } from '../pages/public/CatalogPage'
import { CheckoutPage } from '../pages/public/CheckoutPage'
import { CustomerAccountPage } from '../pages/public/CustomerAccountPage'
import { HomePage } from '../pages/public/HomePage'
import { OrderConfirmationPage } from '../pages/public/OrderConfirmationPage'
import { OrderTrackingPage } from '../pages/public/OrderTrackingPage'
import { ProductDetailPage } from '../pages/public/ProductDetailPage'
import { AppProvidersOutlet } from './providers'

export const router = createBrowserRouter([
  {
    element: <AppProvidersOutlet />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/catalogo', element: <CatalogPage /> },
          { path: '/catalogo/:slug', element: <ProductDetailPage /> },
          { path: '/productos', element: <Navigate to="/catalogo" replace /> },
          { path: '/productos/:slug', element: <ProductDetailPage /> },
          { path: '/carrito', element: <CartPage /> },
          { path: '/pedido/confirmacion/:orderNumber', element: <OrderConfirmationPage /> },
          { path: '/pedido/:orderNumber', element: <OrderTrackingPage /> },
        ],
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/acceso', element: <AdminLoginPage /> },
          { path: '/admin/login', element: <AdminLoginPage /> },
          { path: '/registro', element: <RegisterPage /> },
          { path: '/recuperar-contrasena', element: <ForgotPasswordPage /> },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['customer']} />,
        children: [
          { path: '/mi-cuenta', element: <CustomerAccountPage /> },
          { path: '/checkout', element: <CheckoutPage /> },
        ],
      },
      {
        path: '/admin',
        element: (
          <ProtectedRoute allowedRoles={['admin', 'seller']}>
            <AdminLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          {
            element: <ProtectedRoute allowedRoles={['admin', 'seller']} />,
            children: [
              { path: 'pedidos', element: <AdminOrdersPage /> },
              { path: 'pedidos/nuevo', element: <AdminSellerOrderCreatePage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['admin']} />,
            children: [
              { path: 'productos', element: <AdminProductsPage /> },
              { path: 'productos/nuevo', element: <AdminProductFormPage mode="create" /> },
              { path: 'productos/:id/editar', element: <AdminProductFormPage mode="edit" /> },
              { path: 'categorias', element: <AdminCategoriesPage /> },
              { path: 'descuentos', element: <AdminDiscountsPage /> },
              { path: 'deudores', element: <AdminDebtorsPage /> },
              { path: 'reportes', element: <AdminReportsPage /> },
              { path: 'clientes', element: <AdminCustomersPage /> },
              { path: 'vendedores', element: <AdminSellersPage /> },
              { path: 'configuracion', element: <AdminSettingsPage /> },
            ],
          },
          { path: '*', element: <NotFoundAdminPage /> },
        ],
      },
      { path: '/restablecer-contrasena', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])