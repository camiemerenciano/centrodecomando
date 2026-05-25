import { createAdminClient } from '@/lib/supabase/admin'

// Retorna o owner_id se o usuário for membro de uma equipe, ou o próprio user_id
export async function resolveOwnerId(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('team_members')
    .select('owner_id')
    .eq('member_id', userId)
    .maybeSingle()
  return data?.owner_id ?? userId
}
