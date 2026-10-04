/** Public, non-secret storefront settings: which payment methods are available. */
import { sinpeConfig, cardConfig, isDryRun } from './_lib/http.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const sinpe = sinpeConfig();
  res.json({ sinpe: { enabled: sinpe.enabled }, card: { enabled: cardConfig().enabled || isDryRun() } });
}
