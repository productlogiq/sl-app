import { NextRequest } from "next/server";
import { getAccessToken } from "@/lib/sl-token";

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

export async function GET(req: NextRequest) {
  try {
    const token = await getAccessToken();
    const { searchParams } = new URL(req.url);
    const sku = searchParams.get("sku") ?? "";
    const asin = searchParams.get("asin") ?? "";
    const marketplace = searchParams.get("marketplace") ?? "";

    // IMPORTANT: set this in Vercel → Env Vars to the correct SL Orders endpoint URL
    const base = process.env.SL_ORDERS_ENDPOINT;
    if (!base) {
      return new Response("Missing env: SL_ORDERS_ENDPOINT", { status: 500 });
    }

    const { startISO, endISO } = currentMonthRange();
    const url = new URL(base);
    // Adjust param names to match SL's Orders endpoint
    url.searchParams.set("start_date", startISO);
    url.searchParams.set("end_date", endISO);
    if (sku) url.searchParams.set("sku", sku);
    if (asin) url.searchParams.set("asin", asin);
    if (marketplace) url.searchParams.set("marketplace", marketplace);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const text = await res.text();
      return new Response(`SL fetch failed (${res.status}): ${text}`, { status: 500 });
    }
    const data = await res.json();

    // Map your SL response to the table shape if needed:
    // Here we assume data is an array of rows already in a useful shape.
    return Response.json({ rows: data });
  } catch (e: any) {
    return new Response(`monthly route error: ${e?.message ?? e}`, { status: 500 });
  }
}

