import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Chamado logo após o login — verifica se há convite pendente e cria o vínculo
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false })

  const admin = createAdminClient()

  // Já tem vínculo? Não precisa fazer nada
  const { data: existing } = await admin
    .from('team_members')
    .select('id')
    .eq('member_id', user.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ ok: true, linked: true })

  // Procura convite pendente para o e-mail do usuário
  const { data: invite } = await admin
    .from('pending_invites')
    .select('owner_id')
    .eq('email', user.email!.toLowerCase())
    .maybeSingle()

  if (!invite) return NextResponse.json({ ok: true, linked: false })

  // Cria o vínculo e remove o convite pendente
  await admin.from('team_members').insert({ owner_id: invite.owner_id, member_id: user.id })
  await admin.from('pending_invites').delete().eq('email', user.email!.toLowerCase())

  return NextResponse.json({ ok: true, linked: true })
}
