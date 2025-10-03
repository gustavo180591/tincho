# HACER.md

Este documento define lo que el sistema de e-commerce debe hacer con el stack **SvelteKit 2 + Svelte 5, Tailwind CSS 4, Prisma, PostgreSQL, Docker, Redis (opcional), y Mercado Pago**.

---

## 🎯 Objetivo General
Construir un sistema de e-commerce moderno, seguro y escalable que permita:
- Gestionar productos (CRUD).
- Ofrecer un catálogo público.
- Manejar carrito de compras y checkout.
- Integrar pagos con Mercado Pago.
- Administrar órdenes y stock.
- Proveer un panel administrativo para gestión completa.

---

## 📦 Módulos Principales

### 1. Autenticación y Roles
- Registro e inicio de sesión de usuarios.
- Roles: **Cliente**, **Admin**, **Operador**.
- Seguridad: contraseñas encriptadas, sesiones firmadas, CSRF protegido.

### 2. Gestión de Productos
- Crear, leer, actualizar y eliminar productos.
- Atributos: nombre, descripción, precio, stock, SKU, imágenes, categorías, variantes, SEO.
- Estados: **Draft**, **Published**, **Hidden**.
- Subida de imágenes con S3/R2 vía presigned URLs.
- Auditoría de cambios (logs).

### 3. Catálogo Público
- Página de listado de productos con filtros y búsqueda.
- Página de detalle de producto (`/products/[slug]`).
- Soporte de imágenes múltiples y variantes (ej: color/talle).
- SEO optimizado (title, description, slug único).

### 4. Carrito y Checkout
- Carrito persistente por usuario.
- Agregar productos y variantes al carrito.
- Validación de stock antes de iniciar checkout.
- Checkout con integración a Mercado Pago.
- Manejo de cupones y descuentos.

### 5. Órdenes
- Estados de orden: **Pending**, **Paid**, **Fulfilled**, **Canceled**.
- Relación orden ↔ usuario ↔ items ↔ variantes.
- Webhook de Mercado Pago para confirmar pagos.
- Descuento automático de stock al pago confirmado.
- Historial de órdenes por usuario.

### 6. Panel de Administración
- Dashboard con métricas básicas.
- Gestión de productos (CRUD completo).
- Gestión de órdenes (ver, cambiar estado).
- Gestión de usuarios y roles (opcional).
- Generación de reportes.

### 7. Infraestructura
- **Docker Compose**: `web`, `db (Postgres)`, `redis`, `meilisearch` (opcional).
- Migraciones automáticas con Prisma.
- Seeds iniciales de categorías y productos demo.
- CI/CD con tests y despliegue automatizado.

---

## 🔐 Seguridad
- Validación de inputs con Zod.
- Rate limiting en endpoints críticos (Redis).
- Sanitización de HTML/descripciones.
- Logs de auditoría de acciones admin.
- HTTPS obligatorio en producción.

---

## 🚀 Flujo Principal
1. **Admin** crea un producto en `/admin/products/new`.
2. **Cliente** navega catálogo público en `/products`.
3. Cliente agrega productos al carrito y hace checkout.
4. Se genera una **orden** en estado `PENDING`.
5. Cliente paga con **Mercado Pago**.
6. Webhook confirma pago → orden pasa a `PAID` → se descuenta stock.
7. Admin puede marcar orden como `FULFILLED` cuando se despacha.

---

## 📑 Rutas Clave

### Público
- `/products` → listado de productos.
- `/products/[slug]` → detalle.
- `/cart` → carrito.
- `/checkout` → inicio de pago.

### Admin
- `/admin/products` → listado de productos.
- `/admin/products/new` → creación.
- `/admin/products/[id]` → edición.
- `/admin/orders` → listado de órdenes.
- `/admin/orders/[id]` → detalle.

### API
- `POST /api/admin/products` → crear producto.
- `POST /api/checkout` → iniciar pago.
- `POST /api/webhooks/mp` → confirmar pago.

---

