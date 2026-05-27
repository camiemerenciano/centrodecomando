import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verifica se é superadmin
  const { data: perfil } = await supabase
    .from('perfis')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.role !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 500 })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Busca roles da tabela perfis
  const { data: perfis } = await admin.from('perfis').select('id, role')
  const roleMap = new Map((perfis ?? []).map(p => [p.id, p.role]))

  const members = users.map(u => ({
    id:           u.id,
    nome:         (u.user_metadata?.full_name as string | undefined) ?? u.email?.split('@')[0] ?? 'Usuário',
    email:        u.email ?? '',
    role:         roleMap.get(u.id) ?? 'user',
    created_at:   u.created_at,
    last_sign_in: u.last_sign_in_at ?? null,
  }))

  return NextResponse.json(members)
}
