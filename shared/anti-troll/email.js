/**
 * Email syntax + typo suggestion. Pure, browser + server safe (no DNS here; see server.js).
 */

// Pragmatic syntax: one @, no spaces, dotted domain with a 2+ letter TLD, sane label characters.
const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

export function isValidEmailSyntax(value) {
  const email = String(value ?? '').trim();
  if (!email || email.length > 254) return false;
  const [local] = email.split('@');
  if (!local || local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  return EMAIL_RE.test(email);
}

export function emailDomain(value) {
  const email = String(value ?? '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1);
}

/** Domains we suggest toward. Extend per store if needed. */
export const POPULAR_DOMAINS = [
  'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'live.com',
  'msn.com', 'me.com', 'protonmail.com', 'proton.me', 'ice.co.cr', 'racsa.co.cr', 'ucr.ac.cr', 'hotmail.es', 'outlook.es'
];

/** Exact typo map checked first (fast, no false positives). */
const KNOWN_TYPOS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.om': 'gmail.com',
  'gmaill.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.es': 'gmail.com', 'gmail.cr': 'gmail.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmail.co': 'hotmail.com',
  'hotmail.con': 'hotmail.com', 'hotnail.com': 'hotmail.com', 'homail.com': 'hotmail.com', 'hormail.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlook.co': 'outlook.com', 'outlook.con': 'outlook.com',
  'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahoo.con': 'yahoo.com',
  'iclod.com': 'icloud.com', 'icloud.co': 'icloud.com', 'icoud.com': 'icloud.com'
};

function distance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j += 1) dp[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
    }
  }
  return dp[a.length][b.length];
}

/**
 * Suggests a corrected address for a likely domain typo, or null. Never blocks; UI shows "¿Quisiste decir …?".
 */
export function suggestEmailFix(value) {
  const email = String(value ?? '').trim().toLowerCase();
  const at = email.lastIndexOf('@');
  if (at < 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain || POPULAR_DOMAINS.includes(domain)) return null;
  if (KNOWN_TYPOS[domain]) return `${local}@${KNOWN_TYPOS[domain]}`;
  let best = null;
  let bestD = Infinity;
  for (const d of POPULAR_DOMAINS) {
    const dist = distance(domain, d);
    if (dist < bestD) { best = d; bestD = dist; }
  }
  return best && bestD > 0 && bestD <= (domain.length >= 9 ? 2 : 1) ? `${local}@${best}` : null;
}
