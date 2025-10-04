# Documentación del Sistema de E-commerce

## 📋 Visión General

Este documento define los requisitos y estructura del sistema de e-commerce desarrollado con:
- **Frontend**: SvelteKit 2 + Svelte 5
- **Estilos**: Tailwind CSS 4
- **Base de datos**: PostgreSQL con Prisma ORM
- **Infraestructura**: Docker (Redis opcional)
- **Pagos**: Integración con Mercado Pago

---

## 🎯 Objetivos Principales

### Funcionalidades Clave
- [ ] Gestión completa de productos (CRUD)
- [ ] Catálogo público con búsqueda y filtros
- [ ] Carrito de compras y proceso de checkout
- [ ] Integración con Mercado Pago
- [ ] Gestión de inventario y órdenes
- [ ] Panel administrativo
- [ ] Sistema de autenticación y roles
- [ ] Reseñas y valoraciones
- [ ] Sistema de devoluciones y reembolsos

---

## 🔐 Autenticación y Seguridad

### Roles de Usuario
- **Cliente**: Acceso al catálogo, carrito y gestión de su cuenta
- **Vendedor**: Gestión de productos y órdenes de su tienda
- **Admin**: Acceso completo al sistema
- **Operador**: Gestión de órdenes y soporte

### Características de Seguridad
- Autenticación JWT
- Contraseñas encriptadas
- Protección CSRF
- Rate limiting
- Validación de entradas

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


## 🌐 Rutas del Sistema

### 1. Páginas (SvelteKit)

#### Público
- [x] `/` - Inicio / Feed
- [x] `/search` - Buscador con filtros
- [x] `/categories` - Índice de categorías
- [x] `/c/[slug]` - Productos por categoría
- [x] `/brands` - Listado de marcas
- [x] `/b/[slug]` - Productos por marca
- [x] `/p/[slug]` - Ficha de producto
- [x] `/stores/[slug]` - Catálogo por tienda
- [x] `/help` - Preguntas frecuentes
- [x] `/legal` - Términos y políticas

#### Autenticación
- [x] `/auth/login` - Inicio de sesión
- [x] `/auth/register` - Registro
- [x] `/auth/logout` - Cerrar sesión

#### Comprador (Buyer)
- [x] `/account` - Resumen de cuenta
- [x] `/account/profile` - Perfil de usuario
- [x] `/account/addresses` - Mis direcciones
- [x] `/account/favorites` - Productos favoritos
- [x] `/account/orders` - Historial de pedidos
- [x] `/account/orders/[id]` - Detalle de pedido
- [x] `/account/questions` - Mis preguntas
- [x] `/account/reviews` - Mis reseñas

#### Carrito y Pago
- [x] `/cart` - Ver carrito
- [x] `/checkout` - Proceso de pago
- [x] `/checkout/success` - Pago exitoso
- [x] `/checkout/failure` - Error en pago

#### Vendedor (Seller)
- [x] `/seller` - Panel de control
- [x] `/seller/store` - Mi tienda
- [x] `/seller/products` - Mis productos
- [x] `/seller/products/new` - Nuevo producto
- [x] `/seller/products/[id]` - Editar producto
- [x] `/seller/inventory` - Gestión de inventario
- [x] `/seller/orders` - Pedidos de mi tienda
- [x] `/seller/orders/[id]` - Detalle de pedido
- [x] `/seller/questions` - Preguntas de clientes
- [x] `/seller/promotions` - Promociones
- [x] `/seller/shipments` - Envíos

#### Administrador (Admin)
- [x] `/admin` - Panel de administración
- [x] `/admin/users` - Gestión de usuarios
- [x] `/admin/stores` - Gestión de tiendas
- [x] `/admin/categories` - Gestión de categorías
- [x] `/admin/brands` - Gestión de marcas
- [x] `/admin/orders` - Todos los pedidos
- [x] `/admin/reviews/moderation` - Moderación de reseñas
- [x] `/admin/promotions` - Gestión de promociones

### 2. API REST

#### Sistema / Utilidades
- [ ] `GET /api/health` - Verificar estado del servidor
- [ ] `GET /api/me` - Perfil del usuario autenticado

