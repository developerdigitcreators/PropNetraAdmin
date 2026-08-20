/** Admin access JWT lifetime. App tokens stay 15m; never use that as a fallback here. */
const ADMIN_ACCESS_MS = 12 * 60 * 60 * 1000;

export function decodeJwtExpMs(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const json = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = json.length % 4 === 0 ? "" : "=".repeat(4 - (json.length % 4));
    const payload = JSON.parse(atob(json + pad)) as { exp?: unknown };
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function resolveTokenExpiresAtMs(input: {
  token: string;
  tokenExpiresAt?: string | null;
  expiresIn?: number | string | null;
}): number {
  if (input.tokenExpiresAt) {
    const fromIso = new Date(input.tokenExpiresAt).getTime();
    if (Number.isFinite(fromIso) && fromIso > Date.now()) return fromIso;
  }

  const fromJwt = decodeJwtExpMs(input.token);
  if (fromJwt) return fromJwt;

  const seconds = Number(input.expiresIn);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Date.now() + seconds * 1000;
  }

  return Date.now() + ADMIN_ACCESS_MS;
}