## ✅ Entregables
- Frontend con SvelteKit 2 + Tailwind 4.
- Backend en SvelteKit server actions + endpoints REST para integraciones.
- Base de datos PostgreSQL gestionada con Prisma.
- Infraestructura con Docker Compose.
- Integración completa con Mercado Pago.
- Panel administrativo funcional.
- Documentación técnica básica (HACER.md, .env.example, README.md).


## ✅ Creación de Rutas

### 1. Autenticación y Usuarios

#### Autenticación
- [x] `POST /api/auth/register` (Implementado en `/src/routes/api/auth/register/+server.ts`)
- [x] `POST /api/auth/login` (Implementado en `/src/routes/api/auth/login/+server.ts`)
- [x] `POST /api/auth/refresh-token` (Implementado en `/src/routes/api/auth/refresh-token/+server.ts`)
- [x] `POST /api/auth/forgot-password` (Implementado en `/src/routes/api/auth/forgot-password/+server.ts`)
- [x] `POST /api/auth/reset-password` (Implementado en `/src/routes/api/auth/reset-password/+server.ts`)
- [x] `GET /api/auth/me` (Implementado en `/src/routes/api/auth/me/+server.ts`)

#### Usuarios
- [x] `GET /api/users` (Implementado en `/src/routes/api/users/+server.ts`)
- [x] `GET /api/users/:id` (Implementado en `/src/routes/api/users/[id]/+server.ts`)
- [x] `PUT /api/users/:id` (Implementado en `/src/routes/api/users/[id]/+server.ts`)
- [x] `DELETE /api/users/:id` (Implementado en `/src/routes/api/users/[id]/+server.ts`)
- [x] `GET /api/users/:id/addresses` (Implementado en `/src/routes/api/users/userId/addresses/+server.ts`)
- [x] `POST /api/users/:id/addresses` (Implementado en `/src/routes/api/users/userId/addresses/+server.ts`)
- [x] `PUT /api/users/:id/addresses/:addressId` (Implementado en `/src/routes/api/users/userId/addresses/[addressId]/+server.ts`)
- [x] `DELETE /api/users/:id/addresses/:addressId` (Implementado en `/src/routes/api/users/userId/addresses/[addressId]/+server.ts`)

#### Perfiles
- [x] `GET /api/sellers` (Implementado en `/src/routes/api/sellers/+server.ts`)
- [x] `GET /api/sellers/:id` (Implementado en `/src/routes/api/sellers/[id]/+server.ts`)
- [x] `PUT /api/sellers/:id` (Implementado en `/src/routes/api/sellers/[id]/+server.ts`)
- [x] `GET /api/buyers/:id` (Implementado en `/src/routes/api/buyers/[id]/+server.ts`)
- [x] `PUT /api/buyers/:id` (Implementado en `/src/routes/api/buyers/[id]/+server.ts`)

### 2. Catálogo de Productos

#### Categorías
- [x] `GET /api/categories` (Implementado en `/src/routes/api/categories/+server.ts`)
- [x] `GET /api/categories/:id` (Implementado en `/src/routes/api/categories/[id]/+server.ts`)
- [x] `POST /api/categories` (Implementado en `/src/routes/api/categories/+server.ts`)
- [x] `PUT /api/categories/:id` (Implementado en `/src/routes/api/categories/[id]/+server.ts`)
- [x] `DELETE /api/categories/:id` (Implementado en `/src/routes/api/categories/[id]/+server.ts`)
- [x] `GET /api/categories/:id/products` (Implementado en `/src/routes/api/categories/[id]/products/+server.ts`)

#### Marcas
- [x] `GET /api/brands` (Implementado en `/src/routes/api/brands/+server.ts`)
- [x] `GET /api/brands/:id` (Implementado en `/src/routes/api/brands/[id]/+server.ts`)
- [x] `POST /api/brands` (Implementado en `/src/routes/api/brands/+server.ts`)
- [x] `PUT /api/brands/:id` (Implementado en `/src/routes/api/brands/[id]/+server.ts`)
- [x] `DELETE /api/brands/:id` (Implementado en `/src/routes/api/brands/[id]/+server.ts`)
- [x] `GET /api/brands/:id/products` (Implementado en `/src/routes/api/brands/[id]/products/+server.ts`)

