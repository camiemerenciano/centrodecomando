import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 200 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const members = users
    .filter(u => u.id !== user.id)
    .map(u => ({
      id:    u.id,
      nome:  (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Membro',
      email: u.email ?? '',
    }))

  return NextResponse.json(members)
}
