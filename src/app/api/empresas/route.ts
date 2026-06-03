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

  // Verifica se é membro de outro workspace e qual empresa foi convidado
  const { data: asMember } = await admin
    .from('team_members').select('owner_id, empresa_id')
    .eq('member_id', user.id)

  let team: { id: string; nome: string; cor: string; team: boolean }[] = []

  for (const link of asMember ?? []) {
    if (link.empresa_id) {
      // Retorna apenas a empresa específica do convite
      const { data: e } = await admin
        .from('empresas').select('id, nome, cor')
        .eq('id', link.empresa_id).maybeSingle()
      if (e) team.push({ ...e, team: true })
    }
  }

  const own_ = (own ?? []).map(e => ({ ...e, team: false }))

  return NextResponse.json([...own_, ...team])
}
