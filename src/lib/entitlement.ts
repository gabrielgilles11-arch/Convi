import crypto from "node:crypto";

// Server-only secret used to sign entitlement cookies so they can't be forged
// or shared as a plain string. Set UNLOCK_SIGNING_SECRET in the host env.
const SECRET = import.meta.env.UNLOCK_SIGNING_SECRET as string | undefined;

export const ENT_COOKIE = "convi_ent";
export const DEV_COOKIE = "convi_dev";

// httpOnly so client JS (and any shared localStorage trick) can't read/forge it.
export const COOKIE_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export function isConfigured(): boolean {
  return typeof SECRET === "string" && SECRET.length > 0;
}

export function newDeviceId(): string {
  return crypto.randomBytes(16).toString("hex");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", SECRET as string).update(data).digest("base64url");
}

export function signEntitlement(email: string, deviceId: string): string {
  const payload = Buffer.from(JSON.stringify({ e: email, d: deviceId, t: Date.now() })).toString(
    "base64url"
  );
  return `${payload}.${hmac(payload)}`;
}

export function verifyEntitlement(
  token: string | undefined | null
): { email: string; deviceId: string } | null {
  if (!token || !isConfigured()) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;

  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const obj = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof obj.e === "string" && typeof obj.d === "string") {
      return { email: obj.e, deviceId: obj.d };
    }
  } catch {
    // fall through
  }
  return null;
}
