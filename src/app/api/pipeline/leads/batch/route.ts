import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resolveOwnerId } from '@/lib/team'

// POST /api/pipeline/leads/batch
// Body: { leads: Array<{ remote_jid: string; title: string; client: string }> }
// Inserts only leads that don't exist yet (preserves existing stage/status)
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leads } = await request.json() as { leads: { remote_jid: string; title: string; client: string }[] }
  if (!Array.isArray(leads) || leads.length === 0) return NextResponse.json({ ok: true })

  const ownerId = await resolveOwnerId(user.id)
  const admin = createAdminClient()

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
