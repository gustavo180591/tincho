# 🛍️ E-commerce Task List

## 📂 Público

### 🏠 / (Inicio / Feed)
- [x] `src/routes/+page.server.ts`
  - [x] Modelos: `Product`, `ProductImage`, `Sku`
  - [x] Query: últimos activos, 1 imagen y 1 SKU por producto
- [x] `src/routes/+page.svelte`
  - [x] Render grid con `ProductCard`
  - [x] Relación con schema: `Product.active`, `Product.updatedAt`, `Product.images`, `Product.variations`

### 🔍 /search (Búsqueda con filtros)
- [ ] `src/routes/search/+page.server.ts`
  - [ ] Modelos: `Product`, `Category`, `Brand`, `Sku`
  - [ ] Filtros: `q` sobre `Product.title`, `category` por `Category.slug`, `brand` por `Brand.slug`, precio por `Sku.priceAmount`
- [ ] `src/routes/search/+page.svelte`
  - [ ] Join implícito por relaciones `Product.category`, `Product.brand`, y subconsulta en `Sku`

### 📂 /categories (Índice de categorías)
- [ ] `src/routes/categories/+page.server.ts`
  - [ ] Modelos: `Category`
  - [ ] Query: raíces (`parentId = null`) + children
- [ ] `src/routes/categories/+page.svelte`
  - [ ] Self-relation `Category` ↔ `Category` (`CategoryHierarchy`)

### 🏷️ /c/[slug] (Productos por categoría)
- [ ] `src/routes/c/[slug]/+page.server.ts`
  - [ ] Modelos: `Category`, `Product`, `ProductImage`, `Sku`
  - [ ] Busca `Category.slug`, luego productos por `categoryId`
- [ ] `src/routes/c/[slug]/+page.svelte`
  - [ ] Relación: `Product.categoryId`, índices `@@index([storeId, categoryId, active])`

### 🏢 /brands (Listado de marcas)
- [ ] `src/routes/brands/+page.server.ts`
  - [ ] Modelo: `Brand`
  - [ ] Orden alfabético
- [ ] `src/routes/brands/+page.svelte`
  - [ ] Relación: `Brand` y su `slug` único

### 🏭 /b/[slug] (Productos por marca)
- [ ] `src/routes/b/[slug]/+page.server.ts`
  - [ ] Modelos: `Brand`, `Product`, `ProductImage`, `Sku`
  - [ ] Busca `Brand.slug`, luego productos por `brandId`
- [ ] `src/routes/b/[slug]/+page.svelte`
  - [ ] Relación: `Product.brandId` y el índice `@@index([brandId])`

### 🛒 /p/[slug] (Ficha de producto)
- [ ] `src/routes/p/[slug]/+page.server.ts`
  - [ ] Modelos: `Product`, `ProductImage`, `Store`, `Brand`, `Category`, `Sku`, `Question`, `Answer`, `User`, `Review`
  - [ ] Incluye variantes, preguntas (con `Answer` y `User`), reviews
- [ ] `src/routes/p/[slug]/+page.svelte`
  - [ ] Relación: `Question.productId`, `Answer.questionId`
  - [ ] Relación: `Review.productId`, `Review.orderItemId` (validar flujo de compra)
  - [ ] Relación: `Product.store`/`brand`/`category`

### 🏪 /stores/[slug] (Catálogo por tienda)
- [ ] `src/routes/stores/[slug]/+page.server.ts`
  - [ ] Modelos: `Store`, `Product`, `ProductImage`, `Sku`
  - [ ] Busca `Store.slug`, lista `Product` por `storeId`
- [ ] `src/routes/stores/[slug]/+page.svelte`
  - [ ] Relación: `Product.storeId`, índice `@@index([storeId, number])` para órdenes

### ❓ /help, /legal
- [ ] `src/routes/help/+page.svelte` (estático)
- [ ] `src/routes/legal/+page.svelte` (estático)
  - [ ] No tocan DB

