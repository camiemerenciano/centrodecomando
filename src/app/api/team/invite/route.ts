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
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  // Guarda quem convidou quem para ativar o vínculo no primeiro login
  await admin
    .from('pending_invites')
    .upsert({ owner_id: user.id, email: email.toLowerCase() }, { onConflict: 'email' })

  return NextResponse.json({ id: data.user?.id })
}
