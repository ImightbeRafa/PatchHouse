/**
 * Browser-only Turnstile helper. Renders an invisible-unless-needed widget (appearance: interaction-only),
 * so real buyers normally see nothing; Cloudflare shows a checkbox only if it is unsure.
 *
 * The site key is passed in at runtime (PatchHouse reads it from GET /api/config), so no VITE_ build-time
 * variable and no rebuild are needed. With no site key, every call is a no-op and getToken() resolves ''.
 */
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export function createTurnstile({ siteKey, container, action = 'checkout' } = {}) {
  if (!siteKey || !container || typeof document === 'undefined') {
    return { enabled: false, getToken: async () => '', reset() {} };
  }
  let widgetId = null;
  let token = '';
  let waiters = [];
  const settle = (value) => { token = value; waiters.forEach((w) => w(value)); waiters = []; };

  const ready = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.turnstile || null);
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  }).then((ts) => {
    if (!ts) return null;
    widgetId = ts.render(container, {
      sitekey: siteKey,
      action,
      appearance: 'interaction-only',
      'refresh-expired': 'auto',
      callback: (t) => settle(t),
      'expired-callback': () => { token = ''; },
      'error-callback': () => settle('')
    });
    return ts;
  });

  return {
    enabled: true,
    /** Waits up to timeoutMs for a token. '' means none (server decides; see README). */
    async getToken(timeoutMs = 8000) {
      const ts = await ready;
      if (!ts) return '';
      if (token) return token;
      const current = ts.getResponse(widgetId);
      if (current) return current;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(''), timeoutMs);
        waiters.push((v) => { clearTimeout(timer); resolve(v); });
      });
    },
    /** Tokens are single-use: call after every submit attempt. */
    reset() {
      token = '';
      ready.then((ts) => { if (ts && widgetId !== null) ts.reset(widgetId); });
    }
  };
}
