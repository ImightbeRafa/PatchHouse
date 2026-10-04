/**
 * Design preview generator -> design-preview/
 *
 * Takes static snapshots of the real pages (desktop 1280px and mobile 390px) so the design can be
 * reviewed/approved by opening design-preview/index.html, without running anything.
 *
 * Needs the dev server running (npm run dev) and Chrome/Edge. Set CHROME_PATH if it is not found.
 *   node scripts/build-preview.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'design-preview');
const BASE = process.env.PREVIEW_BASE || 'http://localhost:3000';
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find((p) => p && fs.existsSync(p));
if (!CHROME) throw new Error('Chrome/Edge not found. Set CHROME_PATH.');

const SAMPLE_ORDER = 'ORD-1791071433000-2906';
const cart = { 'combo-trio': 1, energy: 1 };
const customer = { nombre: 'María Fernández', telefono: '8888-1234', email: 'maria@correo.com', provincia: 'Heredia', canton: 'Heredia', distrito: 'San Rafael', direccion: '200 m norte de la iglesia, casa blanca con portón negro', comentarios: '' };
const sinpeOrder = {
  method: 'sinpe', success: true, orderId: SAMPLE_ORDER, total: 39800,
  items: [{ key: 'combo-trio', name: 'Combo Trío Bienestar', qty: 1, lineTotal: 26900 }, { key: 'energy', name: 'Energy Patch', qty: 1, lineTotal: 9900 }],
  customer: { nombre: 'María Fernández', email: 'maria@correo.com' },
  sinpe: { phone: '88880000', holder: 'Nombre de ejemplo', amount: 39800, reference: SAMPLE_ORDER }
};
const showOnly = (state) => `document.querySelectorAll('[data-state]').forEach(function(s){s.hidden=s.dataset.state!=='${state}'});var o=document.querySelector('[data-order-id]');if(o)o.textContent='${SAMPLE_ORDER}'`;

/** id, title, description, path, seed (localStorage), act (selectors to click, | separated) or js */
const SCREENS = [
  { id: 'home', title: 'Inicio', desc: 'Hero con los productos a la izquierda y el texto a la derecha, franja de confianza, catálogo de parches, videos, cómo funciona, combos, explicación, ventajas, envíos, preguntas y cierre.', p: '/' },
  { id: 'producto', title: 'Página de producto (parche)', desc: 'Galería (foto real, foto en color, infografía, beneficios…), precio, beneficios, selector de opción/combo, cantidad, botón de compra, microgarantías, ingredientes, videos, reseñas (de ejemplo), preguntas y combos relacionados. En móvil aparece la barra fija de compra al bajar.', p: '/producto/focus-patch/' },
  { id: 'producto-combo-elegido', title: 'Producto: eligiendo un combo', desc: 'En la caja de compra se puede elegir el parche solo o un combo que lo incluye, con el ahorro visible. El precio y los botones Agregar al carrito / Comprar ahora cambian según la opción.', p: '/producto/focus-patch/', act: '.options label:nth-of-type(3) input', crop: 1500 },
  { id: 'producto-infografia', title: 'Producto: infografía en la galería', desc: 'Cada parche tiene su infografía "¿Qué son los parches?" en los colores de su empaque, además de la foto real y la foto en color.', p: '/producto/stress-relief-patch/', act: '.th[data-thumb="2"]', crop: 1300 },
  { id: 'combo', title: 'Página de producto (combo)', desc: 'Mismo formato; la galería muestra qué incluye el combo y cuánto ahorrás.', p: '/producto/combo-trio-bienestar/' },
  { id: 'agotado', title: 'Producto agotado', desc: 'Sin botón de compra: aviso por WhatsApp y otros productos disponibles.', p: '/producto/dopamine-patch/' },
  { id: 'carrito', title: 'Carrito (panel lateral)', desc: 'Se abre al agregar un producto: cantidades editables, sugerencias para completar la rutina (add-ons), ahorro, subtotal y botón a finalizar compra.', p: '/producto/energy-patch/', seed: { ph_cart_v2: cart }, act: '[data-open-cart]', crop: 900 },
  { id: 'checkout-sinpe', title: 'Checkout con SINPE Móvil', desc: 'Datos personales, dirección, método de pago (SINPE seleccionado por defecto) y resumen del pedido. En móvil el resumen va arriba y el botón queda fijo abajo.', p: '/checkout/', seed: { ph_cart_v2: cart, ph_customer: customer } },
  { id: 'checkout-tarjeta', title: 'Checkout con tarjeta', desc: 'Al elegir tarjeta cambia el texto de ayuda y del botón (pasarela segura de Tilopay).', p: '/checkout/', seed: { ph_cart_v2: cart, ph_customer: customer }, act: '.pay-opt[data-method=card] input' },
  { id: 'checkout-errores', title: 'Checkout: validación', desc: 'Errores en línea, resumen del problema y foco en el primer campo incorrecto.', p: '/checkout/', seed: { ph_cart_v2: cart }, act: '[data-submit]' },
  { id: 'pedido-sinpe', title: 'Pedido registrado: instrucciones SINPE', desc: 'Número, monto y detalle con botón copiar, y botón de WhatsApp con el mensaje del comprobante ya escrito. (Número de ejemplo.)', p: `/pedido/?o=${SAMPLE_ORDER}`, seed: { ph_last_order: sinpeOrder } },
  { id: 'pago-ok', title: 'Pago con tarjeta recibido', desc: 'Página de retorno de Tilopay cuando el pago fue aprobado.', p: '/success.html', js: showOnly('success') },
  { id: 'pago-error', title: 'Pago con tarjeta fallido', desc: 'Mensaje tranquilizador (no se cobró) y opciones para reintentar o pedir ayuda.', p: '/error.html?code=0&description=Tarjeta%20rechazada' },
  { id: 'envios', title: 'Envíos y devoluciones', desc: 'Cobertura, costo, tiempos, retiro, pagos, dirección, pedidos dañados y devoluciones.', p: '/envios-y-devoluciones/' },
  { id: 'terminos', title: 'Términos y condiciones', desc: 'Productos, precios, pedidos, pagos, disponibilidad y ley aplicable.', p: '/terminos/' },
  { id: 'privacidad', title: 'Política de privacidad', desc: 'Datos que recopilamos, para qué, con quién se comparten y tus derechos.', p: '/privacidad/' },
  { id: '404', title: 'Página no encontrada (404)', desc: 'Mensaje claro y botón de regreso a la tienda.', p: '/404.html' }
];
const DEVICES = [{ key: 'desktop', w: 1280 }, { key: 'mobile', w: 390 }];

