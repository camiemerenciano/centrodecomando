'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, KeyRound, CheckCircle2, XCircle } from 'lucide-react'

function checkPassword(pw: string) {
  return {
    length:  pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    lower:   /[a-z]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  }
}

const RULES = [
  { key: 'length',  label: 'Mínimo 8 caracteres' },
  { key: 'upper',   label: 'Pelo menos 1 maiúscula' },
  { key: 'lower',   label: 'Pelo menos 1 minúscula' },
  { key: 'special', label: 'Pelo menos 1 caractere especial' },
] as const

const inputCls = 'w-full rounded-lg bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'

export default function MudarSenhaPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [show, setShow]         = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const checks = useMemo(() => checkPassword(password), [password])
  const passwordValid = Object.values(checks).every(Boolean)
  const showChecks = password.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!passwordValid) {
      setError('A senha não atende aos requisitos de segurança.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { must_change_password: false },
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: perfil } = await supabase.from('perfis').select('role').eq('id', user!.id).maybeSingle()
    router.push(perfil?.role === 'client' ? '/portal' : '/dashboard')
    router.refresh()
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Crie sua senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina uma senha pessoal para acessar seu portal.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nova senha</label>
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Crie uma senha forte"
              className={`${inputCls} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {showChecks && (
            <div className="mt-2.5 space-y-1">
              {RULES.map(({ key, label }) => {
                const ok = checks[key]
                return (
                  <div key={key} className={`flex items-center gap-1.5 text-[11px] transition-colors ${ok ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                    {ok
                      ? <CheckCircle2 size={11} className="shrink-0" />
                      : <XCircle size={11} className="shrink-0 text-muted-foreground/50" />
                    }
                    {label}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Confirmar senha</label>
          <input
            type={show ? 'text' : 'password'}
            required
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repita a senha"
            className={`${inputCls} ${confirm && confirm !== password ? 'border-destructive/60 focus:ring-destructive/40' : ''}`}
          />
          {confirm && confirm !== password && (
            <p className="text-[11px] text-destructive mt-1.5">As senhas não coincidem.</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading || (showChecks && !passwordValid) || (!!confirm && confirm !== password)}
          className="w-full h-10 bg-primary hover:bg-primary/90 glow-orange"
        >
          {loading
            ? <Loader2 size={16} className="animate-spin" />
            : <><KeyRound size={15} /> Salvar e acessar portal</>
          }
        </Button>
      </form>
    </div>
  )
}
