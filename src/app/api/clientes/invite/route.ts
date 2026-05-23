import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const { email, nome } = await request.json().catch(() => ({}))

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: nome ?? '', role: 'client' },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/portal`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await supabase.from('perfis').upsert({ id: data.user.id, role: 'client' })

  return NextResponse.json({ ok: true })
}
