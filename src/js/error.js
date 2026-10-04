import './core.js';
import { $ } from './lib/ui.js';

// Gateway messages come from the query string: render as text only, never as HTML.
const q = new URLSearchParams(location.search);
const detail = (q.get('description') || q.get('mensaje') || '').slice(0, 200);
const code = (q.get('code') || '').slice(0, 20);
const el = $('[data-detail]');
if (el && (detail || code)) {
  el.textContent = [detail && `Motivo: ${detail}`, code && `Código: ${code}`].filter(Boolean).join(' · ');
  el.hidden = false;
}
