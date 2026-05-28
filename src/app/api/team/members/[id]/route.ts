import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  // Verifica que o membro pertence a este owner
  const { data: link } = await admin
    .from('team_members')
    .select('member_id')
    .eq('owner_id', user.id)
    .eq('member_id', id)
    .maybeSingle()

  if (!link) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { cargo, telefone, endereco, remuneracao, data_entrada, aniversario } = await req.json()

  const { error } = await admin.from('perfis').upsert({
    id,
    cargo:        cargo        || null,
    telefone:     telefone     || null,
    endereco:     endereco     || null,
    remuneracao:  remuneracao  ?? null,
    data_entrada: data_entrada || null,
    aniversario:  aniversario  || null,
  }, { onConflict: 'id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  if (id === user.id) return NextResponse.json({ error: 'Não é possível excluir a própria conta' }, { status: 400 })

  const admin = createAdminClient()

  await Promise.all([
    admin.from('ai_config').delete().eq('user_id', id),
    admin.from('integracoes').delete().eq('user_id', id),
    admin.from('pipeline_leads').delete().eq('user_id', id),
    admin.from('tarefas').delete().eq('user_id', id),
    admin.from('clientes').delete().eq('user_id', id),
    admin.from('chat_canais').delete().eq('user_id', id),
    admin.from('chat_mensagens').delete().eq('autor_id', id),
    admin.from('chat_dms').delete().or(`user1_id.eq.${id},user2_id.eq.${id}`),
    admin.from('team_members').delete().or(`member_id.eq.${id},owner_id.eq.${id}`),
    admin.from('pending_invites').delete().eq('owner_id', id),
  ])

  const { error } = await admin.auth.admin.deleteUser(id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
