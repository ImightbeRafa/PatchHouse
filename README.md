# PatchHouse.CR

Tienda online de parches transdérmicos para Costa Rica. Multi-página (home, página por producto, carrito, checkout), vanilla JS + Vite, funciones serverless en Vercel.

## Comandos

```bash
npm install
npm run dev      # genera las páginas + servidor local con la API en modo sandbox (ORDER_DRY_RUN=true)
npm run build    # genera las páginas y construye dist/
npm test         # precios, validación, firma de pedidos y handlers de la API
npm run images   # (manual) regenera imágenes/videos web desde assets-src/  (requiere ffmpeg para video)
npm run visuals  # (manual) fotos en color, combos, hero, infografías y banners (requiere Chrome/Edge)
```

`npm run dev` **nunca** envía correos, escribe en el CRM, dispara eventos de Meta ni llama a Tilopay: el pago con tarjeta redirige a una página de éxito local y SINPE registra el pedido en memoria. Para probar SINPE localmente creá un `.env.local` con `SINPE_PHONE` y `SINPE_HOLDER`.

## Estructura

```
shared/catalog.js      Productos, combos, precios, packs, stock. ÚNICA fuente de verdad (web + API + generador)
shared/validate.js     Validación del checkout (navegador y servidor)
scripts/build-pages.js Genera todo el HTML desde src/templates (los .html generados están en .gitignore)
src/templates/         layout (header/footer/drawer) + páginas: home, producto, checkout, pedido, políticas
src/js/                core.js (carrito, drawer, videos) + un entry por página
src/styles/            site.css (sistema de diseño) + pdp.css + checkout.css
api/                   Funciones Vercel: config, sinpe/create-order, tilopay/{create-payment,confirm,webhook}
api/_lib/              Helpers (no son funciones): pedidos, firma, emails, Betsy, Meta
assets-src/            Imágenes y videos originales (no se publican)
public/                Imágenes optimizadas, fuente, videos
tests/                 node:test
```

Para **editar un producto, precio, combo o FAQ** tocá `shared/catalog.js` y corré `npm run dev`/`build`. El header y footer están en `src/templates/layout.js`.

## Pagos

| Método | Flujo |
|---|---|
| **SINPE Móvil** | `POST /api/sinpe/create-order` registra el pedido como PENDIENTE (CRM + correo al admin + correo al cliente con instrucciones + evento Lead). El cliente ve `/pedido/` con número, monto y detalle; envía el comprobante por WhatsApp. **Despachás cuando verificás el depósito.** |
| **Tarjeta (Tilopay)** | `POST /api/tilopay/create-payment` firma el pedido (HMAC) y devuelve la URL de pago. Al volver a `/success.html` se verifica el `OrderHash` de Tilopay (HMAC con la contraseña del API, igual que el plugin oficial): si es válido el pedido se procesa al instante; si no, lo procesa el webhook firmado (`/api/tilopay/webhook`). |

`GET /api/config` indica qué métodos están disponibles: SINPE aparece solo si `SINPE_PHONE` y `SINPE_HOLDER` están configurados.

## Reglas de precio

- Parches a ₡9.900 c/u; descuentos solo en combos (`shared/catalog.js`).
- **Envío gratis desde ₡25.000** de subtotal (`FREE_SHIPPING_FROM`); si no, ₡3.000. El servidor usa la misma regla.

## Despliegue (Vercel)

1. Variables de entorno: ver `.env.example` (nuevas: `SINPE_PHONE`, `SINPE_HOLDER`; opcionales: `ORDER_SIGNING_SECRET`, `TILOPAY_REDIRECT_FULFILL`).
2. Confirmá que el webhook de Tilopay apunta a `https://patchhouse.shopping/api/tilopay/webhook` y que `TILOPAY_WEBHOOK_SECRET` coincide.
3. Cambiar stock (`VITE_SOLD_OUT`) requiere un nuevo deploy: se lee al construir las páginas.

## Reseñas reales

La plantilla de producto soporta reseñas, estrellas y `AggregateRating` (SEO) pero **no hay ninguna cargada**: agregalas en `REVIEWS` dentro de `shared/catalog.js` cuando existan reseñas reales. No inventar números.
