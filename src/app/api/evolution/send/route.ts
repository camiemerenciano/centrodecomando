import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { apiUrl, apiKey, instanceName, number, text } = await request.json().catch(() => ({}))
  if (!apiUrl || !apiKey || !instanceName || !number || !text)
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 })

  const base = apiUrl.replace(/\/$/, '')
  try {
    const res  = await fetch(`${base}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ number, text }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return NextResponse.json({ error: data?.message ?? `Erro ${res.status}` }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
