import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const tokenRes = await fetch("https://app.sellerlegend.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.SL_CLIENT_ID,
      client_secret: process.env.SL_CLIENT_SECRET,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/sl/oauth/callback`
    })
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    return new Response(txt, { status: 500 });
  }

  const tokens = await tokenRes.json();

  const sl_account_id = "default-account";

  const { data: acct } = await sb
    .from("sellerlegend_accounts")
    .upsert({ sl_account_id })
    .select()
    .single();

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await sb.from("oauth_tokens").upsert({
    account_id: acct.id,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt
  });

  return new Response(null, {
    status: 302,
    headers: { Location: "/dashboard" }
  });
}
