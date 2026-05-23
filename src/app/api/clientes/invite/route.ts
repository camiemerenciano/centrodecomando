import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, nome } = await request.json().catch(() => ({}))

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Busca usuário existente
  const { data: listData } = await supabase.auth.admin.listUsers()
  const existing = listData?.users?.find(u => u.email === email)

  let userId = existing?.id

  if (!userId) {
    // Cria novo usuário
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      user_metadata: { full_name: nome ?? '', role: 'client' },
      email_confirm: false,
    })
    if (createError || !created?.user?.id)
      return NextResponse.json({ error: createError?.message ?? 'Não foi possível criar o usuário.' }, { status: 400 })
    userId = created.user.id
  }

  await supabase.from('perfis').upsert({ id: userId, role: 'client' })

  // Gera o link de convite (não envia e-mail)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: nome ?? '', role: 'client' },
      redirectTo: `https://${request.headers.get('host')}/acesso`,
    },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

  return NextResponse.json({ ok: true, link: linkData.properties.action_link })
}
