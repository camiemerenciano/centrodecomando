import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Retorna todas as empresas acessíveis ao usuário:
// - Empresas que ele criou (owner)
// - Empresas do dono do workspace ao qual ele pertence como membro
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Empresas próprias
  const { data: own } = await admin
    .from('empresas').select('id, nome, cor')
    .eq('owner_id', user.id).order('created_at')

  // Verifica se é membro de outro workspace
  const { data: asMember } = await admin
    .from('team_members').select('owner_id')
    .eq('member_id', user.id)

  const ownerIds = (asMember ?? []).map(r => r.owner_id)

  let team: { id: string; nome: string; cor: string; team: boolean }[] = []
  if (ownerIds.length > 0) {
    const { data: teamEmpresas } = await admin
      .from('empresas').select('id, nome, cor')
      .in('owner_id', ownerIds).order('created_at')
    team = (teamEmpresas ?? []).map(e => ({ ...e, team: true }))
  }

  const own_ = (own ?? []).map(e => ({ ...e, team: false }))

  return NextResponse.json([...own_, ...team])
}
