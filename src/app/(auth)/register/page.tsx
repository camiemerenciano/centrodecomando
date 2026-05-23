'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, Rocket } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    fullName: '',
    agencyName: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
      },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // Create org + add user as owner
    const slug = form.agencyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name: form.agencyName, slug })
      .select()
      .single()

    if (orgError || !org) {
      setError('Conta criada, mas houve um erro ao configurar a agência.')
      setLoading(false)
      return
    }

    await supabase.from('organization_members').insert({
      org_id: org.id,
      user_id: data.user.id,
      role: 'owner',
    })

    router.push('/dashboard')
    router.refresh()
  }

  const inputClass =
    'w-full rounded-lg bg-muted border border-border px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all'

  return (
    <div className="glass rounded-2xl p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Criar conta</h1>
        <p className="mt-1 text-sm text-muted-foreground">Comece a comandar sua agência</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              Seu nome
            </label>
            <input required value={form.fullName} onChange={set('fullName')} placeholder="Maria Silva" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1.5">
              Nome da agência
            </label>
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
              minLength={8}
              value={form.password}
              onChange={set('password')}
              placeholder="Mínimo 8 caracteres"
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
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-primary hover:bg-primary/90 glow-purple"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <Rocket size={15} />
              Criar conta gratuita
            </>
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