#### Geografía
- [ ] `GET /api/countries` - Lista de países
- [ ] `GET /api/countries/[iso2]` - Detalles de país
- [ ] `GET /api/countries/[iso2]/states` - Estados/Provincias
- [ ] `GET /api/states/[id]/cities` - Ciudades

#### Catálogo
- [ ] `GET /api/categories` - Lista de categorías
- [ ] `GET /api/brands` - Lista de marcas
- [ ] `GET /api/products` - Lista de productos
- [ ] `GET /api/products/[id]` - Detalles de producto
- [ ] `GET /api/search` - Búsqueda de productos

#### Carrito y Órdenes
- [ ] `GET /api/cart` - Ver carrito
- [ ] `POST /api/orders` - Crear orden
- [ ] `GET /api/orders` - Historial de órdenes
- [ ] `GET /api/orders/[id]` - Detalle de orden

#### Pagos y Envíos
- [ ] `POST /api/payments` - Procesar pago
- [ ] `POST /api/payments/webhook` - Webhook de pagos
- [ ] `GET /api/shipments/[id]` - Seguimiento de envío

### 3. Convenciones

#### Parámetros de Consulta
- `page`: Número de página (por defecto: 1)
- `limit`: Resultados por página (máx. 60)
- `sort`: Ordenamiento (ej: `price:asc`, `createdAt:desc`)

#### Filtros Comunes
- `q`: Término de búsqueda
- `category`: Filtrar por categoría
- `brand`: Filtrar por marca
- `priceMin`/`priceMax`: Rango de precios
- `status`: Estado (para órdenes, envíos, etc.)

#### Seguridad
- Autenticación requerida para rutas protegidas
- Validación de roles (BUYER, SELLER, ADMIN)
- Verificación de propiedad en recursos sensibles
- Webhooks con verificación de firma

#### Formato de Respuesta
```json
{
  "data": [],
  "page": 1,
  "limit": 20,
  "total": 100
}
```

## 🔍 Detalles de Implementación

1) Páginas (SvelteKit)
Público (sin login)

/ — Home / feed

/search — Buscador (q, category, brand, priceMin/Max, sort)

/categories — Índice de categorías (root + children)

/c/[slug] — Grid por categoría

/brands — Índice de marcas

/b/[slug] — Grid por marca

/p/[slug] — Ficha de producto: imágenes, SKUs, P&R, reviews

/stores/[slug] — Catálogo por tienda

/help — Ayuda / FAQs

/legal — Términos y políticas

Autenticación

/auth/login

/auth/register

/auth/logout

Buyer (cuenta)

/account — Resumen

/account/profile

/account/addresses

/account/favorites

/account/orders

/account/orders/[id] — Detalle + tracking

/account/questions — Mis preguntas

/account/reviews — Mis reseñas

Cart & Checkout

/cart

/checkout

/checkout/success

/checkout/failure

Seller (panel)

/seller — Dashboard

/seller/store

/seller/products

/seller/products/new

/seller/products/[id]

/seller/inventory

/seller/orders

/seller/orders/[id]

/seller/questions

/seller/promotions

/seller/shipments

Admin (opcional)

/admin — Dashboard

/admin/users

/admin/stores

/admin/categories

/admin/brands

/admin/orders

/admin/reviews/moderation

/admin/promotions

2) API REST (endpoints /api/...)

Convención: JSON, estado HTTP estándar, auth por rol (BUYER/SELLER/ADMIN).
Paginación: ?page=1&limit=20 · Orden: ?sort=campo:asc|desc.

Sistema / Utilidades

GET /api/health — Ping DB (público)

GET /api/me — Perfil autenticado (BUYER/SELLER/ADMIN)

Geo (Country/State/City)

GET /api/countries — Lista (con ?withStates=1 opcional)

GET /api/countries/[iso2]

GET /api/countries/[iso2]/states

GET /api/states/[id]/cities

Catálogo: Categorías / Marcas

GET /api/categories — Árbol o flat (?flat=1)

GET /api/categories/[slug]

POST /api/categories — ADMIN

PATCH /api/categories/[id] — ADMIN

DELETE /api/categories/[id] — ADMIN

GET /api/brands

GET /api/brands/[slug]

POST /api/brands — ADMIN

