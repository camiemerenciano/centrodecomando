import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerId = user.id
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pipeline_leads')
    .select('*')
    .eq('user_id', ownerId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ownerId = user.id
  const body = await request.json()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pipeline_leads')
    .insert({ ...body, user_id: ownerId })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH /api/pipeline/leads — update conv_status or stage by remote_jid (upsert if not found)
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { remote_jid, ...fields } = await request.json() as { remote_jid: string; [k: string]: unknown }
  if (!remote_jid) return NextResponse.json({ error: 'remote_jid required' }, { status: 400 })

  const ownerId = user.id
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('pipeline_leads')
    .select('id')
    .eq('user_id', ownerId)
    .eq('remote_jid', remote_jid)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('pipeline_leads')
      .update(fields)
      .eq('id', existing.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const phone = remote_jid.split('@')[0] ?? remote_jid
    const { error } = await admin
      .from('pipeline_leads')
      .insert({ user_id: ownerId, remote_jid, title: `+${phone}`, client: `+${phone}`, stage: 'recepcao', priority: 'medium', ...fields })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
