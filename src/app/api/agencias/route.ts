import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function assertSuperadmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from('perfis').select('role').eq('id', user.id).maybeSingle()
  if (perfil?.role !== 'superadmin') return null
  return user
}

export async function GET() {
  const caller = await assertSuperadmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: perfis } = await admin.from('perfis').select('id, role')
  const roleMap: Record<string, string> = {}
  for (const p of perfis ?? []) roleMap[p.id] = p.role

  const agencies = (data.users ?? [])
    .filter(u => roleMap[u.id] !== 'superadmin' && roleMap[u.id] !== 'client')
    .map(u => ({
      id: u.id,
      email: u.email ?? '',
      nome: (u.user_metadata?.full_name as string) ?? (u.user_metadata?.agency_name as string) ?? '',
      plano: (u.user_metadata?.plano as string) ?? 'Starter',
      role: roleMap[u.id] ?? 'agency',
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at ?? null,
    }))

  return NextResponse.json({ agencies })
}

export async function POST(request: NextRequest) {
  const caller = await assertSuperadmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { email, nome, senha, plano } = await request.json().catch(() => ({}))
  if (!email || !nome || !senha || senha.length < 6) {
    return NextResponse.json({ error: 'Email, nome e senha (mín. 6 chars) são obrigatórios' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

  let userId: string

  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: senha,
      user_metadata: { full_name: nome, plano: plano ?? 'Starter', must_change_password: true },
    })
    userId = existing.id
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password: senha,
      user_metadata: { full_name: nome, plano: plano ?? 'Starter', must_change_password: true },
      email_confirm: true,
    })
    if (error || !created?.user) return NextResponse.json({ error: error?.message ?? 'Erro ao criar usuário' }, { status: 400 })
    userId = created.user.id
  }

  await admin.from('perfis').upsert({ id: userId, role: 'agency' })

  return NextResponse.json({ ok: true, userId })
}

export async function DELETE(request: NextRequest) {
  const caller = await assertSuperadmin()
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { userId } = await request.json().catch(() => ({}))
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