PATCH /api/brands/[id] — ADMIN

DELETE /api/brands/[id] — ADMIN

Tiendas (Store)

GET /api/stores — Público (básico)

GET /api/stores/[id|slug] — Público

POST /api/stores — SELLER (crear 1 tienda para su SellerProfile)

PATCH /api/stores/[id] — SELLER (owner)

GET /api/stores/[id]/products — Público (catálogo por tienda)

Productos (Product) + Imágenes

GET /api/products — Público (filtros: storeId, categoryId, brandId, active)

GET /api/products/[id] — Público (o /api/products/by-slug/[slug])

POST /api/products — SELLER (owner de la tienda)

PATCH /api/products/[id] — SELLER (owner)

DELETE /api/products/[id] — SELLER/ADMIN

GET /api/products/[id]/images — Público

POST /api/products/[id]/images — SELLER

DELETE /api/products/[id]/images/[imageId] — SELLER

SKUs (Sku) e Inventario

GET /api/products/[id]/skus — Público (ver variantes)

POST /api/products/[id]/skus — SELLER

PATCH /api/skus/[skuId] — SELLER

DELETE /api/skus/[skuId] — SELLER

GET /api/inventory?skuId=... — SELLER (owner)

PATCH /api/inventory/[id] — SELLER (ajuste stock)

POST /api/inventory/bulk — SELLER (import masivo)

Promociones

GET /api/promotions — Público (si corresponde)

GET /api/promotions/[id] — Público

POST /api/promotions — SELLER/ADMIN

PATCH /api/promotions/[id] — SELLER/ADMIN

DELETE /api/promotions/[id] — SELLER/ADMIN

POST /api/promotions/[id]/attach — SELLER/ADMIN (body: skuIds[])

POST /api/promotions/[id]/detach — SELLER/ADMIN (body: skuIds[])

Search (combinado catálogo)

GET /api/search — Público
Parámetros: q, category, brand, priceMin, priceMax, sort, page, limit.

Preguntas & Respuestas (Question/Answer)

GET /api/products/[id]/questions — Público (últimas)

POST /api/products/[id]/questions — BUYER (crea pregunta)

GET /api/seller/questions — SELLER (inbox propio)

POST /api/questions/[qid]/answer — SELLER (responder; crea Answer)

(Opcional) DELETE /api/questions/[qid] — ADMIN/SELLER(owner)

Reviews

GET /api/products/[id]/reviews — Público

POST /api/order-items/[orderItemId]/review — BUYER (1:1 con OrderItem)

GET /api/account/reviews — BUYER

DELETE /api/reviews/[id] — ADMIN (moderación)

Favoritos

GET /api/favorites — BUYER

POST /api/favorites — BUYER (body: { productId })

DELETE /api/favorites/[productId] — BUYER

Direcciones (Address)

GET /api/addresses — BUYER

POST /api/addresses — BUYER

PATCH /api/addresses/[id] — BUYER (owner)

DELETE /api/addresses/[id] — BUYER

POST /api/addresses/[id]/make-default?type=SHIPPING|BILLING — BUYER

Cart

GET /api/cart — BUYER (o guest por cookie)

POST /api/cart/items — BUYER/GUEST { skuId, qty, priceAt? }

PATCH /api/cart/items/[id] — BUYER/GUEST { qty }

DELETE /api/cart/items/[id] — BUYER/GUEST

POST /api/cart/merge — BUYER (fusiona guest→user)

Orders

GET /api/orders — BUYER (mías) / SELLER (?storeId=...) / ADMIN

POST /api/orders — BUYER (crea desde cart)

GET /api/orders/[id] — BUYER/SELLER(owner)/ADMIN

PATCH /api/orders/[id] — SELLER/ADMIN (estado y campos operativos)

POST /api/orders/[id]/cancel — BUYER/SELLER/ADMIN (según política)

Payments

GET /api/orders/[id]/payments — BUYER/SELLER(owner)/ADMIN

POST /api/orders/[id]/payments — BUYER (inicia transacción)

POST /api/payments/webhook — Público (verifica firma; idempotente por providerRef)

GET /api/payments/[id] — BUYER/SELLER(owner)/ADMIN

Shipments

