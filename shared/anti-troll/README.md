# anti-troll: order checks invisible to real buyers

A self-contained module for blocking prank and junk orders. To reuse it, copy this whole folder (`shared/anti-troll/`) into another store. It has no npm dependencies and needs Node 20 or newer.

| File | Runs in | What it does |
|---|---|---|
| `phone.js` | browser + server | CR phone check: 8 digits, accepts `+506`/`506`/`00506`, spaces, dashes and parentheses. The first digit must be 2, 4, 5, 6, 7 or 8. Rejects all-same-digit numbers (`8888-8888`) and straight runs (`12345678`, `87654321`, `23456789`). |
| `email.js` | browser + server | Email syntax check plus `suggestEmailFix()` for typos (`gmial.com` → `gmail.com`). The suggestion **never blocks**. |
| `server.js` | **server only** (uses `node:dns`, `node:fs`) | Disposable-domain block, MX lookup with A/AAAA fallback, Turnstile `siteverify`, and `runOrderChecks()`, the single call order handlers make. |
| `turnstile-client.js` | browser only | Loads Turnstile with `appearance: 'interaction-only'`, so visitors see nothing unless Cloudflare wants a click. Single-use tokens are handled with `getToken()` and `reset()`. |
| `data/disposable-domains.txt` | server | The disposable-domain list, one domain per line. |
| `index.js` | browser + server | Re-exports the pure helpers. |

## Wiring (what PatchHouse does)

- **Shared validation:** `shared/validate.js` uses `checkCrPhone` and `isValidEmailSyntax`. The browser and the API therefore show the same Spanish messages.
- **Order handlers:** `api/sinpe/create-order.js` and `api/tilopay/create-payment.js` call `await runOrderChecks({ email, turnstileToken: body.turnstileToken, req })` right after field validation. They return its `status`/`body` when `ok` is false.
  - Field errors use the existing `{ errors: { email } }` shape, so the checkout UI marks the field with no new code.
  - Turnstile failure returns `403 { error: 'verification_failed', message }`.
  - Nothing after this point changed: pricing, SINPE, COD and Tilopay all work as before.
- **Config endpoint:** `api/config.js` returns `turnstile: { siteKey }` only when **both** keys are set, otherwise `null`. The secret is never sent.
- **Checkout page:** `src/js/checkout.js` creates the widget from that site key in `<div data-turnstile>`, sends `turnstileToken` with the order, and resets the widget after every attempt. It also shows "¿Quisiste decir …?" under the email field.

## Fail-open policy (deliberate)

A real buyer must never lose an order because of an outage on our side or Cloudflare's. Only clear evidence of a bad submit blocks an order.

**Blocks the order:**
- bad email syntax
- a disposable domain
- DNS says the domain does not exist (`ENOTFOUND`/`ENODATA` on MX, A and AAAA)
- a null MX (`.`), meaning the domain explicitly takes no mail
- Turnstile answers `success: false` for the visitor's token (`invalid-input-response`, `timeout-or-duplicate`)
- a missing token while Turnstile is enabled

**Lets the order through and logs `[anti-troll] … fail open`:**
- DNS timeout (3 s), `SERVFAIL`, refused, or any other inconclusive error
- `siteverify` unreachable, slow (4 s), or HTTP 5xx
- Turnstile error codes that point at our config (`invalid-input-secret`, `missing-input-secret`, `internal-error`, `bad-request`)
- Turnstile keys missing: the check is skipped entirely

Email is checked only when present, because SINPE orders allow an empty email.

## Environment

| Var | Where | Notes |
|---|---|---|
| `TURNSTILE_SITE_KEY` | server env | Public key. It is **not** a `VITE_` variable: Vite only exposes `VITE_*` vars to browser code, and only at build time. Instead, the server hands the key to the browser at runtime through `/api/config`, so adding or rotating keys needs only a restart, not a rebuild. |
| `TURNSTILE_SECRET` | server env | Secret. Never sent to the browser. Turnstile is enabled only when both vars are set. |
| `ORDER_CHECKS_DNS=off` | optional | Turns off the MX lookup and keeps the syntax and disposable checks. Use it for offline dev or if the host's DNS misbehaves. |

When you create the Turnstile widget in Cloudflare, use **Managed** mode. The client already renders `interaction-only`.

## Updating the disposable list

- **Source:** https://github.com/disposable-email-domains/disposable-email-domains, file `disposable_email_blocklist.conf` (CC0, community maintained).
- **Snapshot:** taken 2026-10-20 from commit `b63df8b431f37ef0b22524f9cae2e86c7114a9de`, 9,913 domains.
- **To refresh it**, run this, review the diff, run the tests and commit:

```sh
curl -fsSL https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf \
  -o shared/anti-troll/data/disposable-domains.txt
```

To allow a domain that the upstream list blocks, delete its line or keep a local patch. Lines starting with `#` are ignored. Subdomains of a listed domain are blocked too. Note that the upstream list includes typo-squat domains such as `gmial.com`, so those are blocked as disposable while the client hint offers the fix.

## Tests

- `tests/anti-troll.test.js` covers phone, email syntax, typos, the disposable list, mocked DNS (MX, A fallback, null MX, NXDOMAIN, SERVFAIL, timeout) and Turnstile (off, on, invalid, outage, timeout).
- `tests/api.test.js` covers handler wiring with an injected offline resolver.
- The test hook `setOrderCheckDeps({ resolver, fetchImpl, env })` injects fakes. Call `setOrderCheckDeps({})` to reset.