const HARNESS = `<!doctype html><meta charset="utf-8"><body><pre id="out"></pre><script>
(async()=>{
const q=new URLSearchParams(location.search);const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const seed=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(q.get('seed')||'e30='),c=>c.charCodeAt(0))));localStorage.clear();
for(const k in seed)localStorage.setItem(k,JSON.stringify(seed[k]));
const w=+q.get('w')||1280;const f=document.createElement('iframe');
f.style.cssText='width:'+w+'px;height:900px;border:0;position:fixed;left:0;top:0';f.src=q.get('p');document.body.append(f);
await new Promise(r=>f.onload=r);await sleep(2200);
const d=f.contentDocument;
for(const sel of (q.get('act')||'').split('|').filter(Boolean)){const el=d.querySelector(sel);if(el){el.click();await sleep(600);}}
if(q.get('js'))f.contentWindow.eval(atob(q.get('js')));
await sleep(300);
for(const l of [...d.querySelectorAll('link[rel=stylesheet]')]){const u=new URL(l.getAttribute('href'),f.contentWindow.location.href);const css=await(await fetch(u.pathname+'?direct')).text();const st=d.createElement('style');st.textContent=css;l.replaceWith(st);}
d.querySelectorAll('script,link[rel=preload][as=font]').forEach(s=>s.remove());
d.querySelectorAll('input').forEach(i=>{if(i.type==='radio'||i.type==='checkbox'){i.checked?i.setAttribute('checked',''):i.removeAttribute('checked')}else{i.setAttribute('value',i.value)}});
d.querySelectorAll('textarea').forEach(t=>{t.textContent=t.value});
d.querySelectorAll('select').forEach(s=>[...s.options].forEach(o=>{o.selected?o.setAttribute('selected',''):o.removeAttribute('selected')}));
d.querySelectorAll('details').forEach(x=>{x.open?x.setAttribute('open',''):x.removeAttribute('open')});
const h=Math.max(d.documentElement.scrollHeight,d.body.scrollHeight);
const html='<!DOCTYPE html>'+d.documentElement.outerHTML;
const bytes=new TextEncoder().encode(JSON.stringify({h,html}));let bin='';for(let i=0;i<bytes.length;i+=8192)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+8192));
document.getElementById('out').textContent='RESULT:'+btoa(bin)+':END';
})();
</script>`;

