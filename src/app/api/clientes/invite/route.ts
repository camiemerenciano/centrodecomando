import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, nome } = await request.json().catch(() => ({}))

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Cria o usuário se não existir
  const { data: created } = await supabase.auth.admin.createUser({
    email,
    user_metadata: { full_name: nome ?? '', role: 'client' },
    email_confirm: false,
  })

  const userId = created?.user?.id

  if (!userId) return NextResponse.json({ error: 'Não foi possível criar o usuário.' }, { status: 400 })

  await supabase.from('perfis').upsert({ id: userId, role: 'client' })

  // Gera o link de convite (não envia e-mail)
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: nome ?? '', role: 'client' },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
    },
  })

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

  return NextResponse.json({ ok: true, link: linkData.properties.action_link })
}
