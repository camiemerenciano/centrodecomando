import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('integracoes')
    .select('evo_api_url, evo_api_key, evo_instance')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!data?.evo_api_url) return NextResponse.json({ error: 'Sem config' }, { status: 404 })

  return NextResponse.json({
    apiUrl:       data.evo_api_url,
    apiKey:       data.evo_api_key,
    instanceName: data.evo_instance,
  })
}