const b64 = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64');

function snapshot(screen, device) {
  const params = new URLSearchParams({ p: screen.p, w: String(device.w), seed: b64(screen.seed || {}) });
  if (screen.act) params.set('act', screen.act);
  if (screen.js) params.set('js', b64(screen.js));
  const url = `${BASE}/__preview.html?${params}`;
  const dom = execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', `--window-size=${device.w},900`, '--virtual-time-budget=25000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 120000 });
  const m = dom.match(/RESULT:([A-Za-z0-9+/=]+):END/);
  if (!m) throw new Error(`No snapshot for ${screen.id}/${device.key}`);
  return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'));
}

/** Make a snapshot self-contained: relative assets, inert app links, no dev-server leftovers. */
function localize(html, screenIds) {
  const linkMap = { '/': 'home', '/checkout/': 'checkout-sinpe', '/envios-y-devoluciones/': 'envios', '/terminos/': 'terminos', '/privacidad/': 'privacidad' };
  return html
    .replace(/<style[^>]*data-vite-dev-id[^>]*>[\s\S]*?<\/style>/g, '')
    .replace(/(["'(])\/(images|fonts)\//g, '$1../assets/$2/')
    .replace(/href="(\/[^"]*)"/g, (all, href) => {
      const clean = href.split('#')[0];
      const id = linkMap[clean] || (clean.startsWith('/producto/') ? ({ '/producto/combo-trio-bienestar/': 'combo', '/producto/dopamine-patch/': 'agotado' }[clean] || 'producto') : null);
      return id && screenIds.includes(id) && !href.includes('#') ? `href="${id}-DEV.html"` : 'href="#"';
    });
}

fs.mkdirSync(out, { recursive: true });
// Empty the folder instead of deleting it (Windows keeps it locked while a browser/shell has it open).
for (const entry of fs.readdirSync(out)) fs.rmSync(path.join(out, entry), { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'screens'), { recursive: true });
fs.mkdirSync(path.join(out, 'assets/fonts'), { recursive: true });
fs.cpSync(path.join(root, 'public/fonts'), path.join(out, 'assets/fonts'), { recursive: true });
fs.mkdirSync(path.join(out, 'assets/images'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'public/images'))) if (!f.endsWith('.mp4')) fs.copyFileSync(path.join(root, 'public/images', f), path.join(out, 'assets/images', f));

fs.writeFileSync(path.join(root, 'public/__preview.html'), HARNESS);
const heights = {};
try {
  for (const s of SCREENS) {
    for (const d of DEVICES) {
      process.stdout.write(`  ${s.id} @${d.key} … `);
      const { h, html } = snapshot(s, d);
      heights[`${s.id}-${d.key}`] = h;
      const ids = SCREENS.map((x) => x.id);
      fs.writeFileSync(path.join(out, 'screens', `${s.id}-${d.key}.html`), localize(html, ids).replace(/-DEV\.html/g, `-${d.key}.html`));
      console.log(`${h}px`);
    }
  }
} finally {
  fs.rmSync(path.join(root, 'public/__preview.html'), { force: true });
}