GET /api/orders/[id]/shipment — BUYER/SELLER(owner)/ADMIN

POST /api/orders/[id]/shipment — SELLER (crear etiqueta / tracking)

PATCH /api/shipments/[id] — SELLER (actualizar estado/tracking)

GET /api/shipments/[id] — BUYER/SELLER(owner)/ADMIN

Returns (ReturnRequest)

POST /api/order-items/[id]/returns — BUYER

GET /api/returns — BUYER (mías) / SELLER (por storeId) / ADMIN

GET /api/returns/[id] — BUYER/SELLER(owner)/ADMIN

PATCH /api/returns/[id] — SELLER/ADMIN (transiciones: APPROVED/REJECTED/RECEIVED/REFUNDED)

Users (perfil mínimo)

GET /api/users/me — BUYER/SELLER/ADMIN

PATCH /api/users/me — BUYER/SELLER/ADMIN (perfil: phone, nombres, doc)

Admin (moderación / gestión)

GET /api/admin/users — ADMIN

PATCH /api/admin/users/[id] — ADMIN

GET /api/admin/stores — ADMIN

PATCH /api/admin/stores/[id] — ADMIN

GET /api/admin/orders — ADMIN

GET /api/admin/promotions — ADMIN

PATCH /api/admin/promotions/[id] — ADMIN

GET /api/admin/reviews/pending — ADMIN

PATCH /api/admin/reviews/[id] — ADMIN (approve/reject)

3) Convenciones y notas de implementación
Query params estándar

Paginación: page, limit (máx. 60 recomendado)

Orden: sort=campo:asc|desc (usa campos indexados: updatedAt, placedAt, status, etc.)

Filtros comunes:

Productos: q, category, brand, storeId, active

Precio (vía SKUs): priceMin, priceMax

Órdenes: status, storeId, placedAt[from|to]

Respuesta paginada (sugerida)
{
  "data": [...],
  "page": 1,
  "limit": 20,
  "total": 123
}

Roles (resumen rápido)

Público: read-only de catálogo, search, brands, categories, stores, products.

BUYER: addresses, favorites, cart, orders propios, returns propios, reviews propios.

SELLER: stores propias, products/sku/inventory/promotions de su store, orders/shipments de su store, respuestas a preguntas.

ADMIN: todo lo anterior + gestión global (users, brands, categories, moderación).

Seguridad

Guards por rol en cada endpoint.

Ownership checks:

Seller: filtrar por store.seller.userId = session.user.id.

Buyer: filtrar por buyerId = session.user.id (orders) o userId (addresses/favorites).

Webhook payments: idempotencia por providerRef @unique.


1) Preparación mínima (sin cambiar el schema)

Variables

DATABASE_URL=postgresql://gustavo:12345678@localhost:5479/tincho

Comandos base

npx prisma validate
npx prisma generate          # genera el client a partir del schema existente
# Si la BD está vacía, inicializá con tu SQL/seed (no cambia el schema)


Client singleton

// src/lib/server/db.ts
import { PrismaClient } from '@prisma/client';
const g = globalThis as any;
export const prisma: PrismaClient = g.prisma ?? new PrismaClient({ log: ['warn','error'] });
if (process.env.NODE_ENV !== 'production') g.prisma = prisma;

1) Catálogo público (lecturas seguras)
1.1 Listar productos (home/feed)
await prisma.product.findMany({
  where: { active: true },
  include: { images: { take: 1 }, variations: { take: 1 } },
  orderBy: { updatedAt: 'desc' },
  skip, take: limit
});

1.2 Búsqueda con filtros (q / categoría / marca / precio)
const where: any = {
  active: true,
  ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
  ...(categorySlug ? { category: { slug: categorySlug } } : {}),
  ...(brandSlug ? { brand: { slug: brandSlug } } : {}),
};
const products = await prisma.product.findMany({
  where,
  include: {
    images: { take: 1 },
    variations: {
      where: {
        ...(priceMin ? { priceAmount: { gte: priceMin } } : {}),
        ...(priceMax ? { priceAmount: { lte: priceMax } } : {}),
      },
      take: 1
    }
  },
  orderBy: { updatedAt: 'desc' },
  skip, take: limit
});

