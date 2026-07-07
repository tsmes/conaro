// Security response headers applied to every route (issue #23).
//
// CSP note: script-src / style-src use 'unsafe-inline' because the app
// does not run a nonce-injecting middleware — Next.js hydration and
// Tailwind inject inline scripts/styles that a nonce-less strict policy
// would block. 'unsafe-eval' is dev-only (Turbopack/webpack HMR needs
// it) and dropped in production. This CSP is defense-in-depth: the app
// has no dangerouslySetInnerHTML and validates the one user-controlled
// href (mapEmbedUrl), so the residual 'unsafe-inline' exposure is
// acceptable. A nonce-based policy can follow if middleware is added.

export interface SecurityHeader {
  key: string;
  value: string;
}

export function buildContentSecurityPolicy(isDev: boolean): string {
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self' 'unsafe-inline'";

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function buildSecurityHeaders(isDev: boolean): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDev),
    },
  ];

  // HSTS is only meaningful over HTTPS. Gate it to production so we
  // don't pin localhost to HTTPS in developers' browsers.
  if (!isDev) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
