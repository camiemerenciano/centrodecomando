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

  // Busca usuário existente
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find(u => u.email === email)

  let userId = existing?.id

  if (userId) {
    // Atualiza senha do usuário existente
    await supabase.auth.admin.updateUserById(userId, { password: senha })
  } else {
    // Cria novo usuário com senha temporária
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      user_metadata: { full_name: nome ?? '', role: 'client' },
      email_confirm: true,
    })
    if (createError || !created?.user?.id)
      return NextResponse.json({ error: createError?.message ?? 'Não foi possível criar o usuário.' }, { status: 400 })
    userId = created.user.id
  }

  await supabase.from('perfis').upsert({ id: userId, role: 'client' })

  return NextResponse.json({ ok: true })
}
