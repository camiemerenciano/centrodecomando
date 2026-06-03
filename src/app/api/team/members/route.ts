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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let perfis: any[] | null = null
  ;({ data: perfis } = await admin
    .from('perfis')
    .select('id, cargo, telefone, endereco, remuneracao, data_entrada, aniversario, parent_id')
    .in('id', memberIds))

  // Fallback sem colunas novas
  if (!perfis) {
    ;({ data: perfis } = await admin
      .from('perfis')
      .select('id, cargo, endereco, remuneracao, data_entrada, aniversario')
      .in('id', memberIds))
  }

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
        telefone:     perfil?.telefone     ?? null,
        endereco:     perfil?.endereco     ?? null,
        remuneracao:  perfil?.remuneracao  ?? null,
        data_entrada: perfil?.data_entrada ?? null,
        aniversario:  perfil?.aniversario  ?? null,
        parent_id:    perfil?.parent_id    ?? null,
      }
    })
  )

  return NextResponse.json(members.filter(Boolean))
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { nome, email, senha, parent_id } = await req.json()
  if (!email) return NextResponse.json({ error: 'E-mail é obrigatório' }, { status: 400 })

  const admin = createAdminClient()

  // Verifica se já existe uma conta com esse e-mail
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = usersPage?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  let memberId: string

  if (existing) {
    // Conta já existe — só vincula
    memberId = existing.id
  } else {
    // Conta nova — nome e senha são obrigatórios
    if (!nome || !senha) {
      return NextResponse.json(
        { error: 'Nenhuma conta encontrada com esse e-mail. Informe nome e senha para criar uma nova conta.' },
        { status: 400 }
      )
    }
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { full_name: nome, must_change_password: true },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    memberId = created.user.id
  }

  // Evita duplicata
  const { data: alreadyLinked } = await admin
    .from('team_members').select('member_id')
    .eq('owner_id', user.id).eq('member_id', memberId).maybeSingle()

  if (alreadyLinked) {
    return NextResponse.json({ error: 'Este membro já está vinculado à sua equipe.' }, { status: 400 })
  }

  await admin.from('team_members').insert({ owner_id: user.id, member_id: memberId })

  // Salva o parent_id no perfil
  if (parent_id) {
    await admin.from('perfis').upsert({ id: memberId, parent_id }, { onConflict: 'id' })
  }

  return NextResponse.json({ id: memberId })
}
