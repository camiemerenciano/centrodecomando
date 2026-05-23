export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PortalSidebar } from '@/components/portal-sidebar'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfis')
    .select('role')
    .eq('id', user.id)
    .single()

  if (perfil?.role !== 'client') redirect('/dashboard')
  return (
    <div className="flex min-h-screen">
      <PortalSidebar />
      <main className="flex-1 p-6 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
