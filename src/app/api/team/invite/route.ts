import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { email } = await request.json()
  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`

  // Tenta enviar o e-mail de convite via Supabase
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo })

  // Se falhar (SMTP não configurado, rate limit, etc.), gera o link manualmente
  let inviteLink: string | null = null
  if (inviteError) {
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo },
    })
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })
    inviteLink = linkData.properties?.action_link ?? null
  }

  // Guarda o vínculo pendente (tanto para e-mail enviado quanto para link manual)
  const userId = inviteData?.user?.id ?? null
  await admin
    .from('pending_invites')
    .upsert({ owner_id: user.id, email: email.toLowerCase() }, { onConflict: 'email' })

  return NextResponse.json({ id: userId, inviteLink })
}
