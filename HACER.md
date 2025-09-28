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
