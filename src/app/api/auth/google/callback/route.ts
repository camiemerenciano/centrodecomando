import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  // Build HTML that closes the popup and notifies the parent window
  function popupHtml(payload: string) {
    return new NextResponse(
      `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <script>
        try { window.opener.postMessage(${payload}, window.location.origin) } catch(e){}
        window.close()
      </script>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }

  if (error || !code) {
    return popupHtml(JSON.stringify({ type: 'google_auth', error: error ?? 'cancelled' }))
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const base         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const redirectUri  = `${base}/api/auth/google/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: redirectUri, grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    return popupHtml(JSON.stringify({ type: 'google_auth', error: err }))
  }

  const tokens = await tokenRes.json()

  // Get user profile
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const user = await userRes.json()

  return popupHtml(JSON.stringify({
    type:          'google_auth',
    email:         user.email,
    name:          user.name,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token,
  }))
}