1.3 Ficha de producto
await prisma.product.findUnique({
  where: { slug },
  include: {
    images: true,
    store: { select: { id: true, name: true, slug: true } },
    brand: { select: { name: true, slug: true } },
    category: { select: { name: true, slug: true } },
    variations: true,
    questions: {
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { user: { select: { firstName: true, lastName: true } }, answer: true }
    },
    reviews: {
      orderBy: { createdAt: 'desc' }, take: 5,
      include: { user: { select: { firstName: true, lastName: true } } }
    }
  }
});

2) Alta de catálogo para Seller (sin tocar schema)

Regla: el seller sólo puede operar sobre su storeId.

2.1 Crear producto
await prisma.product.create({
  data: {
    storeId, categoryId, brandId, title, slug, description, condition: 'NEW',
    images: { create: images.map((i) => ({ url: i.url, alt: i.alt })) },
    variations: {
      create: skus.map(v => ({
        code: v.code ?? null,
        variantValues: v.variantValues ?? null,
        priceAmount: v.priceAmount,
        priceCurrency: v.priceCurrency, // enum CurrencyCode
        listPrice: v.listPrice ?? null,
        stock: v.stock ?? 0,
        gtin: v.gtin ?? null
      }))
    }
  }
});

2.2 Editar stock (una variante/SKU)
await prisma.sku.update({
  where: { id: skuId },
  data: { stock }                // stock entero
});

2.3 Adjuntar promoción a SKUs
// Crear promo
const promo = await prisma.promotion.create({
  data: { name, startsAt, endsAt, percentOff, amountOff, currencies, active: true }
});
// Vincular a N SKUs (tabla puente con PK compuesta)
await prisma.promotionOnSku.createMany({
  data: skuIds.map((skuId: string) => ({ skuId, promotionId: promo.id })),
  skipDuplicates: true
});

3) Carrito → Orden → Pago → Envío (flujos atómicos)
3.1 Carrito (buyer o guest vinculado luego)

Agregar item (precio “congelado” en CartItem.priceAt):

// upsert por cartId+skuId (tiene @@unique)
await prisma.cartItem.upsert({
  where: { cartId_skuId: { cartId, skuId } },
  update: { qty: { increment: qty } },
  create: { cartId, skuId, qty, priceAt }
});


Merge guest→user (cuando el usuario inicia sesión): leer carrito guest, re-insertar en el del user y borrar el guest.

3.2 Crear Orden (transacción & control de stock)

Objetivo: evitar sobreventa y mantener totales consistentes.
Política sin modificar schema: validar y descontar stock por SKU al crear la orden.

await prisma.$transaction(async (tx) => {
  // 1) Leer carrito del user
  const cart = await tx.cart.findUnique({
    where: { id: cartId },
    include: { items: { include: { sku: true, product: true } } }
  });
  if (!cart || cart.items.length === 0) throw new Error('Carrito vacío');

  // 2) Chequear stock por cada SKU (optimista)
  for (const it of cart.items) {
    if (it.qty > it.sku.stock) throw new Error(`Sin stock SKU ${it.sku.id}`);
  }

  // 3) Descontar stock (con verificación)
  for (const it of cart.items) {
    await tx.sku.update({
      where: { id: it.skuId },
      data: { stock: { decrement: it.qty } }
    });
  }

  // 4) Calcular totales
  const subtotal = cart.items.reduce((s, it) => s + Number(it.priceAt) * it.qty, 0);
  const shippingCost = 0; // calcular según negocio
  const discount = 0;     // promos ya reflejadas en priceAt o aplicar lógica adicional
  const total = subtotal + shippingCost - discount;

  // 5) Crear orden + items
  const nextNumber = Date.now() % 1e9; // ejemplo; en serio, vendría de tu lógica por store
  const order = await tx.order.create({
    data: {
      buyerId: userId,
      storeId,
      number: nextNumber,
      status: 'PENDING',
      currency: cart.currency,
      subtotal, discount, shippingCost, total,
      items: {
        create: cart.items.map((it) => ({
          skuId: it.skuId,
          productId: it.sku.productId,
          title: it.product.title,
          variant: it.sku.variantValues,
          qty: it.qty,
          unitPrice: it.priceAt,
          lineTotal: Number(it.priceAt) * it.qty
        }))
      }
    }
  });

  // 6) Vaciar carrito
  await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

  return order;
});


