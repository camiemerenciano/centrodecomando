import { NextRequest, NextResponse } from 'next/server'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function extractQr(data: Record<string, unknown>): { qrBase64?: string; qrCode?: string } {
  const qrcode = data?.qrcode as Record<string, unknown> | undefined
  const base64 = (qrcode?.base64 as string | undefined) ?? (data?.base64 as string | undefined)
  const code   = (qrcode?.code   as string | undefined) ?? (data?.code   as string | undefined)
  return { qrBase64: base64 || undefined, qrCode: code || undefined }
}

async function tryConnect(base: string, instanceName: string, headers: Record<string, string>) {
  // Try /instance/connect first, then /instance/qrcode as fallback
  const endpoints = [
    `${base}/instance/connect/${instanceName}`,
    `${base}/instance/qrcode/${instanceName}?image=true`,
  ]
  for (const url of endpoints) {
    const res  = await fetch(url, { headers }).catch(() => null)
    if (!res) continue
    const data = await res.json().catch(() => ({})) as Record<string, unknown>
    const qr   = extractQr(data)
    if (qr.qrBase64 || qr.qrCode) return qr
  }
  return null
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { apiUrl, apiKey, instanceName } = body

  if (!apiUrl)       return NextResponse.json({ error: 'apiUrl ausente' },       { status: 400 })
  if (!apiKey)       return NextResponse.json({ error: 'apiKey ausente' },       { status: 400 })
  if (!instanceName) return NextResponse.json({ error: 'instanceName ausente' }, { status: 400 })

  const base    = apiUrl.replace(/\/$/, '')
  const headers = { 'Content-Type': 'application/json', apikey: apiKey }

  try {
    // 1. Cria a instância (ignora se já existir)
    await fetch(`${base}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' }),
    }).catch(() => null)

    // 2. Tenta conectar imediatamente
    const immediate = await tryConnect(base, instanceName, headers)
    if (immediate) return NextResponse.json(immediate)

    // 3. Faz logout para forçar novo QR
    await fetch(`${base}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers,
    }).catch(() => null)

    // 4. Tenta várias vezes com intervalo (até 8s no total)
    for (let attempt = 0; attempt < 4; attempt++) {
      await delay(2000)
      const qr = await tryConnect(base, instanceName, headers)
      if (qr) return NextResponse.json(qr)
    }

    return NextResponse.json(
      {
        error:
          'Evolution API não retornou o QR Code. Verifique se a URL e a API Key estão corretas, e se o servidor Evolution está acessível.',
      },
      { status: 502 }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Não foi possível conectar à Evolution API: ${message}` },
      { status: 502 }
    )
  }
}
