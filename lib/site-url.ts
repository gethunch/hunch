// Canonical site URL used for outgoing links Supabase needs to know about
// (email confirmation, magic links). Source of truth is NEXT_PUBLIC_SITE_URL.
//
// Building this from the request's Host header is a security footgun — an
// attacker can spoof Host (or a misconfigured preview deploy can land traffic
// at an unexpected hostname), and the resulting verification email link
// would point off-site.
//
// Production sets NEXT_PUBLIC_SITE_URL to https://hunch.in (or whatever the
// canonical host is). Local dev falls back to localhost:3000.

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env && env.length > 0) {
    return env.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function siteUrlFor(path: string): string {
  const base = siteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}
