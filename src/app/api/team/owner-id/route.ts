import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveOwnerId } from '@/lib/team'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const ownerId = await resolveOwnerId(user.id)
  return NextResponse.json({ ownerId })
}
