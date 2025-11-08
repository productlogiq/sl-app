// src/app/api/sl/oauth/callback/route.ts
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) return new Response("Missing ?code", { status: 400 });

    const SUPABASE_URL = requireEnv("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SL_CLIENT_ID = requireEnv("SL_CLIENT_ID");
    const SL_CLIENT_SECRET = requireEnv("SL_CLIENT_SECRET");
    const BASE_URL = requireEnv("NEXT_PUBLIC_BASE_URL");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tokenRes = await fetch("https://app.sellerlegend.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: SL_CLIENT_ID,
        client_secret: SL_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/api/sl/oauth/callback`
      })
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return new Response(`OAuth exchange failed (${tokenRes.status}). Body:\n${txt}`, { status: 500 });
    }

    const tokens = await tokenRes.json();
    if (!tokens.access_token) return new Response("No access_token in OAuth response", { status: 500 });

    // MVP single-account
    const sl_account_id = "default-account";
    const { data: acct, error: acctErr } = await sb
      .from("sellerlegend_accounts").upsert({ sl_account_id }).select().single();
    if (acctErr) return new Response(`Supabase upsert account error: ${acctErr.message}`, { status: 500 });

    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString();
    const { error: tokErr } = await sb.from("oauth_tokens").upsert({
      account_id: acct.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? "",
      expires_at: expiresAt
    });
    if (tokErr) return new Response(`Supabase upsert token error: ${tokErr.message}`, { status: 500 });

    return new Response(null, { status: 302, headers: { Location: "/dashboard" } });
  } catch (e: any) {
    return new Response(`Callback crashed: ${e?.message ?? e}`, { status: 500 });
  }
}
