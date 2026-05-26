import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

// POST /api/pipeline/leads/batch
// Body: { leads: Array<{ remote_jid: string; title: string; client: string }>, purgeStale?: boolean }
// Inserts only leads that don't exist yet (preserves existing stage/status)
// When purgeStale=true, deletes synced leads whose remote_jid is not in the current leads list
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leads, purgeStale } = await request.json() as {
    leads: { remote_jid: string; title: string; client: string }[]
    purgeStale?: boolean
  }
  if (!Array.isArray(leads)) return NextResponse.json({ ok: true })

  const ownerId = user.id
  const admin = createAdminClient()

  // Purge stale synced leads (remote_jid set but not in current valid list)
  if (purgeStale) {
    const validJids = leads.map(l => l.remote_jid).filter(Boolean)
    if (validJids.length > 0) {
      await admin
        .from('pipeline_leads')
        .delete()
        .eq('user_id', ownerId)
        .not('remote_jid', 'is', null)
        .not('remote_jid', 'in', `(${validJids.join(',')})`)
    } else {
      // no valid chats → delete all synced leads
      await admin
        .from('pipeline_leads')
        .delete()
        .eq('user_id', ownerId)
        .not('remote_jid', 'is', null)
    }
  }

  if (leads.length === 0) return NextResponse.json({ ok: true, inserted: 0 })

  // Get all existing remote_jids for this user to avoid overwriting
  const { data: existing } = await admin
    .from('pipeline_leads')
    .select('remote_jid')
    .eq('user_id', ownerId)

  const existingSet = new Set((existing ?? []).map((r: { remote_jid: string }) => r.remote_jid))

  const toInsert = leads
    .filter(l => l.remote_jid && !existingSet.has(l.remote_jid))
    .map(l => ({
      user_id:    ownerId,
      remote_jid: l.remote_jid,
      title:      l.title,
      client:     l.client,
      stage:      'recepcao',
      priority:   'medium',
      conv_status: 'open',
    }))

  if (toInsert.length > 0) {
    await admin.from('pipeline_leads').insert(toInsert)
  }

  return NextResponse.json({ ok: true, inserted: toInsert.length })
}