## 🔐 Autenticación

### 🔑 /auth/login
- [ ] `src/routes/auth/login/+page.svelte` (formulario)
- [ ] `src/routes/auth/login/+page.server.ts` (acción: validar y setear sesión)

### ✍️ /auth/register
- [ ] `src/routes/auth/register/+page.svelte`
- [ ] `src/routes/auth/register/+page.server.ts`
  - [ ] Modelo: `User` (email único, passwordHash, nombres, doc opcional)
  - [ ] Crear `BuyerProfile` vacío

### 🚪 /auth/logout
- [ ] `src/routes/auth/logout/+server.ts`
  - [ ] Método POST: invalidar sesión

## 👤 Comprador (Buyer)

### 📋 /account (Resumen)
- [ ] `src/routes/account/+page.server.ts`
  - [ ] Modelos: `User`, `Order` (últimas), `Favorite` (conteo), `Address` (default)
- [ ] `src/routes/account/+page.svelte`
  - [ ] Relación: `Order.buyerId`, `Favorite.userId`, `Address.userId`

### 👤 /account/profile
- [ ] `src/routes/account/profile/+page.server.ts`
  - [ ] Modelo: `User` (lectura)
- [ ] `src/routes/account/profile/+page.svelte`
- [ ] `src/routes/account/profile/+server.ts`
  - [ ] PATCH: actualizar `phone`, `firstName`, `lastName`, `docType`, `docNumber`
  - [ ] Relación: `User` simple

### 🏠 /account/addresses
- [ ] `src/routes/account/addresses/+page.server.ts`
  - [ ] Modelos: `Address`, `Country`, `State`, `City`
- [ ] `src/routes/account/addresses/+page.svelte`
- [ ] `src/routes/account/addresses/+server.ts`
  - [ ] POST: crear dirección (`Address.userId` = usuario actual)
  - [ ] PATCH /make-default: transacción para setear `isDefault` por tipo
  - [ ] DELETE: eliminar (solo propias)
  - [ ] Relación: `Address.userId`, `Address.cityId` → `City` → `State` → `Country`

### ❤️ /account/favorites
- [ ] `src/routes/account/favorites/+page.server.ts`
  - [ ] Modelos: `Favorite`, `Product`, `ProductImage`
- [ ] `src/routes/account/favorites/+page.svelte`
- [ ] `src/routes/account/favorites/+server.ts`
  - [ ] POST `{ productId }` crea `Favorite` (PK compuesta)
  - [ ] DELETE `/:productId`
  - [ ] Relación: `Favorite @@id([userId, productId])` evita duplicados

### 🛒 /account/orders
- [ ] `src/routes/account/orders/+page.server.ts`
  - [ ] Modelos: `Order` (de `buyerId` = yo), `Payment`, `Shipment`
  - [ ] Paginación, filtro `status`
- [ ] `src/routes/account/orders/+page.svelte`
  - [ ] Relación: `Order.buyerId`, `Order.status`, `Order.placedAt`

### 📦 /account/orders/[id] (Detalle)
- [ ] `src/routes/account/orders/[id]/+page.server.ts`
  - [ ] Modelos: `Order`, `OrderItem`, `Payment`, `Shipment`, `Address`
- [ ] `src/routes/account/orders/[id]/+page.svelte`
  - [ ] Relación 1:N `Order.items`
  - [ ] 1:1 `Order.shipment` (en `Shipment.orderId @unique`)

### ❓ /account/questions
- [ ] `src/routes/account/questions/+page.server.ts`
  - [ ] Modelos: `Question`, `Product`, `Answer`
  - [ ] Filtro por `userId` = yo
- [ ] `src/routes/account/questions/+page.svelte`
- [ ] (Opcional) `src/routes/account/questions/+server.ts`
  - [ ] POST para crear `Question` (normalmente desde `/p/[slug]`)
  - [ ] Relación: `Question.userId`, `Answer.questionId`

