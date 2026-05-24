import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { remoteJid, paused } = await request.json()
  if (!remoteJid) return NextResponse.json({ error: 'remoteJid obrigatório' }, { status: 400 })

  if (paused) {
    await supabase.from('lunna_pausas').upsert({ user_id: user.id, remote_jid: remoteJid })
  } else {
    await supabase.from('lunna_pausas').delete().eq('user_id', user.id).eq('remote_jid', remoteJid)
  }

  return NextResponse.json({ ok: true })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const remoteJid = request.nextUrl.searchParams.get('remoteJid')

  // No remoteJid → return all paused JIDs for the user (batch endpoint)
  if (!remoteJid) {
    const { data } = await supabase
      .from('lunna_pausas')
      .select('remote_jid')
      .eq('user_id', user.id)
    return NextResponse.json({ pausedJids: (data ?? []).map(r => r.remote_jid) })
  }

  const { data } = await supabase
    .from('lunna_pausas')
    .select('remote_jid')
    .eq('user_id', user.id)
    .eq('remote_jid', remoteJid)
    .maybeSingle()

  return NextResponse.json({ paused: !!data })
}
