import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, nome, senha } = await request.json().catch(() => ({}))

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })
  if (!senha || senha.length < 6) return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres.' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let userId: string | undefined

  // Busca usuário existente primeiro
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (existing?.id) {
    // Já existe — só atualiza a senha
    userId = existing.id
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: senha,
      user_metadata: { full_name: nome ?? '', role: 'client', must_change_password: true },
    })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
  } else {
    // Cria novo usuário
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      user_metadata: { full_name: nome ?? '', role: 'client', must_change_password: true },
      email_confirm: true,
    })
    if (createError || !created?.user?.id)
      return NextResponse.json({ error: createError?.message ?? 'Não foi possível criar o usuário.' }, { status: 400 })
    userId = created.user.id
  }

  await supabase.from('perfis').upsert({ id: userId, role: 'client' })

  return NextResponse.json({ ok: true })
}
