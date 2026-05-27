import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: links } = await admin
    .from('team_members')
    .select('member_id')
    .eq('owner_id', user.id)

  if (!links || links.length === 0) return NextResponse.json([])

  const memberIds = links.map(l => l.member_id)

  const { data: perfis } = await admin
    .from('perfis')
    .select('id, cargo, endereco, remuneracao, data_entrada, aniversario')
    .in('id', memberIds)

  const perfilMap = new Map((perfis ?? []).map(p => [p.id, p]))

  const members = await Promise.all(
    links.map(async ({ member_id }) => {
      const { data: { user: u } } = await admin.auth.admin.getUserById(member_id)
      if (!u) return null
      const perfil = perfilMap.get(member_id)
      return {
        id:           u.id,
        nome:         (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Membro',
        email:        u.email ?? '',
        cargo:        perfil?.cargo        ?? null,
        endereco:     perfil?.endereco     ?? null,
        remuneracao:  perfil?.remuneracao  ?? null,
        data_entrada: perfil?.data_entrada ?? null,
        aniversario:  perfil?.aniversario  ?? null,
      }
    })
  )

  return NextResponse.json(members.filter(Boolean))
}