### ⭐ /account/reviews
- [ ] `src/routes/account/reviews/+page.server.ts`
  - [ ] Modelos: `Review`, `OrderItem`, `Product`
  - [ ] Filtro `userId` = yo
- [ ] `src/routes/account/reviews/+page.svelte`
- [ ] `src/routes/account/reviews/+server.ts`
  - [ ] POST `/api/order-items/[id]/review` valida que el `OrderItem` sea del comprador y que la orden esté `DELIVERED`
  - [ ] Relación: `Review.orderItemId @unique`, `Review.productId`, `Order.status`

## 🛒 Carrito y Pago

### 🛍️ /cart
- [ ] `src/routes/cart/+page.server.ts`
  - [ ] Modelos: `Cart` (por cookie/usuario), `CartItem`, `Sku`, `Product`, `ProductImage`
- [ ] `src/routes/cart/+page.svelte`
- [ ] `src/routes/cart/+server.ts`
  - [ ] POST `/items` upsert por `cartId`+`skuId` (único)
  - [ ] PATCH `/items/[id]` (cantidad)
  - [ ] DELETE `/items/[id]`
  - [ ] Relación: `Cart.items`, `CartItem.priceAt` (precio congelado), `@@unique([cartId, skuId])`

### 💳 /checkout
- [ ] `src/routes/checkout/+page.server.ts`
  - [ ] Modelos: `Cart`, `Address` (default), `User`
- [ ] `src/routes/checkout/+page.svelte`
- [ ] `src/routes/checkout/+server.ts`
  - [ ] POST crear `Order` desde `Cart` en transacción:
    - [ ] Verificar stock `Sku.stock`
    - [ ] Descontar stock
    - [ ] Calcular subtotal, `shippingCost`, `discount`, `total`
    - [ ] Crear `Order` + `OrderItem`
    - [ ] Vaciar `CartItem`
  - [ ] POST `/pay` iniciar `Payment` (crea intento y redirige al proveedor)
  - [ ] Relación: `Order`, `OrderItem`, `Sku.stock`, estados `OrderStatus`

### ✅ /checkout/success y ❌ /checkout/failure
- [ ] `src/routes/checkout/success/+page.svelte`
- [ ] `src/routes/checkout/failure/+page.svelte`
- [ ] `src/routes/api/payments/webhook/+server.ts` (endpoint técnico)
  - [ ] Modelo: `Payment` (idempotente por `providerRef @unique`), `Order` (`status` → `PAID`)
  - [ ] Relación: `Payment.status`, `Payment.providerRef @unique`, `Order.status`

## 🏪 Vendedor (Seller)

### 📊 /seller (Dashboard)
- [ ] `src/routes/seller/+page.server.ts`
  - [ ] KPIs: órdenes por estado, ventas del día, top SKUs
- [ ] `src/routes/seller/+page.svelte`
  - [ ] Relación: `Order.storeId`, `OrderItem.lineTotal`, `groupBy` en Prisma

### 🏬 /seller/store
- [ ] `src/routes/seller/store/+page.server.ts`
  - [ ] Modelo: `Store` (por `SellerProfile.userId` = yo)
- [ ] `src/routes/seller/store/+page.svelte`
- [ ] `src/routes/seller/store/+server.ts`
  - [ ] PATCH datos de la tienda
  - [ ] Relación: `Store.sellerId` → `SellerProfile.userId`

### 📦 /seller/products
- [ ] `src/routes/seller/products/+page.server.ts`
  - [ ] Modelos: `Product`, `Sku`, `ProductImage`
  - [ ] Filtro por `store.seller.userId` = yo
- [ ] `src/routes/seller/products/+page.svelte`
  - [ ] Relación: `Store` ↔ `SellerProfile` ↔ `User`

