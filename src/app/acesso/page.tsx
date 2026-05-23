'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import { Eye, EyeOff, Loader2, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AcessoPage() {
  const supabase = createClient()
  const router   = useRouter()

  const [ready, setReady]           = useState(false)
  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [show, setShow]             = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function definirSenha(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/portal')
  }

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center p-4">
      <div className="relative z-10 w-full max-w-md space-y-6">

        <div className="text-center">
          <div className="inline-flex items-center gap-3">
            <Logo size={36} className="text-primary" />
            <span className="text-xl font-semibold tracking-tight text-foreground">Método ÓRBITA</span>
          </div>
        </div>

        <div className="glass rounded-2xl p-8 shadow-2xl">
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 size={28} className="animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verificando seu acesso...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">Defina sua senha</h1>
                <p className="mt-1 text-sm text-muted-foreground">Crie uma senha para acessar seu portal.</p>
              </div>

              <form onSubmit={definirSenha} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={show ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-lg bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all pr-10"
                    />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1.5">Confirmar senha</label>
                  <input
                    type={show ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full rounded-lg bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" disabled={loading} className="w-full h-10 bg-primary hover:bg-primary/90 glow-orange">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><KeyRound size={15} /> Acessar portal</>}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
