import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

/**
 * Enterprise Middleware for Supabase Edge Functions
 */
export async function validateRequest(req: Request) {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // 1. Auth Validation
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing Authorization");

  // 2. IP Fingerprinting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "unknown";

  // 3. Schema Validation (POC)
  // In real production, use Zod here.

  return { supabase, ip, ua };
}

/**
 * HMAC Signature Verification
 */
export async function verifyWebhook(req: Request, secret: string) {
  const signature = req.headers.get("x-paydrip-signature");
  if (!signature) return false;

  const body = await req.text();
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const verified = await crypto.subtle.verify(
    "HMAC",
    hmac,
    new Uint8Array(Deno.buffer.from(signature, "hex")),
    new TextEncoder().encode(body)
  );

  return verified;
}
