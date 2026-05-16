import { timingSafeEqual } from "node:crypto";

// Constant-time Bearer-token check for Vercel Cron endpoints.
// Refuses outright if CRON_SECRET is missing — otherwise a misconfigured
// preview deploy would treat `Bearer undefined` as a valid token.
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length === 0) return false;

  const auth = request.headers.get("authorization");
  if (!auth) return false;

  const expected = `Bearer ${secret}`;
  // timingSafeEqual throws if the two buffers differ in length; the explicit
  // pre-check avoids the throw but is itself a length leak. That's fine —
  // token length is not the secret.
  if (auth.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}