### ➕ /seller/products/new
- [ ] `src/routes/seller/products/new/+page.server.ts`
  - [ ] Carga auxiliares: `Category`, `Brand`
- [ ] `src/routes/seller/products/new/+page.svelte`
- [ ] `src/routes/seller/products/new/+server.ts`
  - [ ] POST crear `Product` + `ProductImage` + `Sku[]`
  - [ ] Relación: `Product.storeId`, `categoryId`, `brandId` (opcional)

### ✏️ /seller/products/[id] (Editar)
- [ ] `src/routes/seller/products/[id]/+page.server.ts`
  - [ ] Incluir `images`, `variations` (SKUs)
- [ ] `src/routes/seller/products/[id]/+page.svelte`
- [ ] `src/routes/seller/products/[id]/+server.ts`
  - [ ] PATCH producto (título, descripción, `active`, atributos)
  - [ ] POST imágenes (crear/borrar)
  - [ ] POST/PATCH/DELETE SKUs (precio, stock, `active`)
  - [ ] Relación: `ProductImage.productId`, `Sku.productId`, `Sku.stock`

### 📦 /seller/inventory
- [ ] `src/routes/seller/inventory/+page.server.ts`
  - [ ] Modelos: `Sku`, `Product`, `Inventory`
- [ ] `src/routes/seller/inventory/+page.svelte`
- [ ] `src/routes/seller/inventory/+server.ts`
  - [ ] PATCH `Inventory` puntual o bulk (importar)
  - [ ] (Opcional) Editar `Sku.stock` directamente
  - [ ] Relación: `Inventory.skuId`, índice `@@index([skuId, location])`

### 📦 /seller/orders
- [ ] `src/routes/seller/orders/+page.server.ts`
  - [ ] Modelos: `Order`, `Payment`, `Shipment`
  - [ ] Filtro `storeId` de la tienda del vendedor
- [ ] `src/routes/seller/orders/+page.svelte`
  - [ ] Relación: `Order.storeId`, `Order.status`, `Payment.status`

### 📦 /seller/orders/[id]
- [ ] `src/routes/seller/orders/[id]/+page.server.ts`
  - [ ] Incluir `OrderItem`, `Shipment`, `Payment`
- [ ] `src/routes/seller/orders/[id]/+page.svelte`
- [ ] `src/routes/seller/orders/[id]/+server.ts`
  - [ ] PATCH avanzar `Order.status` (`PAID` → `READY_TO_SHIP`, etc.)
  - [ ] POST crear `Shipment` (tracking) y actualizar estados
  - [ ] Relación: Estados `OrderStatus`, `ShipStatus`. `Shipment.orderId @unique`

### ❓ /seller/questions
- [ ] `src/routes/seller/questions/+page.server.ts`
  - [ ] Modelos: `Question`, `Product`, `Answer`
  - [ ] Filtro: `Product.storeId` de la tienda del vendedor
- [ ] `src/routes/seller/questions/+page.svelte`
- [ ] `src/routes/seller/questions/+server.ts`
  - [ ] POST responder (`Answer.create`) y marcar `Question.answered = true`
  - [ ] Relación: `Question.productId` → `Product.storeId`; `Answer.questionId`

### 🏷️ /seller/promotions
- [ ] `src/routes/seller/promotions/+page.server.ts`
  - [ ] Modelos: `Promotion`, `PromotionOnSku`, `Sku`, `Product`
- [ ] `src/routes/seller/promotions/+page.svelte`
- [ ] `src/routes/seller/promotions/+server.ts`
  - [ ] POST crear `Promotion`
  - [ ] POST `/attach` y `/detach` con `skuIds[]`
  - [ ] Relación: Tabla puente `PromotionOnSku @@id([skuId, promotionId])`

### 🚚 /seller/shipments
- [ ] `src/routes/seller/shipments/+page.server.ts`
  - [ ] Modelos: `Shipment`, `Order`
  - [ ] Filtro por `order.storeId`
