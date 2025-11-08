import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function getAccessToken() {
  const SUPABASE_URL = requireEnv("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // single-account MVP: grab the only account
  const { data: acct, error: accErr } = await sb
    .from("sellerlegend_accounts")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (accErr || !acct) throw new Error("No sellerlegend_accounts row found");

  const { data: tok, error: tokErr } = await sb
    .from("oauth_tokens")
    .select("*")
    .eq("account_id", acct.id)
    .single();
  if (tokErr || !tok) throw new Error("No oauth_tokens row found");

  const willExpireSoon = new Date(tok.expires_at).getTime() < Date.now() + 2 * 60 * 1000;
  if (!willExpireSoon) return tok.access_token;

  // refresh if expiring soon
  const SL_CLIENT_ID = requireEnv("SL_CLIENT_ID");
  const SL_CLIENT_SECRET = requireEnv("SL_CLIENT_SECRET");
  const ref = await fetch("https://app.sellerlegend.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: tok.refresh_token,
      client_id: SL_CLIENT_ID,
      client_secret: SL_CLIENT_SECRET
    })
  });
  if (!ref.ok) {
    const text = await ref.text();
    throw new Error(`Refresh failed: ${ref.status} ${text}`);
  }
  const r = await ref.json();
  const expiresAt = new Date(Date.now() + (r.expires_in ?? 3600) * 1000).toISOString();
  const { error: upErr } = await sb.from("oauth_tokens").upsert({
    account_id: acct.id,
    access_token: r.access_token,
    refresh_token: r.refresh_token ?? tok.refresh_token,
    expires_at: expiresAt
  });
  if (upErr) throw new Error(`Token upsert failed: ${upErr.message}`);

  return r.access_token;
}

