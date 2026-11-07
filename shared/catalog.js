/**
 * PatchHouse catalog + pricing. SINGLE SOURCE OF TRUTH.
 *
 * Imported by the page generator (build time), the storefront JS (browser) and the
 * serverless API (Node). It must stay free of DOM, Node and import.meta APIs: runtime
 * settings (sold-out lists, price overrides) are passed in through buildCatalog(config).
 *
 * The server always re-prices orders from this file; the browser's numbers are display only.
 */

export const SHIPPING_COST = 3000;
/** Orders with a subtotal at or above this ship free (approved by the owner, Oct 2026). */
export const FREE_SHIPPING_FROM = 25000;
/** Shipping for a given subtotal (0 for an empty cart). */
export const shippingFor = (subtotal) => (subtotal <= 0 ? 0 : subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST);

/** ₡ with dot thousands separators (locale-independent, so server and browser always agree). */
export const formatCRC = (n) => `₡${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
export const SINGLE_PRICE = 9900;
export const MAX_QTY_PER_LINE = 10;

/** Full House price by number of patches included (existing business rule). */
export const FULL_HOUSE_PRICE_BY_COUNT = { 2: 17900, 3: 26900, 4: 35900, 5: 44900, 6: 49900 };

export const SITE = {
  name: 'PatchHouse.CR',
  url: 'https://www.patchhouse.shopping',
  whatsapp: '50670526254',
  whatsappDisplay: '7052-6254',
  instagram: 'https://www.instagram.com/patchhouse.cr/',
  email: 'orders@patchhouse.shopping',
  pixelId: '2330584627352047',
  deliveryDays: '2 a 5 días hábiles',
  pickup: 'San Rafael y zonas cercanas'
};

/** Patch order is also the display order. */
export const PATCH_ORDER = ['focus', 'energy', 'glp1', 'sleep', 'stress', 'dopamine', 'nad'];

/** Bloom (skin): not a 30-day patch, own price ladder (approved by the owner, Nov 2026). */
export const BLOOM_PRICE = 4500;
export const BLOOM_PAIR_PRICE = 8000;
/** Every pair of Bloom packs is ₡8.000 and an odd pack ₡4.500 (1 → 4.500, 2 → 8.000, 3 → 12.500…). */
export const bloomPrice = (qty) => {
  const n = Math.max(0, Math.floor(qty));
  return Math.floor(n / 2) * BLOOM_PAIR_PRICE + (n % 2) * BLOOM_PRICE;
};

const COMMON_USAGE = [
  { title: 'Elegí tu fórmula', text: 'Seleccioná según lo que necesitás: enfoque, energía, metabolismo, mood o calma.' },
  { title: 'Pegalo en tu piel', text: 'Aplicá en zona limpia y seca (brazo, hombro o espalda). Cómodo y discreto.' },
  { title: 'Disfrutá tu rutina', text: 'Los ingredientes se liberan de forma gradual durante el día. Sin pastillas.' }
];

/**
 * Copy rules (Costa Rica, supplements): describe what the product is "formulado para" / "pensado para",
 * what ingredients are, and only nutrient claims that are widely accepted (e.g. B vitamins and the normal
 * functioning of the nervous system; chromium and normal macronutrient metabolism). Never promise to treat,
 * cure, prevent or reduce a condition, never promise weight loss, and never imply the product is a drug.
 */
export const PATCHES = {
  focus: {
    key: 'focus', slug: 'focus-patch', name: 'Focus Patch', short: 'Focus', image: 'focus', accent: '#7b3f98',
    badge: 'Popular',
    tagline: 'Apoyo para tu enfoque y claridad mental',
    result: 'Acompañá tus horas de estudio, trabajo o creatividad con una fórmula pensada para apoyar tu concentración.',
    bullets: [
      ['Vitamina B, NAC, Melena de León y Ginseng Rojo', 'ingredientes usados en rutinas de enfoque'],
      ['Liberación gradual sobre la piel', 'pensado para acompañarte durante el día'],
      ['Sin pastillas', 'una rutina simple de un parche al día']
    ],
    ingredients: [
      ['Vitamina B', 'Vitaminas que contribuyen al funcionamiento normal del sistema nervioso'],
      ['NAC', 'Aminoácido con acción antioxidante'],
      ['Melena de León', 'Hongo tradicionalmente usado para apoyar la memoria y el enfoque'],
      ['Ginseng Rojo', 'Planta tradicionalmente usada para apoyar la energía y la concentración']
    ],
    benefits: [
      'Formulado para apoyar la concentración y el enfoque',
      'Pensado para acompañar la claridad mental durante el día',
      'Sin pastillas: se aplica sobre la piel',
      'Ideal para estudio, trabajo o creatividad'
    ]
  },
  nad: {
    key: 'nad', slug: 'nad-patch', name: 'NAD+ Patch', short: 'NAD+', image: 'nad', accent: '#6aae3d',
    badge: '',
    tagline: 'Apoyo para tu energía y bienestar celular',
    result: 'Una rutina diaria de un parche para acompañar tu vitalidad.',
    bullets: [
      ['NMN, precursor de NAD+', 'molécula que participa en la energía de tus células'],
      ['Resveratrol y NAC', 'antioxidantes que ayudan a proteger las células del estrés oxidativo'],
      ['Un parche al día', 'rutina simple, sin pastillas']
    ],
    ingredients: [
      ['NMN', 'Precursor de NAD+, molécula presente de forma natural en tus células'],
      ['Resveratrol', 'Antioxidante de origen vegetal'],
      ['NAC', 'Aminoácido con acción antioxidante']
    ],
    benefits: [
      'Formulado para apoyar la energía a nivel celular',
      'Con antioxidantes que ayudan a proteger las células del estrés oxidativo',
      'Pensado para acompañar tu vitalidad diaria',
      'Un parche al día, sin pastillas'
    ]
  },
  energy: {
    key: 'energy', slug: 'energy-patch', name: 'Energy Patch', short: 'Energy', image: 'energy', accent: '#ecc914',
    badge: 'Nuevo',
    tagline: 'Energía y enfoque con liberación gradual',
    result: 'Un impulso de energía para trabajar, estudiar o entrenar, con liberación gradual durante el día.',
    bullets: [
      ['Cafeína 12.5 mg', 'favorece el estado de alerta'],
      ['Liberación gradual hasta por 8 horas', 'pensado para una energía más pareja'],
      ['Complejo B y vitamina B12', 'contribuyen al metabolismo energético normal']
    ],
    ingredients: [
      ['Cafeína 12.5 mg', 'Estimulante natural que favorece el estado de alerta'],
      ['Ginseng Rojo 4.5 mg', 'Planta tradicionalmente usada para apoyar la energía'],
      ['Beta-Alanina 5.6 mg y L-Citrulina 5.5 mg', 'Aminoácidos usados en suplementos para el rendimiento físico'],
      ['Complejo B', 'B1 1.2 mg, B2 1.3 mg, B3 12 mg, B5 5 mg, B6 1.7 mg, B12 600 mcg, B9 40 mcg y B7 30 mcg: vitaminas que contribuyen al metabolismo energético normal']
    ],
    benefits: [
      'Con cafeína para favorecer el estado de alerta',
      'Diseñado para liberar gradualmente hasta por 8 horas',
      'Pensado para acompañar trabajo, estudio o entrenamiento',
      'Complejo B y B12, que contribuyen al metabolismo energético normal'
    ],
    note: 'Contiene cafeína. No recomendado para menores de edad, embarazo ni lactancia.'
  },
  glp1: {
    key: 'glp1', slug: 'glp1-patch', name: 'GLP-1 Patch', short: 'GLP-1', image: 'glp1', accent: '#e58a9c',
    badge: 'Nuevo',
    tagline: 'Apoyo para una rutina de alimentación saludable',
    result: 'Un parche diario para acompañar tus hábitos de alimentación y bienestar de forma práctica y discreta.',
    bullets: [
      ['Berberina, granada y canela', 'extractos de origen vegetal usados en rutinas de bienestar'],
      ['Cromo, complejo B y L-Glutamina', 'nutrientes que contribuyen al metabolismo normal'],
      ['Práctico y discreto', 'se lleva debajo de la ropa todo el día']
    ],
    ingredients: [
      ['Mezcla herbal', 'Berberina, granada y canela: extractos de origen vegetal'],
      ['Complejo B', 'B1, B2, B3, B6, B9 y B12: vitaminas que contribuyen al metabolismo energético normal'],
      ['L-Glutamina', 'Aminoácido presente de forma natural en el cuerpo'],
      ['Picolinato de Cromo', 'El cromo contribuye al metabolismo normal de los macronutrientes']
    ],
    benefits: [
      'Pensado para acompañar una alimentación equilibrada',
      'Con cromo, que contribuye al metabolismo normal de los macronutrientes',
      'Complejo B, que contribuye al metabolismo energético normal',
      'Práctico y discreto para el día a día'
    ],
    note: '"GLP-1" es el nombre del producto. No es un medicamento y no reemplaza una alimentación equilibrada, la actividad física ni el tratamiento médico.'
  },
  dopamine: {
    key: 'dopamine', slug: 'dopamine-patch', name: 'Dopamine Patch', short: 'Dopamine', image: 'dopamine', accent: '#e9c31d',
    badge: '',
    tagline: 'Vitaminas y extractos para tu bienestar diario',
    result: 'Acompañá tu día con una fórmula pensada para tu bienestar y tu rutina.',
    bullets: [
      ['Vitamina C', 'contribuye al funcionamiento psicológico normal'],
      ['Mezcla de extractos herbales', 'de origen vegetal, pensada para tu bienestar'],
      ['Un parche al día', 'rutina simple y sin pastillas']
    ],
    ingredients: [
      ['Vitamina C', 'Antioxidante que contribuye al funcionamiento psicológico normal'],
      ['Dopamina', 'Neurotransmisor presente de forma natural en el cuerpo'],
      ['Extractos Herbales', 'Mezcla de extractos de origen vegetal']
    ],
    benefits: [
      'Formulado para acompañar tu bienestar diario',
      'Con vitamina C, que contribuye al funcionamiento psicológico normal',
      'Pensado para tus días de mucha demanda',
      'Se aplica sobre la piel, sin pastillas'
    ]
  },
  sleep: {
    key: 'sleep', slug: 'sleeping-patch', name: 'Sleeping Patch', short: 'Sleeping', image: 'sleep', accent: '#0a1f3d',
    badge: 'Nuevo', theme: 'night',
    tagline: 'Melatonina, magnesio, lúpulo y valeriana para tu noche',
    result: 'Parches nocturnos con melatonina, magnesio, lúpulo y valeriana. Un parche por noche como parte de tu ritual para ir a dormir.',
    bullets: [
      ['Melatonina, magnesio, lúpulo y raíz de valeriana', 'cuatro ingredientes en un solo parche'],
      ['Liberación gradual sobre la piel', 'diseñada para 6 a 8 horas'],
      ['Un parche por noche', 'en muñeca, brazo o cuello']
    ],
    ingredients: [
      ['Melatonina 7 mg', 'Hormona que tu cuerpo produce de forma natural cuando oscurece'],
      ['Magnesio 41,32 mg', 'Mineral que contribuye al funcionamiento normal del sistema nervioso'],
      ['Lúpulo 16,53 mg', 'Planta usada tradicionalmente en infusiones para la noche'],
      ['Raíz de valeriana 27 mg', 'Raíz usada tradicionalmente en rutinas para el descanso']
    ],
    benefits: [
      'Formulado para acompañar tu rutina de descanso',
      'Con magnesio, que contribuye al funcionamiento normal del sistema nervioso',
      'Liberación gradual, diseñada para 6 a 8 horas',
      'Sin pastillas: un parche por noche'
    ],
    usage: [
      { title: 'Despegá', text: 'Sacá un parche nuevo cada noche. Cada bolsa trae 30: un mes completo.' },
      { title: 'Pegá', text: 'Aplicalo 1 a 2 horas antes de acostarte en piel limpia, seca y sin vello: muñeca, brazo o cuello.' },
      { title: 'Descansá', text: 'Dejalo puesto durante la noche y retiralo al despertar. Rotá la zona cada día.' }
    ],
    warnings: [
      'Solo para uso externo. Aplicar en piel limpia, seca y sin vello.',
      'Consultá a tu médico antes de usarlo si tomás medicamentos, tenés una condición médica, sos menor de 18 años, estás embarazada o en lactancia.',
      'No aplicar sobre heridas o piel irritada. Si notás irritación, retiralo y lavá la zona.',
      'No usar si tenés sensibilidad a alguno de sus componentes.',
      'Mantener fuera del alcance de los niños.'
    ],
    note: 'Contiene melatonina: usalo solo a la hora de dormir. No recomendado para menores de edad, embarazo ni lactancia.'
  },
  stress: {
    key: 'stress', slug: 'stress-relief-patch', name: 'Stress Relief Patch', short: 'Stress Relief', image: 'stress', accent: '#18917e',
    badge: '',
    tagline: 'Apoyo para tus días de mucha carga',
    result: 'Un parche diario pensado para acompañarte en los días de mucha carga.',
    bullets: [
      ['Mezcla Stress Down', 'fórmula pensada para acompañar tus momentos de estrés'],
      ['Complejo B', 'contribuye al funcionamiento normal del sistema nervioso'],
      ['Un parche al día', 'rutina simple y discreta']
    ],
    ingredients: [
      ['Mezcla Stress Down', 'Fórmula especializada pensada para acompañar los momentos de estrés'],
      ['Complejo B', 'Vitaminas que contribuyen al funcionamiento normal del sistema nervioso']
    ],
    benefits: [
      'Formulado para acompañar los días de mucha carga',
      'Complejo B, que contribuye al funcionamiento normal del sistema nervioso',
      'Pensado para integrarse a tu rutina diaria',
      'Discreto y práctico'
    ]
  }
};

/** Static combos: fixed contents and prices (existing business rules). */
const STATIC_COMBOS = {
  'combo-trio': { slug: 'combo-trio-bienestar', name: 'Combo Trío Bienestar', short: 'Trío Bienestar', subtitle: 'Bienestar Total', includes: ['focus', 'glp1', 'stress'], price: 26900, badge: 'Más vendido' },
  'combo-energia-foco': { slug: 'combo-energia-foco', name: 'Combo Energía & Foco', short: 'Energía & Foco', subtitle: 'Energía & Foco', includes: ['energy', 'focus'], price: 17900, badge: '' },
  'combo-foco-calma': { slug: 'combo-foco-calma', name: 'Combo Foco & Calma', short: 'Foco & Calma', subtitle: 'Foco & Calma', includes: ['focus', 'stress'], price: 17900, badge: '' },
  'combo-metabolismo': { slug: 'combo-metabolismo-energia', name: 'Combo Metabolismo & Energía', short: 'Metabolismo & Energía', subtitle: 'Metabolismo & Energía', includes: ['glp1', 'energy'], price: 17900, badge: '' },
  'combo-mood': { slug: 'combo-mood-calma', name: 'Combo Mood & Calma', short: 'Mood & Calma', subtitle: 'Mood & Calma', includes: ['dopamine', 'stress'], price: 17900, badge: '' },
  // Sleeping Patch combos (approved by the owner, Nov 2026)
  'combo-dia-noche': { slug: 'combo-dia-y-noche', name: 'Combo Día & Noche', short: 'Día & Noche', subtitle: 'Energía de día, descanso de noche', includes: ['energy', 'sleep'], price: 17900, badge: 'Nuevo' },
  'combo-calma-24': { slug: 'combo-calma-24-h', name: 'Combo Calma 24 h', short: 'Calma 24 h', subtitle: 'Calma de día, descanso de noche', includes: ['stress', 'sleep'], price: 17900, badge: 'Nuevo' }
};

/** Bloom: hyaluronic-acid micro-needle patches for blemishes. Sold on its own, not part of combos. */
export const BLOOM = {
  key: 'bloom', slug: 'bloom-parches-granitos', name: 'Bloom Micro-Infusion Patch', short: 'Bloom', image: 'bloom', cardImage: 'bloom', accent: '#5a3fc8',
  badge: 'Nuevo', theme: 'skin',
  tagline: 'Micro-agujas con ácido hialurónico · 9 parches',
  result: 'Parches transparentes de micro-agujas disolubles con ácido hialurónico, pensados para esos granitos que aparecen justo antes de un plan.',
  bullets: [
    ['Qué es', 'Micro-agujas que se disuelven durante la noche'],
    ['Activo', 'Ácido hialurónico'],
    ['Cómo se usa', 'Lavá, aplicá sobre el granito y dormí']
  ],
  features: [
    ['Micro-agujas que se disuelven', 'Llevan sus ingredientes directo a la zona del granito mientras descansás.'],
    ['Transparente', 'Se siente limpio, ligero y fácil de usar sin alterar tu rutina.'],
    ['Para el último minuto', 'Ideal para esos granitos que aparecen justo antes de un plan.'],
    ['9 por paquete', 'Uno por granito. Con 2 paquetes, cada parche sale a ₡444.']
  ],
  usage: [
    { title: 'Limpiá', text: 'Lavá tu cara y secá bien el área antes de aplicar.' },
    { title: 'Aplicá', text: 'Presioná el parche sobre el granito por unos segundos.' },
    { title: 'Dormí', text: 'Las micro-agujas se disuelven mientras descansás.' }
  ],
  note: 'Producto de cuidado de la piel, de uso externo. No usar sobre heridas abiertas ni piel irritada. Si notás irritación, retiralo.'
};

/** Bloom options shown on its page and in the cart add-on. */
export const BLOOM_OPTIONS = [
  { qty: 1, label: '1 paquete', sub: '9 parches' },
  { qty: 2, label: '2 paquetes', sub: '18 parches' }
];

export const COMBO_ORDER = ['combo-dia-noche', 'combo-calma-24', 'combo-trio', 'combo-full', 'combo-energia-foco', 'combo-foco-calma', 'combo-metabolismo', 'combo-mood'];

function list(value) {
  return String(value || '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Normalises runtime config from env-style strings. */
export function readConfig(env = {}) {
  const fullHousePrices = {};
  for (let n = 2; n <= 6; n += 1) {
    const raw = Number.parseInt(env[`VITE_FULL_HOUSE_PRICE_${n}`] ?? env[`FULL_HOUSE_PRICE_${n}`], 10);
    if (Number.isFinite(raw) && raw > 0) fullHousePrices[n] = raw;
  }
  return {
    soldOut: list(env.VITE_SOLD_OUT ?? env.SOLD_OUT),
    comboExcluded: list(env.VITE_COMBO_EXCLUDED ?? env.COMBO_EXCLUDED ?? 'nad'),
    soldOutMessage: env.VITE_SOLD_OUT_MESSAGE || '¡Vuelve pronto! Llega en 10 días',
    fullHousePrices
  };
}

/** Price of `qty` units of a single patch: always ₡9.900 each (only combos carry a discount). */
export function packPrice(qty) {
  return SINGLE_PRICE * Math.max(0, Math.floor(qty));
}

export function buildCatalog(config = {}) {
  const cfg = { soldOut: [], comboExcluded: [], soldOutMessage: '', fullHousePrices: {}, ...config };
  const products = Object.create(null); // no inherited keys like 'constructor'/'__proto__'

  for (const key of PATCH_ORDER) {
    const p = PATCHES[key];
    products[key] = {
      ...p,
      kind: 'patch',
      price: SINGLE_PRICE,
      compareAt: null,
      includes: [key],
      cardImage: key === 'sleep' ? 'sleep' : `${key}-studio`,
      unitLabel: key === 'sleep' ? '30 parches · 30 noches' : '30 parches · 1 mes',
      path: `/producto/${p.slug}/`
    };
  }

  products.bloom = { ...BLOOM, kind: 'bloom', price: BLOOM_PRICE, compareAt: null, includes: ['bloom'], unitLabel: '9 parches por paquete', path: `/producto/${BLOOM.slug}/` };

  for (const [key, c] of Object.entries(STATIC_COMBOS)) {
    products[key] = { ...c, key, kind: 'combo', image: key, cardImage: key, compareAt: c.includes.length * SINGLE_PRICE, unitLabel: `${c.includes.length} paquetes de 30 parches`, path: `/producto/${c.slug}/` };
  }

  const fhKeys = PATCH_ORDER.filter((k) => !cfg.soldOut.includes(k) && !cfg.comboExcluded.includes(k));
  if (fhKeys.length >= 2) {
    const compareAt = fhKeys.length * SINGLE_PRICE;
    products['combo-full'] = {
      key: 'combo-full', slug: 'combo-full-house', kind: 'combo',
      name: 'Combo Full House', short: 'Full House', subtitle: `${fhKeys.length} paquetes`,
      includes: fhKeys, image: `combo-full-${fhKeys.join('-')}`, cardImage: `combo-full-${fhKeys.join('-')}`, badge: 'Mejor ahorro',
      price: cfg.fullHousePrices[fhKeys.length] || FULL_HOUSE_PRICE_BY_COUNT[fhKeys.length] || compareAt,
      compareAt, unitLabel: `${fhKeys.length} paquetes de 30 parches`, path: '/producto/combo-full-house/'
    };
  }

  for (const p of Object.values(products)) {
    if (p.kind === 'combo') {
      p.savings = Math.max(p.compareAt - p.price, 0);
      p.price = Math.min(p.price, p.compareAt);
    }
  }

  const isSoldOut = (key) => {
    if (cfg.soldOut.includes(key)) return true;
    const p = products[key];
    return Boolean(p && p.kind === 'combo' && p.includes.some((k) => cfg.soldOut.includes(k)));
  };

  /** Price of `qty` units of product `key` (patches use the pack ladder). */
  const linePrice = (key, qty) => {
    const p = products[key];
    if (!p) return 0;
    if (p.kind === 'bloom') return bloomPrice(qty);
    return p.kind === 'patch' ? packPrice(qty) : p.price * qty;
  };

  const lineCompare = (key, qty) => {
    const p = products[key];
    if (!p) return 0;
    if (p.kind === 'bloom') return BLOOM_PRICE * qty;
    return p.kind === 'patch' ? SINGLE_PRICE * qty : p.compareAt * qty;
  };

  /**
   * Prices an order from [{key, qty}]. Unknown, sold-out or non-positive lines are dropped.
   * This is what the server trusts; the browser uses it only to display totals.
   */
  const priceOrder = (rawItems) => {
    const merged = new Map();
    for (const it of Array.isArray(rawItems) ? rawItems : []) {
      const key = it && it.key;
      const qty = Math.min(MAX_QTY_PER_LINE, Math.floor(Number(it && it.qty)));
      if (!products[key] || !(qty > 0) || isSoldOut(key)) continue;
      merged.set(key, Math.min(MAX_QTY_PER_LINE, (merged.get(key) || 0) + qty));
    }
    const items = [...merged].map(([key, qty]) => {
      const p = products[key];
      const lineTotal = linePrice(key, qty);
      return { key, name: p.name, qty, price: Math.round(lineTotal / qty), lineTotal, compareTotal: lineCompare(key, qty) };
    });
    const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
    const shipping = items.length ? shippingFor(subtotal) : 0;
    const savings = items.reduce((s, i) => s + Math.max(i.compareTotal - i.lineTotal, 0), 0);
    return { items, subtotal, shipping, total: subtotal + shipping, savings };
  };

  return {
    products,
    isSoldOut,
    linePrice,
    lineCompare,
    priceOrder,
    config: cfg,
    list: (keys) => keys.map((k) => products[k]).filter(Boolean),
    patches: () => PATCH_ORDER.map((k) => products[k]),
    combos: () => COMBO_ORDER.map((k) => products[k]).filter(Boolean),
    bloom: () => products.bloom
  };
}

export const PROVINCES = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón'];

export const FAQ = [
  ['¿Cómo se usa el parche?', 'Despegá el parche, aplicalo en zona limpia y seca (brazo, hombro o espalda) y dejalo actuar. Los ingredientes se absorben durante todo el día.'],
  ['¿Cuánto dura cada parche?', 'Cada parche dura un día completo (hasta 24 horas). Recomendamos cambiarlo diariamente para mejores resultados. Cada paquete trae 30 parches: un mes completo.'],
  ['¿Son seguros los ingredientes?', 'Nuestros parches son suplementos de bienestar formulados con ingredientes de origen natural. No son medicamentos. Si tenés una condición médica, tomás medicamentos, estás embarazada o en lactancia, consultá con tu médico antes de usarlos.'],
  ['¿Pueden causar molestias?', 'Se aplican sobre la piel y no pasan por el sistema digestivo. Algunas personas con piel sensible pueden notar enrojecimiento o picazón en la zona; si ocurre, retirá el parche, lavá la zona y consultá con tu médico. Rotá la zona de aplicación cada día.'],
  ['¿Puedo combinar parches?', 'Sí. Podés usar varios según tus necesidades, por eso ofrecemos combos con descuento.'],
  ['¿Cómo puedo pagar?', 'Con SINPE Móvil (te damos el número al confirmar el pedido y nos enviás el comprobante por WhatsApp) o con tarjeta de crédito/débito por la pasarela segura de Tilopay.'],
  ['¿Cuánto cuesta y cuánto tarda el envío?', `El envío a todo Costa Rica cuesta ${formatCRC(SHIPPING_COST)} y es GRATIS en pedidos de ${formatCRC(FREE_SHIPPING_FROM)} o más. Tarda ${SITE.deliveryDays}. También ofrecemos retiro en ${SITE.pickup}.`]
];

/**
 * ⚠ PLACEHOLDER REVIEWS (REVIEWS_ARE_PLACEHOLDERS = true): written as stand-ins so the design can be approved.
 * Replace them with real customer reviews before running ads, then set REVIEWS_ARE_PLACEHOLDERS to false.
 * While true: nothing is marked "compra verificada" and no AggregateRating is sent to Google.
 *
 * Shape per product key:
 *   { author:'María F.', city:'San José', rating:5, title:'…', text:'…', date:'2026-09-30', verified:false }
 */
/** "+ envío ₡3.000 · Gratis desde ₡25.000", or "Envío gratis incluido" when the amount already qualifies. */
export function shippingNote(amount) {
  return amount >= FREE_SHIPPING_FROM
    ? 'Envío gratis incluido'
    : `+ envío ${formatCRC(SHIPPING_COST)} · Gratis desde ${formatCRC(FREE_SHIPPING_FROM)}`;
}

export const REVIEWS_ARE_PLACEHOLDERS = true;

export const REVIEWS = {
  focus: [
    { author: 'Daniela M.', city: 'Heredia', rating: 5, title: 'Fáciles de usar', text: 'Me los pego en la mañana y me olvido de que los tengo puestos. Son cómodos y no se despegan.', date: '2026-09-18' },
    { author: 'Andrés R.', city: 'San José', rating: 4, title: 'Buena rutina', text: 'Los uso para las semanas de estudio. Me gusta que sea un parche y no una pastilla más.', date: '2026-09-09' },
    { author: 'Karla S.', city: 'Cartago', rating: 5, title: 'Llegaron rápido', text: 'El pedido llegó en tres días y venía bien empacado. Atención muy amable por WhatsApp.', date: '2026-08-29' }
  ],
  nad: [
    { author: 'Mauricio V.', city: 'Alajuela', rating: 5, title: 'Sencillo', text: 'Un parche al día y listo. Fácil de integrar a la rutina de la mañana.', date: '2026-09-14' },
    { author: 'Laura C.', city: 'Escazú', rating: 4, title: 'Buen producto', text: 'Se pega bien y es discreto. Voy por mi segundo paquete para ver cómo me va.', date: '2026-09-02' },
    { author: 'Esteban J.', city: 'Heredia', rating: 5, title: 'Todo en orden', text: 'Pagué por SINPE y me confirmaron enseguida. Muy buen trato.', date: '2026-08-21' }
  ],
  energy: [
    { author: 'Paola G.', city: 'San Rafael', rating: 5, title: 'Práctico para entrenar', text: 'Me lo pongo antes de ir al gimnasio. Es cómodo y no estorba con la ropa deportiva.', date: '2026-09-20' },
    { author: 'Josué B.', city: 'Alajuela', rating: 4, title: 'Me gustó', text: 'Lo uso en días de mucho trabajo. Se queda firme todo el día, incluso con calor.', date: '2026-09-11' },
    { author: 'Mariela T.', city: 'Limón', rating: 5, title: 'Buen servicio', text: 'Me llegó a Limón en cuatro días. Todo completo y bien empacado.', date: '2026-09-03' }
  ],
  glp1: [
    { author: 'Rebeca A.', city: 'San José', rating: 5, title: 'Cómodo y discreto', text: 'Nadie nota que lo traigo puesto. Es fácil de aplicar y de quitar.', date: '2026-09-22' },
    { author: 'Gabriela O.', city: 'Heredia', rating: 4, title: 'Lo acompaño con mi rutina', text: 'Lo uso junto con mis comidas y mi ejercicio de siempre. Me gusta la comodidad.', date: '2026-09-12' },
    { author: 'Tatiana L.', city: 'Puntarenas', rating: 5, title: 'Muy amables', text: 'Tenía dudas y me las respondieron por WhatsApp con paciencia. Recomendado.', date: '2026-09-01' }
  ],
  dopamine: [
    { author: 'Valeria P.', city: 'Cartago', rating: 5, title: 'Me gustó', text: 'Es cómodo y lo uso todos los días en el brazo. Me gusta la rutina de ponérmelo en la mañana.', date: '2026-09-16' },
    { author: 'Felipe N.', city: 'San José', rating: 4, title: 'Buena opción', text: 'Se pega bien y no irrita mi piel. Un paquete me rinde el mes completo.', date: '2026-09-05' },
    { author: 'Natalia H.', city: 'Guanacaste', rating: 5, title: 'Envío rápido', text: 'Muy buena atención y llegó antes de lo que esperaba.', date: '2026-08-26' }
  ],
  stress: [
    { author: 'Carolina F.', city: 'Heredia', rating: 5, title: 'Lo uso en semanas pesadas', text: 'Me gusta tenerlo como parte de mi rutina cuando tengo mucho trabajo. Es cómodo.', date: '2026-09-19' },
    { author: 'Ricardo D.', city: 'Alajuela', rating: 4, title: 'Cómodo', text: 'Muy discreto, nadie se da cuenta. La piel lo tolera bien.', date: '2026-09-08' },
    { author: 'Sofía Q.', city: 'San José', rating: 5, title: 'Buen empaque', text: 'Llegó bien empacado y con las instrucciones claras. Muy amables en la atención.', date: '2026-08-30' }
  ]
};

export function reviewSummary(key) {
  const rows = REVIEWS[key] || [];
  if (!rows.length) return null;
  const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
  return { count: rows.length, average: Math.round(avg * 10) / 10 };
}

export { COMMON_USAGE };

