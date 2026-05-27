import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Retorna o owner do workspace do usuário atual e todos os membros (exceto ele mesmo)
// - Se o usuário é owner: ownerId = user.id, members = seus membros
// - Se o usuário é membro: ownerId = seu owner, members = owner + co-membros
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Verifica se o usuário é owner (tem membros vinculados)
  const { data: asOwner } = await admin
    .from('team_members')
    .select('member_id')
    .eq('owner_id', user.id)

  if (asOwner && asOwner.length > 0) {
    // É owner — retorna seus membros
    const memberIds = asOwner.map(r => r.member_id)
    const users = await Promise.all(
      memberIds.map(async id => {
        const { data: { user: u } } = await admin.auth.admin.getUserById(id)
        if (!u) return null
        return {
          id: u.id,
          nome: (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Membro',
          email: u.email ?? '',
        }
      })
    )
    return NextResponse.json({ ownerId: user.id, members: users.filter(Boolean) })
  }

  // É membro — busca seu owner
  const { data: asMember } = await admin
    .from('team_members')
    .select('owner_id')
    .eq('member_id', user.id)
    .maybeSingle()

  if (!asMember) {
    // Usuário solo (sem equipe)
    return NextResponse.json({ ownerId: user.id, members: [] })
  }

  const ownerId = asMember.owner_id

  // Busca todos os membros do mesmo workspace
  const { data: coMembros } = await admin
    .from('team_members')
    .select('member_id')
    .eq('owner_id', ownerId)

  const coIds = (coMembros ?? []).map(r => r.member_id).filter(id => id !== user.id)

  // Busca dados do owner + co-membros
  const toFetch = [ownerId, ...coIds]
  const people = await Promise.all(
    toFetch.map(async id => {
      const { data: { user: u } } = await admin.auth.admin.getUserById(id)
      if (!u) return null
      return {
        id: u.id,
        nome: (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Membro',
        email: u.email ?? '',
      }
    })
  )

  return NextResponse.json({ ownerId, members: people.filter(Boolean) })
}