- [ ] `src/routes/seller/shipments/+page.svelte`
- [ ] (Opcional) `src/routes/seller/shipments/+server.ts`
  - [ ] PATCH estado (`IN_TRANSIT`, `DELIVERED`, etc.)
  - [ ] Relación: `Shipment.orderId` → `Order.storeId`

## 👑 Administrador (Admin)

### 📊 /admin (Dashboard)
- [ ] `src/routes/admin/+page.server.ts`
  - [ ] KPIs: usuarios, tiendas, órdenes por estado, devoluciones
- [ ] `src/routes/admin/+page.svelte`
  - [ ] Relación: `User`, `Store`, `Order`, `ReturnRequest`

### 👥 /admin/users
- [ ] `src/routes/admin/users/+page.server.ts`
  - [ ] Modelo: `User` (listado, filtros por `role`)
- [ ] `src/routes/admin/users/+page.svelte`
- [ ] `src/routes/admin/users/+server.ts`
  - [ ] PATCH rol (`role: BUYER|SELLER|ADMIN|SUPPORT`)
  - [ ] (Opcional) Bloqueos/suspensiones
  - [ ] Relación: `User.role`, índice `@@index([role])`

### 🏬 /admin/stores
- [ ] `src/routes/admin/stores/+page.server.ts`
  - [ ] Modelo: `Store`, `SellerProfile`, `User`
- [ ] `src/routes/admin/stores/+page.svelte`
- [ ] `src/routes/admin/stores/+server.ts`
  - [ ] PATCH estado/metadata de tienda
  - [ ] Relación: `Store.sellerId` ↔ `SellerProfile.userId`

### 🏷️ /admin/categories
- [ ] `src/routes/admin/categories/+page.server.ts`
  - [ ] Modelo: `Category` (árbol)
- [ ] `src/routes/admin/categories/+page.svelte`
- [ ] `src/routes/admin/categories/+server.ts`
  - [ ] POST/PATCH/DELETE categoría
  - [ ] Relación: Self-relation `Category.parentId`

### 🏭 /admin/brands
- [ ] `src/routes/admin/brands/+page.server.ts`
  - [ ] Modelo: `Brand`
- [ ] `src/routes/admin/brands/+page.svelte`
- [ ] `src/routes/admin/brands/+server.ts`
  - [ ] POST/PATCH/DELETE marca
  - [ ] Relación: `Brand.slug` único

### 📦 /admin/orders
- [ ] `src/routes/admin/orders/+page.server.ts`
  - [ ] Modelos: `Order`, `Payment`, `Shipment`
  - [ ] Filtros por `status`, `storeId`, rango de fechas
- [ ] `src/routes/admin/orders/+page.svelte`
  - [ ] Relación: Estados de `Order`, `Payment`, `Shipment`

### ⭐ /admin/reviews/moderation
- [ ] `src/routes/admin/reviews/moderation/+page.server.ts`
  - [ ] Modelos: `Review`, `Product`, `User`
  - [ ] Criterios: rating bajo/alto, palabras bloqueadas, reportes
- [ ] `src/routes/admin/reviews/moderation/+page.svelte`
- [ ] `src/routes/admin/reviews/moderation/+server.ts`
  - [ ] PATCH aprobar/rechazar/borrar review
  - [ ] Relación: `Review.rating`, `Review.productId`, `Review.userId`

### 🏷️ /admin/promotions
- [ ] `src/routes/admin/promotions/+page.server.ts`
  - [ ] Modelos: `Promotion`, `PromotionOnSku`, `Sku`, `Product`
- [ ] `src/routes/admin/promotions/+page.svelte`
- [ ] `src/routes/admin/promotions/+server.ts`
  - [ ] CRUD de `Promotion` + attach/detach SKUs (igual que Seller, pero global)
  - [ ] Relación: `Promotion.currencies` (enum array), fechas `startsAt`/`endsAt`

