import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr) return NextResponse.json({ error: 'Auth error: ' + authErr.message }, { status: 401 })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Get Evolution API config
    const { data: integ, error: integErr } = await admin
      .from('integracoes')
      .select('evo_api_url, evo_api_key, evo_instance')
      .eq('user_id', user.id)
      .maybeSingle()

    if (integErr) return NextResponse.json({ error: 'DB error: ' + integErr.message }, { status: 500 })
    if (!integ?.evo_api_url || !integ?.evo_api_key || !integ?.evo_instance) {
      return NextResponse.json({ error: 'Sem config Evolution', integ }, { status: 400 })
    }

    // Fetch chats from Evolution API
    const base = integ.evo_api_url.replace(/\/$/, '')
    let chats: Record<string, unknown>[] = []
    const evoRes = await fetch(`${base}/chat/findChats/${integ.evo_instance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: integ.evo_api_key },
      body: JSON.stringify({}),
    })
    const raw = await evoRes.json().catch(() => [])
    if (!evoRes.ok) return NextResponse.json({ error: 'Evolution error: ' + JSON.stringify(raw) }, { status: 502 })
    chats = Array.isArray(raw) ? raw : []

    // Get existing pipeline metadata
    const { data: leads, error: leadsErr } = await admin
      .from('pipeline_leads')
      .select('remote_jid, stage, conv_status, priority, id')
      .eq('user_id', user.id)

    if (leadsErr) return NextResponse.json({ error: 'Leads DB error: ' + leadsErr.message }, { status: 500 })

    const metaByJid = new Map((leads ?? []).map((l: Record<string, unknown>) => [l.remote_jid, l]))

    // Merge chats with pipeline metadata
    const contacts = chats
      .map((c) => {
        const jid: string = (c?.remoteJid ?? (c?.id as Record<string, unknown>)?.remote ?? c?.id ?? '') as string
        if (!jid || jid.includes('@g.us')) return null
        const phone = jid.split('@')[0]
        const name = (c?.name ?? c?.pushName ?? `+${phone}`) as string
        const meta = metaByJid.get(jid)
        return {
          id:          meta ? (meta.id as string) : jid,
          remote_jid:  jid,
          title:       name,
          client:      name,
          stage:       (meta?.stage ?? 'recepcao') as string,
          conv_status: (meta?.conv_status ?? 'open') as string,
          priority:    (meta?.priority ?? 'medium') as string,
          has_db_row:  !!meta,
        }
      })
      .filter(Boolean)

    // Upsert new contacts into pipeline_leads
    const toInsert = contacts
      .filter(c => c && !c.has_db_row)
      .map(c => ({
        user_id:     user.id,
        remote_jid:  c!.remote_jid,
        title:       c!.title,
        client:      c!.client,
        stage:       'recepcao',
        priority:    'medium',
        conv_status: 'open',
      }))

    if (toInsert.length > 0) {
      void admin.from('pipeline_leads').insert(toInsert)
    }

    return NextResponse.json(contacts)
  } catch (err) {
    console.error('[pipeline/contacts] unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