#### Productos
- [x] `GET /api/products` (Implementado en `/src/routes/api/products/+server.ts`)
- [x] `GET /api/products/:id` (Implementado en `/src/routes/api/products/[id]/+server.ts`)
- [x] `POST /api/products` (Implementado en `/src/routes/api/products/+server.ts`)
- [x] `PUT /api/products/:id` (Implementado en `/src/routes/api/products/[id]/+server.ts`)
- [x] `DELETE /api/products/:id` (Implementado en `/src/routes/api/products/[id]/+server.ts`)
- [x] `GET /api/products/search` (Implementado en `/src/routes/api/products/+server.ts`)

#### SKUs
- [x] `GET /api/skus/:id` (Implementado en `/src/routes/api/products/[productId]/skus/+server.ts`)
- [x] `PUT /api/skus/:id` (Implementado en `/src/routes/api/products/[productId]/skus/+server.ts`)
- [x] `GET /api/products/:productId/skus` (Implementado en `/src/routes/api/products/[productId]/skus/+server.ts`)

#### Inventario
- [x] `GET /api/inventory` (Implementado en `/src/routes/api/inventory/+server.ts`)
- [x] `GET /api/inventory/:skuId` (Implementado en `/src/routes/api/inventory/[skuId]/+server.ts`)
- [x] `PUT /api/inventory/:skuId` (Implementado en `/src/routes/api/inventory/[skuId]/+server.ts`)
- [x] `GET /api/inventory/low-stock` (Implementado en `/src/routes/api/inventory/low-stock/+server.ts`)

#### Imágenes
- [x] `POST /api/products/:productId/images` (Implementado en `/src/routes/api/products/[productId]/images/+server.ts`)
- [x] `DELETE /api/images/:id` (Implementado en `/src/routes/api/images/[id]/+server.ts`)
- [x] `PUT /api/images/:id/reorder` (Implementado en `/src/routes/api/products/[productId]/images/+server.ts`)

### 3. Tiendas
- [x] `GET /api/stores` (Implementado en `/src/routes/api/stores/+server.ts`)
- [x] `GET /api/stores/:id` (Implementado en `/src/routes/api/stores/[id]/+server.ts`)
- [x] `POST /api/stores` (Implementado en `/src/routes/api/stores/+server.ts`)
- [x] `PUT /api/stores/:id` (Implementado en `/src/routes/api/stores/[id]/+server.ts`)
- [x] `DELETE /api/stores/:id` (Implementado en `/src/routes/api/stores/[id]/+server.ts`)
- [x] `GET /api/stores/:id/products` (Implementado en `/src/routes/api/stores/[id]/products/+server.ts`)
- [x] `GET /api/stores/:id/orders` (Implementado en `/src/routes/api/stores/[id]/orders/+server.ts`)
- [x] `GET /api/stores/:id/reviews` (Implementado en `/src/routes/api/stores/[id]/reviews/+server.ts`)

### 4. Carrito y Checkout

#### Carrito
- [x] `GET /api/cart` (Implementado en `/src/routes/api/cart/+server.ts`)
- [x] `POST /api/cart/items` (Implementado en `/src/routes/api/cart/items/+server.ts`)
- [x] `PUT /api/cart/items/:itemId` (Implementado en `/src/routes/api/cart/items/[itemId]/+server.ts`)
- [x] `DELETE /api/cart/items/:itemId` (Implementado en `/src/routes/api/cart/items/[itemId]/+server.ts`)
- [x] `POST /api/cart/checkout` (Implementado en `/src/routes/api/cart/+server.ts`)