## 📚 Librería compartida

### 🗄️ Base de datos
- [ ] `src/lib/server/db.ts`
  - [ ] Prisma singleton

### 🔐 Autenticación
- [ ] `src/lib/server/auth.ts`
  - [ ] Helpers `requireUser`, `requireRole('SELLER'|'ADMIN')`

### 📊 Paginación
- [ ] `src/lib/server/paging.ts`
  - [ ] `parsePaging(url)` → `{ page, limit, skip }`
  - [ ] `parseSort(url, defaultKey)` → `{ [key]: 'asc'|'desc' }`

### 🧩 Componentes
- [ ] `src/lib/components/`
  - [ ] `ProductCard.svelte`
  - [ ] `Grid.svelte`
  - [ ] `Pagination.svelte`
  - [ ] `Money.svelte`

### ✅ Validadores
- [ ] `src/lib/validators/`
  - [ ] Esquemas Zod para:
    - [ ] Direcciones
    - [ ] Productos
    - [ ] SKUs
    - [ ] Promociones
    - [ ] Órdenes

## 🗺️ Mapa "schema.prisma → rutas"

### 👤 Usuarios y Perfiles
- [ ] `User` / `BuyerProfile` / `SellerProfile` → `/auth/*`, `/account/*`, `/seller/*`, `/admin/users`
- [ ] `Address` (↔ `City`/`State`/`Country`) → `/account/addresses`, checkout (dirección de envío)

### 🏷️ Catálogo
- [ ] `Brand` / `Category` → `/brands`, `/b/[slug]`, `/categories`, `/c/[slug]`, admin CRUD
- [ ] `Store` → `/stores/[slug]`, `/seller/store`, `/seller/*`, `/admin/stores`
- [ ] `Product` / `ProductImage` / `Sku` → `/`, `/search`, `/p/[slug]`, `/seller/products*`, `/admin/brands/categories`
- [ ] `Inventory` → `/seller/inventory` (ajustes, bulk)
- [ ] `Promotion` / `PromotionOnSku` → `/seller/promotions`, `/admin/promotions`

### 🛒 Compras
- [ ] `Cart` / `CartItem` → `/cart`, `/checkout`
- [ ] `Order` / `OrderItem` → `/account/orders*`, `/seller/orders*`, `/admin/orders`
- [ ] `Payment` → `/checkout/*` (webhook), vistas de órdenes
- [ ] `Shipment` → `/account/orders/[id]` (tracking), `/seller/shipments`

### 💬 Interacción
- [ ] `Question` / `Answer` → `/p/[slug]` (preguntas), `/seller/questions`, `/account/questions`
- [ ] `Review` → `/p/[slug]` (reviews), `/account/reviews`, moderación admin
- [ ] `ReturnRequest` → `/account/orders/[id]` (iniciar), `/seller/orders/[id]` (gestionar), `/admin` (reportes)

## 💡 Tips de Implementación

### 🔄 Joins
- [ ] Usar `include`/`select` con `take` en imágenes y SKUs para optimizar consultas

### 🔍 Índices
- [ ] Aprovechar índices en `orderBy`: `updatedAt`, `placedAt`, `status`, `storeId`, `categoryId`, `brandId`

### 💳 Pagos
- [ ] Implementar idempotencia con `Payment.providerRef @unique` en webhook

### 📦 Stock
- [ ] Descontar stock en transacción al crear `Order` (control optimista + recheck)

### 🔒 Seguridad
- [ ] En rutas de vendedor, filtrar siempre por `store.seller.userId = me`
- [ ] Para reviews, validar `Order.status = DELIVERED` y dueño del `OrderItem`
- [ ] Para devoluciones, seguir `ReturnStatus` paso a paso (`REQUESTED` → `APPROVED`/`REJECTED` → `RECEIVED` → `REFUNDED`)