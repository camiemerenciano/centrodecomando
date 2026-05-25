import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

function extractQr(data: Record<string, unknown>): { qrBase64?: string; qrCode?: string } {
  const qrcode = data?.qrcode as Record<string, unknown> | undefined
  const base64 = (qrcode?.base64 as string | undefined) ?? (data?.base64 as string | undefined)
  const code   = (qrcode?.code   as string | undefined) ?? (data?.code   as string | undefined)
  return { qrBase64: base64 || undefined, qrCode: code || undefined }
}

async function tryConnect(base: string, instanceName: string, headers: Record<string, string>) {
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

export async function POST() {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY

  if (!apiUrl || !apiKey)
    return NextResponse.json({ error: 'Evolution API não configurada no servidor' }, { status: 500 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Deterministic instance name based on user ID
  const instanceName = `orbit${user.id.replace(/-/g, '').slice(0, 12)}`
  const base    = apiUrl.replace(/\/$/, '')
  const headers = { 'Content-Type': 'application/json', apikey: apiKey }

  try {
    // Monta a URL do webhook para esta instalação
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace('http://localhost:3000', '')
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    const webhookUrl = appUrl ? `${appUrl}/api/evolution/webhook` : null

    // 1. Cria a instância (ignora se já existir) e já configura o webhook
    await fetch(`${base}/instance/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        ...(webhookUrl ? {
          webhook: {
            url: webhookUrl,
            byEvents: true,
            base64: false,
            events: ['MESSAGES_UPSERT'],
          },
        } : {}),
      }),
    }).catch(() => null)

    // Configura/atualiza webhook na instância existente também
    if (webhookUrl) {
      await fetch(`${base}/webhook/set/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          url: webhookUrl,
          byEvents: true,
          base64: false,
          events: ['MESSAGES_UPSERT'],
        }),
      }).catch(() => null)
    }

    // 2. Tenta conectar imediatamente
    const immediate = await tryConnect(base, instanceName, headers)
    if (immediate) return NextResponse.json({ ...immediate, instanceName, apiUrl, apiKey })

    // 3. Faz logout para forçar novo QR
    await fetch(`${base}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers,
    }).catch(() => null)

    // 4. Tenta com retries (até 8s)
    for (let i = 0; i < 4; i++) {
      await delay(2000)
      const qr = await tryConnect(base, instanceName, headers)
      if (qr) return NextResponse.json({ ...qr, instanceName, apiUrl, apiKey })
    }

    return NextResponse.json(
      { error: 'Evolution API não retornou o QR Code. Tente novamente.' },
      { status: 502 }
    )
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `Erro ao conectar: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    )
  }
}