/** Full-page screenshots: plain images work in any browser (no iframes, no scripts). */
fs.mkdirSync(path.join(out, 'img'), { recursive: true });
for (const s of SCREENS) {
  for (const d of DEVICES) {
    const h = Math.min(s.crop || Infinity, heights[`${s.id}-${d.key}`] + 4, 12000);
    const wrap = path.join(out, `_wrap-${s.id}-${d.key}.html`);
    fs.writeFileSync(wrap, `<body style="margin:0;background:#fff"><iframe src="screens/${s.id}-${d.key}.html" style="width:${d.w}px;height:${h}px;border:0;display:block"></iframe>`);
    const png = path.join(out, `_${s.id}-${d.key}.png`);
    try {
      execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${Math.max(d.w, 500)},${h}`, '--virtual-time-budget=12000', `--screenshot=${png}`, 'file:///' + wrap.split(path.sep).join('/')], { stdio: 'ignore', timeout: 120000 });
      await sharp(png).extract({ left: 0, top: 0, width: d.w, height: Math.min(h, (await sharp(png).metadata()).height) }).webp({ quality: 82 }).toFile(path.join(out, 'img', `${s.id}-${d.key}.webp`));
      console.log(`  img ${s.id}-${d.key}`);
    } finally {
      fs.rmSync(wrap, { force: true });
      fs.rmSync(png, { force: true });
    }
  }
}

const card = (s) => `
<section class="screen" id="${s.id}">
  <div class="meta"><span class="n">${SCREENS.indexOf(s) + 1}</span><div><h2>${s.title}</h2><p>${s.desc}</p></div></div>
  <div class="tabs"><button class="on" data-v="desktop">Escritorio</button><button data-v="mobile">Móvil</button></div>
  <div class="shot desktop on"><img src="img/${s.id}-desktop.webp" alt="${s.title} en escritorio" width="1280"></div>
  <div class="shot mobile"><img src="img/${s.id}-mobile.webp" alt="${s.title} en móvil" width="390"></div>
  <p class="open">Versión interactiva: <a href="screens/${s.id}-desktop.html" target="_blank">escritorio</a> · <a href="screens/${s.id}-mobile.html" target="_blank">móvil</a></p>
</section>`;

fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PatchHouse · Vista previa del diseño</title>
<style>
:root{--ink:#1a1a2e;--muted:#666674;--line:#e4e4ea;--bg:#f1f1ee;--green:#2e7d5b}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.5}
header.top{background:var(--ink);color:#fff;padding:24px}header.top h1{margin:0 0 6px;font-size:24px}header.top p{margin:0;color:#cfd0e0;max-width:78ch;font-size:15px}
nav.toc{background:#fff;border-bottom:1px solid var(--line);padding:12px 24px;display:flex;gap:8px;flex-wrap:wrap}
nav.toc a{font-size:13px;color:var(--ink);text-decoration:none;padding:5px 10px;border:1px solid var(--line);border-radius:99px}nav.toc a:hover{background:var(--ink);color:#fff}
main{max-width:1360px;margin:0 auto;padding:20px}
.note{background:#fff7e0;border:1px solid #f0d78a;border-radius:12px;padding:14px 18px;margin-bottom:22px;font-size:14px}
.screen{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px;margin-bottom:28px;scroll-margin-top:12px}
.meta{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px}.n{flex:none;width:34px;height:34px;border-radius:50%;background:var(--green);color:#fff;display:grid;place-items:center;font-weight:800}
.meta h2{margin:0;font-size:20px}.meta p{margin:4px 0 0;color:var(--muted);font-size:14px;max-width:90ch}
.tabs{display:flex;gap:6px;margin-bottom:14px}.tabs button{font:600 14px inherit;font-family:inherit;padding:8px 16px;border-radius:99px;border:1px solid var(--line);background:#fff;cursor:pointer}.tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}
.shot{display:none;border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fafaf8}.shot.on{display:block}
.shot.desktop img{width:100%;height:auto;display:block}
.shot.mobile{max-width:430px;margin-inline:auto;border:10px solid #1b1b2b;border-radius:30px}.shot.mobile img{width:100%;height:auto;display:block}
.open{margin:14px 0 0;font-size:13px;color:var(--muted)}.open a{color:var(--green)}
</style></head><body>
<header class="top"><h1>PatchHouse.CR · Vista previa del diseño</h1><p>Cada pantalla de la tienda como se verá en escritorio y en el celular. Son capturas completas del sitio real: textos, precios, nombres y combos son los de la tienda. Las reseñas, la imagen del GLP-1 y el número de SINPE son de ejemplo.</p></header>
<nav class="toc">${SCREENS.map((s, i) => `<a href="#${s.id}">${i + 1}. ${s.title}</a>`).join('')}</nav>
<main>
<div class="note"><b>Cómo verlo:</b> en cada pantalla elegí <i>Escritorio</i> o <i>Móvil</i>. Son imágenes de la página completa, de arriba hacia abajo.</div>
${SCREENS.map(card).join('')}
</main>
<script>document.querySelectorAll('.screen').forEach(function(sec){var btns=sec.querySelectorAll('.tabs button');btns.forEach(function(b){b.addEventListener('click',function(){btns.forEach(function(x){x.classList.toggle('on',x===b)});sec.querySelectorAll('.shot').forEach(function(s){s.classList.toggle('on',s.classList.contains(b.dataset.v))})})})});</script>
</body></html>`);
console.log(`
Done → ${path.relative(root, path.join(out, 'index.html'))}`);
