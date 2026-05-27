import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Busca apenas membros vinculados a este owner via convite
  const { data: links } = await admin
    .from('team_members')
    .select('member_id')
    .eq('owner_id', user.id)

  if (!links || links.length === 0) return NextResponse.json([])

  const members = await Promise.all(
    links.map(async ({ member_id }) => {
      const { data: { user: u } } = await admin.auth.admin.getUserById(member_id)
      if (!u) return null
      return {
        id:    u.id,
        nome:  (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Membro',
        email: u.email ?? '',
      }
    })
  )

  return NextResponse.json(members.filter(Boolean))
}
