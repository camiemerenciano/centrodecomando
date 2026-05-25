import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveOwnerId } from '@/lib/team'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ownerId = await resolveOwnerId(user.id)
  const admin = createAdminClient()

  const { data } = await admin
    .from('integracoes')
    .select('evo_api_url, evo_api_key, evo_instance, evo_connected_at, gcal_access_token, gcal_refresh_token')
    .eq('user_id', ownerId)
    .maybeSingle()

  return NextResponse.json({ data: data ?? null, ownerId })
}