Nota de concurrencia: este patrón es optimista. Para escenarios de altísima concurrencia podés:

Añadir un “re-check” del stock con condición (update con where: { id, stock: { gte: qty } } vía updateMany y verificar count).

O bloquear filas con SQL crudo FOR UPDATE usando tx.$queryRaw, sin tocar el schema.

3.3 Pago (idempotencia con providerRef único)

Iniciar pago: creás el intento y enviás al proveedor.

Webhook: no crees pagos duplicados; usá providerRef @unique.

// En webhook (confirmación de proveedor)
await prisma.$transaction(async (tx) => {
  // 1) Upsert del payment por providerRef (idempotente)
  const payment = await tx.payment.upsert({
    where: { providerRef: payload.id }, // único
    update: {
      status: payload.approved ? 'PAID' : 'REJECTED',
      paidAt: payload.approved ? new Date() : null,
      rawPayload: payload
    },
    create: {
      orderId, provider: 'mercadopago', providerRef: payload.id,
      status: payload.approved ? 'PAID' : 'REJECTED',
      currency, amount, paidAt: payload.approved ? new Date() : null,
      rawPayload: payload
    }
  });

  // 2) Si quedó PAID, opcional: setear Order.status = PAID (si todos los pagos cubren total)
  if (payment.status === 'PAID') {
    await tx.order.update({
      where: { id: orderId },
      data: { status: 'PAID' }
    });
  }
});

3.4 Envío (1:1 con Orden, orderId @unique)
// Crear etiqueta / asignar carrier
await prisma.shipment.create({
  data: {
    orderId,
    status: 'LABEL_CREATED',
    carrier, trackingCode,
    fromAddressId, toAddressId
  }
});

// Actualizar tracking/estado
await prisma.shipment.update({
  where: { orderId },
  data: { status: 'IN_TRANSIT', shippedAt: new Date() }
});

4) Interacción: P&R, Reviews, Devoluciones
4.1 Preguntas & Respuestas
// Buyer pregunta
await prisma.question.create({
  data: {
    productId, userId, content, channel: 'WEB'
  }
});

// Seller responde (1:1 con Question)
await prisma.answer.create({
  data: { questionId, userId: sellerUserId, content }
});

// Flag answered
await prisma.question.update({ where: { id: questionId }, data: { answered: true } });

4.2 Reviews (1 review por OrderItem)

Validar que el OrderItem pertenezca al buyer y que la orden esté DELIVERED antes de permitir review.

const oi = await prisma.orderItem.findFirst({
  where: { id: orderItemId, order: { buyerId: userId, status: 'DELIVERED' } },
  select: { id: true, productId: true }
});
if (!oi) throw new Error('No autorizado para reseñar este item');

await prisma.review.create({
  data: { orderItemId, userId, productId: oi.productId, rating, title, comment }
});

4.3 Devoluciones

Transiciones de ReturnStatus: REQUESTED → (APPROVED|REJECTED) → RECEIVED → REFUNDED.

// Buyer solicita
await prisma.returnRequest.create({
  data: { orderItemId, status: 'REQUESTED', reason }
});

// Seller aprueba/rechaza
await prisma.returnRequest.update({
  where: { id },
  data: { status: 'APPROVED', approvedBy: sellerUserId }
});

// Recepción y reembolso (coordinado con Payment REFUNDED)
await prisma.$transaction(async (tx) => {
  await tx.returnRequest.update({ where: { id }, data: { status: 'RECEIVED' } });
  // lógica de stock si corresponde (sumar stock del SKU)
  await tx.payment.create({
    data: { orderId, provider, providerRef, status: 'REFUNDED', currency, amount }
  });
  await tx.returnRequest.update({ where: { id }, data: { status: 'REFUNDED' } });
});

5) Cuenta Buyer: direcciones y favoritos
5.1 Direcciones (máximo 1 default por tipo)
// Crear
await prisma.address.create({
  data: { userId, type: 'SHIPPING', street, number, zipcode, cityId, isDefault }
});

