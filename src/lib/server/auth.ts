import jwt from "@tsndr/cloudflare-worker-jwt";
import { env } from "cloudflare:workers";

export async function createPasswordResetToken(authId: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: authId,
    exp: now + 3600,
  };

  return await jwt.sign(payload, env.APP_SECRET, { algorithm: "HS256" });
}

export async function decodePasswordResetToken(token: string) {
  const verified = await jwt.verify(token, env.APP_SECRET);
  if (!verified || !verified.payload.sub) {
    throw new Error("Invalid or expired token");
  }

  return verified.payload.sub;
}
