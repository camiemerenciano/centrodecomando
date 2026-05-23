import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { apiUrl, apiKey, instanceName } = await request.json().catch(() => ({}))
  if (!apiUrl || !apiKey || !instanceName)
    return NextResponse.json({ error: 'Credenciais ausentes' }, { status: 400 })

  const base = apiUrl.replace(/\/$/, '')
  try {
    const res  = await fetch(`${base}/instance/connectionState/${instanceName}`, {
      headers: { apikey: apiKey },
    })
    const data = await res.json().catch(() => ({}))
    // state can be: "open" (connected), "close", "connecting"
    const state = data?.instance?.state ?? data?.state ?? 'close'
    return NextResponse.json({ state })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
