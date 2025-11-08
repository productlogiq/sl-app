export async function GET() {
  const redirect_uri = encodeURIComponent(`${process.env.NEXT_PUBLIC_BASE_URL}/api/sl/oauth/callback`);

  const url = `https://app.sellerlegend.com/oauth/authorize?response_type=code&client_id=${process.env.SL_CLIENT_ID}&redirect_uri=${redirect_uri}&state=xyz123`;

  return new Response(null, {
    status: 302,
    headers: { Location: url }
  });
}
