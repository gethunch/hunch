// Validates an arbitrary `next` redirect target so attacker-controlled values
// can't drive the user off-site after auth. Returns `fallback` for anything
// suspicious; otherwise echoes the validated path.
//
// Rejected forms:
//   - non-string
//   - empty
//   - doesn't start with "/"
//   - starts with "//" (protocol-relative URL → external host)
//   - starts with "/\" (Windows-style separator that some routers treat as protocol-relative)
//   - contains control characters / newlines (header injection / spoofing)
export function safeNextPath(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || raw.length === 0) return fallback;
  if (raw[0] !== "/") return fallback;
  if (raw.length > 1 && (raw[1] === "/" || raw[1] === "\\")) return fallback;
  if (/[\r\n\t\0]/.test(raw)) return fallback;
  return raw;
}
