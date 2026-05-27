'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function InvitePage() {
  const router = useRouter()

  useEffect(() => {
    async function activate() {
      const supabase = createClient()

      // getSession processa o hash da URL e estabelece a sessão
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        await fetch('/api/team/activate', { method: 'POST' })
      }

      router.replace('/dashboard')
    }

    activate()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={24} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Ativando seu acesso…</p>
      </div>
    </div>
  )
}