#### Checkout
- [x] `POST /api/checkout/shipping` (Implementado en `/src/routes/api/checkout/shipping/+server.ts`)
- [x] `POST /api/checkout/payment` (Implementado en `/src/routes/api/checkout/payment/+server.ts`)
- [x] `POST /api/checkout/confirm` (Implementado en `/src/routes/api/checkout/confirm/+server.ts`)

### 5. Órdenes

#### Órdenes
- [x] `GET /api/orders` (Implementado en `/src/routes/api/orders/+server.ts`)
- [x] `GET /api/orders/:id` (Implementado en `/src/routes/api/orders/[id]/+server.ts`)
- [x] `POST /api/orders` (Implementado en `/src/routes/api/orders/+server.ts`)
- [x] `PUT /api/orders/:id/status` (Implementado en `/src/routes/api/orders/[orderId]/status/+server.ts`)
- [x] `GET /api/orders/user/:userId` (Implementado en `/src/routes/api/orders/user/[userId]/+server.ts`)
- [x] `GET /api/orders/store/:storeId` (Implementado en `/src/routes/api/orders/store/[storeId]/+server.ts`)

#### Items de orden
- [x] `GET /api/orders/:orderId/items` (Implementado en `/src/routes/api/orders/[orderId]/items/+server.ts`)
- [x] `GET /api/order-items/:id` (Implementado en `/src/routes/api/order-items/[id]/+server.ts`)

#### Historial de estados
- [x] `GET /api/orders/:orderId/status-history` (Implementado en `/src/routes/api/orders/[orderId]/status-history/+server.ts`)
- [x] `POST /api/orders/:orderId/status` (Implementado en `/src/routes/api/orders/[orderId]/status/+server.ts`)

### 6. Pagos

#### Pagos
- [x] `GET /api/payments`
- [x] `GET /api/payments/:id`
- [x] `POST /api/payments`
- [x] `POST /api/payments/:id/capture`
- [x] `POST /api/payments/:id/refund`
- [x] `GET /api/orders/:orderId/payments`

#### Métodos de pago del usuario
- [ ] `GET /api/user/payment-methods`
- [ ] `POST /api/user/payment-methods`
- [ ] `PUT /api/user/payment-methods/:id`
- [ ] `DELETE /api/user/payment-methods/:id`
- [ ] `SET_DEFAULT /api/user/payment-methods/:id/set-default`

### 7. Envíos

#### Envíos
- [x] `GET /api/shipments` (Implementado en `/src/routes/api/shipments/+server.ts`)
- [x] `GET /api/shipments/:id` (Implementado en `/src/routes/api/shipments/[id]/+server.ts`)
- [x] `POST /api/shipments` (Implementado en `/src/routes/api/shipments/+server.ts`)
- [x] `PUT /api/shipments/:id/status` (Implementado en `/src/routes/api/shipments/[id]/status/+server.ts`)
- [x] `GET /api/orders/:orderId/shipments` (Implementado en `/src/routes/api/orders/[orderId]/shipments/+server.ts`)

#### Items de envío
- [x] `GET /api/shipments/:shipmentId/items` (Implementado en `/src/routes/api/shipments/[shipmentId]/items/+server.ts`)

#### Historial de estados de envío
- [x] `GET /api/shipments/:shipmentId/status-history` (Implementado en `/src/routes/api/shipments/[shipmentId]/status-history/+server.ts`)

### 8. Devoluciones y Reembolsos

#### Devoluciones
- [x] `GET /api/returns` (Implementado en `/src/routes/api/returns/+server.ts`)
- [x] `GET /api/returns/:id` (Implementado en `/src/routes/api/returns/[id]/+server.ts`)
- [x] `POST /api/returns` (Implementado en `/src/routes/api/returns/+server.ts`)
- [x] `PUT /api/returns/:id/status` (Implementado en `/src/routes/api/returns/[id]/status/+server.ts`)
- [x] `GET /api/orders/:orderId/returns` (Implementado en `/src/routes/api/orders/[orderId]/returns/+server.ts`)

#### Items de devolución
- [x] `GET /api/returns/:returnId/items` (Implementado en `/src/routes/api/returns/[returnId]/items/+server.ts`)

