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

  const body = await req.json()

  const fields: Record<string, unknown> = {
    id,
    cargo:            body.cargo            || null,
    telefone:         body.telefone         || null,
    endereco:         body.endereco         || null,
    remuneracao:      body.remuneracao      ?? null,
    data_entrada:     body.data_entrada     || null,
    aniversario:      body.aniversario      || null,
    parent_id:        body.parent_id !== undefined ? (body.parent_id || null) : undefined,
    // Dados da empresa
    razao_social:     body.razao_social     || null,
    nome_fantasia:    body.nome_fantasia    || null,
    cnpj:             body.cnpj             || null,
    endereco_empresa: body.endereco_empresa || null,
    cep_empresa:      body.cep_empresa      || null,
    telefone_empresa: body.telefone_empresa || null,
    email_empresa:    body.email_empresa    || null,
    // Pagamento
    dados_pagamento:  body.dados_pagamento  || null,
    valor_pagamento:  body.valor_pagamento  ?? null,
    data_pagamento:   body.data_pagamento   || null,
    // Pessoal
    rg:               body.rg               || null,
    cpf:              body.cpf              || null,
    cep:              body.cep              || null,
    // Responsabilidades
    responsabilidades: body.responsabilidades || null,
  }

  // Remove undefined values
  Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k])

  const { error } = await admin.from('perfis').upsert(fields, { onConflict: 'id' })

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
