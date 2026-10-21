/** Public, non-secret storefront settings: which payment methods are available. */
import { sinpeConfig, cardConfig, isDryRun } from './_lib/http.js';
import { turnstileConfig } from '../shared/anti-troll/server.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const sinpe = sinpeConfig();
  const ts = turnstileConfig();
  // The site key is public by design; it is only sent when the secret is also set, so the widget never runs unverified.
  res.json({
    sinpe: { enabled: sinpe.enabled },
    card: { enabled: cardConfig().enabled || isDryRun() },
    turnstile: ts.enabled ? { siteKey: ts.siteKey } : null
  });
}
