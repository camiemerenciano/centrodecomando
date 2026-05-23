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

  // Tenta criar o usuário
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: senha,
    user_metadata: { full_name: nome ?? '', role: 'client' },
    email_confirm: true,
  })

  if (created?.user?.id) {
    userId = created.user.id
  } else if (createError?.message?.toLowerCase().includes('already')) {
    // Usuário já existe — busca e atualiza a senha
    const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const existing = listData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!existing) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 400 })
    userId = existing.id
    await supabase.auth.admin.updateUserById(userId, {
      password: senha,
      user_metadata: { full_name: nome ?? '', role: 'client' },
    })
  } else {
    return NextResponse.json({ error: createError?.message ?? 'Não foi possível criar o usuário.' }, { status: 400 })
  }

  await supabase.from('perfis').upsert({ id: userId, role: 'client' })

  return NextResponse.json({ ok: true })
}
