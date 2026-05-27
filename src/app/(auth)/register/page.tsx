'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, Rocket, CheckCircle2, XCircle } from 'lucide-react'

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
  { key: 'upper',   label: 'Pelo menos 1 letra maiúscula' },
  { key: 'lower',   label: 'Pelo menos 1 letra minúscula' },
  { key: 'special', label: 'Pelo menos 1 caractere especial (!@#$...)' },
] as const

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({ fullName: '', agencyName: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)

  const checks = useMemo(() => checkPassword(form.password), [form.password])
  const passwordValid = Object.values(checks).every(Boolean)
  const showChecks = form.password.length > 0

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!passwordValid) {
      setError('A senha não atende aos requisitos de segurança.')
      return
    }

    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (signUpError) {
      const msg =
        signUpError.message?.includes('already registered')
          ? 'Este e-mail já está cadastrado. Faça login.'
          : signUpError.message || 'Erro ao criar conta. Tente novamente.'
      setError(msg)
      setLoading(false)
      return
    }

    if (!data.session && data.user) {
      setEmailSent(true)
      setLoading(false)
      return
    }

    if (!data.user) {
      setError('Não foi possível criar a conta. O e-mail pode já estar em uso.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'

  if (emailSent) {
    return (
      <div className="glass rounded-2xl p-8 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
          <Rocket size={26} className="text-primary" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Confirme seu e-mail</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Enviamos um link de confirmação para <span className="text-foreground font-medium">{form.email}</span>.
          Clique no link para ativar sua conta e acessar o Orbit™.
        </p>
        <p className="text-xs text-muted-foreground">Não recebeu? Verifique a caixa de spam.</p>
        <Link href="/login" className="inline-block text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Já confirmei — fazer login →
        </Link>
      </div>
    )
  }

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comece a comandar sua agência</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Seu nome</label>
            <input required value={form.fullName} onChange={set('fullName')} placeholder="Maria Silva" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">Nome da agência</label>
            <input required value={form.agencyName} onChange={set('agencyName')} placeholder="Agência Nexus" className={inputClass} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">E-mail</label>
          <input type="email" required value={form.email} onChange={set('email')} placeholder="voce@agencia.com" className={inputClass} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/80 mb-1.5">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={form.password}
              onChange={set('password')}
              placeholder="Crie uma senha forte"
              className={`${inputClass} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {showChecks && (
            <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1">
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

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading || (showChecks && !passwordValid)}
          className="w-full h-10 bg-primary hover:bg-primary/90 glow-orange"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <><Rocket size={15} /> Criar conta gratuita</>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
          Entrar
        </Link>
      </p>
    </div>
  )
}