// Setear como default (desmarcar otras del user & tipo)
await prisma.$transaction(async (tx) => {
  await tx.address.updateMany({ where: { userId, type: 'SHIPPING' }, data: { isDefault: false } });
  await tx.address.update({ where: { id: addrId }, data: { isDefault: true } });
});

5.2 Favoritos (PK compuesta evita duplicados)
// Agregar
await prisma.favorite.create({ data: { userId, productId } });
// Quitar
await prisma.favorite.delete({ where: { userId_productId: { userId, productId } } });

6) Panel Seller: control por storeId

Todas las consultas/updates deben filtrar por la store del seller para no “ver” contenido ajeno.

await prisma.product.findMany({ where: { store: { seller: { userId: sellerUserId } } } });

7) Seguridad, consistencia e idempotencia (sin tocar schema)

Roles/ownership en queries (where anidado)

Buyer sólo ve/edita lo suyo (addresses, favorites, orders).

Seller sólo su storeId y sus products/orders/shipments.

Idempotencia con providerRef @unique en Payment para webhooks.

Concurrencia

Transacciones con $transaction.

Descuento de stock en orden de compra (ver patrón de re-check).

Si necesitás bloqueo fuerte: tx.$queryRaw con SELECT ... FOR UPDATE (sin cambiar schema).

Estados

Transiciones coherentes (no pases OrderStatus hacia atrás).

Shipment 1:1 con Order (enforced por orderId @unique).

Validaciones (capa app)

qty > 0, priceAmount >= 0, enums válidos, slug únicos (ya enforced).

8) Consultas frecuentes para analítica/UX
8.1 Top productos por ventas (conteo de OrderItem)
await prisma.orderItem.groupBy({
  by: ['productId'],
  _sum: { lineTotal: true },
  _count: { _all: true },
  orderBy: [{ _sum: { lineTotal: 'desc' } }],
  take: 10
});

8.2 Rating promedio por producto (si necesitás recalcular)
await prisma.review.groupBy({
  by: ['productId'],
  _avg: { rating: true },
  orderBy: [{ _avg: { rating: 'desc' } }],
  take: 10
});

8.3 Órdenes por estado (para dashboard)
await prisma.order.groupBy({
  by: ['status'],
  _count: { _all: true }
});

9) Paginación, orden y proyección eficiente

Paginación: skip/take + count (o cursor si querés estabilidad).

Orden: usá campos indexados (ya tenemos varios @@index).

Select/Include: pedí solo lo necesario (reduce payload y TTFB).

Ejemplo:

await prisma.product.findMany({
  where: { active: true },
  select: { id: true, title: true, slug: true, images: { select: { url: true }, take: 1 } },
  orderBy: { updatedAt: 'desc' },
  skip, take: limit
});

10) Backups y migraciones (sin cambiar el schema)

Backups Postgres: pg_dump programado (full + dif).

Restores: pg_restore a staging antes de prod.

Migrations: como no vamos a modificar el schema, no generes nuevas. Si necesitás índices extra para performance, podés crearlos a nivel SQL (no en el schema) para no “tocar” schema.prisma. Ej.:

-- (Opcional) índice funcional en título para búsquedas insensibles (si Postgres lo soporta)
CREATE INDEX IF NOT EXISTS idx_product_title_ci ON "Product" (LOWER(title));


Esto no altera el schema de Prisma, pero sí cambia la BD. Si querés evitar incluso eso, quedate con los índices ya definidos.

11) Checklist por flujo (para QA)

Alta producto: crea Product + al menos 1 Sku + 1 imagen → aparece en / y /search.

Carrito: agrega ítems, upsert por SKU; total calculado correctamente.

Orden: stock decrementa, Order.items creados con unitPrice/lineTotal.

Pago: webhook idempotente, Payment único por providerRef, Order.status a PAID.

Envío: Shipment creado (orderId único); transición a DELIVERED.

Review: sólo si Order.status = DELIVERED y por OrderItem del buyer.

Return: transiciones válidas y coherentes con Payment REFUNDED.

Cierre

Con esto podés operar 100% sobre la base actual: lectura de catálogo, alta de productos/SKUs, carrito→checkout transaccional, pagos idempotentes, envíos, P&R, reviews y devoluciones; todo sin tocar el schema.prisma.