#### Reembolsos
- [x] `GET /api/refunds` (Implementado en `/src/routes/api/refunds/+server.ts`)
- [x] `GET /api/refunds/:id` (Implementado en `/src/routes/api/refunds/[id]/+server.ts`)
- [x] `POST /api/refunds` (Implementado en `/src/routes/api/refunds/+server.ts`)

### 9. Interacción del Usuario

#### Preguntas y Respuestas
- [ ] `GET /api/products/:productId/questions`
- [ ] `POST /api/products/:productId/questions`
- [ ] `GET /api/questions/:id`
- [ ] `POST /api/questions/:id/answers`
- [ ] `PUT /api/answers/:id`
- [ ] `DELETE /api/answers/:id`

#### Reseñas
- [ ] `GET /api/products/:productId/reviews`
- [ ] `POST /api/orders/:orderId/reviews`
- [ ] `GET /api/reviews/:id`
- [ ] `PUT /api/reviews/:id`
- [ ] `DELETE /api/reviews/:id`

#### Favoritos
- [ ] `GET /api/user/favorites`
- [ ] `POST /api/products/:productId/favorite`
- [ ] `DELETE /api/products/:productId/favorite`

### 10. Mensajería

#### Conversaciones
- [ ] `GET /api/conversations`
- [ ] `GET /api/conversations/:id`
- [ ] `POST /api/conversations`
- [ ] `GET /api/conversations/with-user/:userId`
- [ ] `GET /api/conversations/for-product/:productId`
- [ ] `GET /api/conversations/for-order/:orderId`

#### Mensajes
- [ ] `GET /api/conversations/:conversationId/messages`
- [ ] `POST /api/conversations/:conversationId/messages`
- [ ] `GET /api/messages/:id`
- [ ] `DELETE /api/messages/:id`

#### Archivos adjuntos
- [ ] `POST /api/messages/:messageId/attachments`
- [ ] `DELETE /api/attachments/:id`

### 11. Promociones y Descuentos

#### Promociones
- [ ] `GET /api/promotions`
- [ ] `GET /api/promotions/:id`
- [ ] `POST /api/promotions`
- [ ] `PUT /api/promotions/:id`
- [ ] `DELETE /api/promotions/:id`
- [ ] `POST /api/promotions/:id/apply`
- [ ] `POST /api/promotions/validate`

#### Cupones
- [ ] `GET /api/coupons`
- [ ] `GET /api/coupons/:code`
- [ ] `POST /api/coupons`
- [ ] `PUT /api/coupons/:id`
- [ ] `DELETE /api/coupons/:id`
- [ ] `POST /api/coupons/validate`

### 12. Notificaciones

#### Notificaciones
- [ ] `GET /api/notifications`
- [ ] `GET /api/notifications/unread`
- [ ] `GET /api/notifications/:id`
- [ ] `PUT /api/notifications/:id/read`
- [ ] `PUT /api/notifications/read-all`
- [ ] `DELETE /api/notifications/:id`

#### Preferencias de notificación
- [ ] `GET /api/notification-preferences`
- [ ] `PUT /api/notification-preferences`

### 13. Reportes y Análisis

#### Reportes de ventas
- [ ] `GET /api/reports/sales`
- [ ] `GET /api/reports/products`
- [ ] `GET /api/reports/categories`
- [ ] `GET /api/reports/customers`

#### Métricas del vendedor
- [ ] `GET /api/seller/metrics`
- [ ] `GET /api/seller/performance`
- [ ] `GET /api/seller/inventory-report`

### 14. Configuración del Sistema

#### Configuración
- [ ] `GET /api/settings`
- [ ] `GET /api/settings/:key`
- [ ] `PUT /api/settings/:key`
- [ ] `GET /api/settings/public`

#### Monedas y Regiones
- [ ] `GET /api/currencies`
- [ ] `GET /api/countries`
- [ ] `GET /api/countries/:countryId/states`
- [ ] `GET /api/states/:stateId/cities`
