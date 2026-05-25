import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: integracao } = await admin
      .from('integracoes')
      .select('evo_api_url, evo_api_key, evo_instance, evo_connected_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!integracao?.evo_api_url || !integracao?.evo_api_key || !integracao?.evo_instance) {
      return NextResponse.json({ connected: false })
    }

    const base = (integracao.evo_api_url as string).replace(/\/$/, '')
    const connectedTs = integracao.evo_connected_at
      ? new Date(integracao.evo_connected_at as string).getTime() / 1000
      : 0

    const res = await fetch(`${base}/chat/findChats/${integracao.evo_instance}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: integracao.evo_api_key as string },
      body:    JSON.stringify({}),
      signal:  AbortSignal.timeout(5000),
    })

    if (!res.ok) return NextResponse.json({ connected: true, error: 'evo_offline' })

    const chats = await res.json().catch(() => [])
    if (!Array.isArray(chats)) return NextResponse.json({ connected: true, error: 'evo_bad_response' })

    const nowSec = Date.now() / 1000
    const dayAgo = nowSec - 86400
    let naoLidas = 0, semResposta = 0, novas = 0
    const tempos: number[] = []

    for (const chat of chats) {
      const jid = (chat?.id ?? '') as string
      if (!jid.endsWith('@s.whatsapp.net')) continue

      const lastTs: number = (() => {
        const ts = chat?.lastMessage?.messageTimestamp
        if (!ts) return 0
        if (typeof ts === 'number') return ts
        if (typeof ts === 'string') return parseInt(ts, 10) || 0
        return (ts as Record<string, number>)?.low ?? 0
      })()

      if (connectedTs > 0 && lastTs < connectedTs) continue

      naoLidas += (chat?.unreadCount ?? 0)

      const fromMe = chat?.lastMessage?.key?.fromMe ?? true
      if (!fromMe) {
        semResposta++
        if (lastTs > 0) tempos.push((nowSec - lastTs) / 3600)
      }

      if (lastTs > dayAgo) novas++
    }

    const tempoMedio = tempos.length > 0
      ? tempos.reduce((a, b) => a + b, 0) / tempos.length
      : null

    return NextResponse.json({ connected: true, naoLidas, semResposta, novas, tempoMedio })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
