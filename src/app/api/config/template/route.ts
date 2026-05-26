import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TEMPLATE_EMAIL = 'camilaemerencianolima@gmail.com'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // find fabrica user
  const { data: { users } } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const fabrica = users?.find(u => u.email === TEMPLATE_EMAIL)
  if (!fabrica) return NextResponse.json({ data: null })

  const { data } = await admin
    .from('ai_config')
    .select('nome, cargo, missao, agencia, tom_de_voz, regras, proibicoes, emojis_permitidos, emojis_proibidos, exemplos, conhecimento')
    .eq('user_id', fabrica.id)
    .maybeSingle()

  return NextResponse.json({ data })
}
