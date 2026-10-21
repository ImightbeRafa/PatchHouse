/** Browser + server safe entry. Server-only checks live in ./server.js; browser Turnstile in ./turnstile-client.js. */
export { checkCrPhone, normalizeCrPhone, isObviousFakePhone } from './phone.js';
export { isValidEmailSyntax, emailDomain, suggestEmailFix, POPULAR_DOMAINS } from './email.js';
