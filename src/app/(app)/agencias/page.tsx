'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Plus, X, Building2, Mail, KeyRound,
  Trash2, Copy, Check, Users, Clock,
} from 'lucide-react'

interface Agency {
  id: string
  email: string
  nome: string
  plano: string
  role: string
  created_at: string
  last_sign_in: string | null
}

const PLANOS = ['Starter', 'Pro', 'Premium']

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

const planColor: Record<string, string> = {
  Premium: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Pro:     'bg-sky-500/15 text-sky-400 border-sky-500/20',
  Starter: 'bg-muted text-muted-foreground border-border',
}

// ─── NewAgencyPanel ───────────────────────────────────────────────────────────

function NewAgencyPanel({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (a: Agency) => void
}) {
  const [nome, setNome]   = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [plano, setPlano] = useState('Starter')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [done, setDone]       = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedSenha, setCopiedSenha] = useState(false)

  async function create() {
    if (!nome.trim() || !email.trim() || senha.length < 6) return
    setSaving(true)
    setError(null)
    const res  = await fetch('/api/agencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, plano }),
    })
    const json = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(json.error ?? 'Erro desconhecido'); return }
    setDone(true)
    onCreate({
      id: json.userId,
      email, nome, plano,
      role: 'agency',
      created_at: new Date().toISOString(),
      last_sign_in: null,
    })
  }

  function copiar(text: string, tipo: 'email' | 'senha') {
    navigator.clipboard.writeText(text)
    if (tipo === 'email') { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000) }
    else { setCopiedSenha(true); setTimeout(() => setCopiedSenha(false), 2000) }
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Nova agência</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {done ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 rounded-lg px-4 py-3">
                <Check size={15} />
                Acesso criado com sucesso!
              </div>
              <p className="text-xs text-muted-foreground">Envie as credenciais abaixo para a agência acessar a plataforma.</p>
              <div className="space-y-3">
                <div>
                  <p className={lbl}>E-mail</p>
                  <div className="flex gap-2">
                    <input readOnly value={email} className="flex-1 min-w-0 rounded-lg bg-muted border border-border px-3 py-2 text-sm text-muted-foreground truncate focus:outline-none" />
                    <button onClick={() => copiar(email, 'email')} className="shrink-0 px-3 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
                      {copiedEmail ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                </div>
                <div>
                  <p className={lbl}>Senha temporária</p>
                  <div className="flex gap-2">
                    <input readOnly value={senha} className="flex-1 min-w-0 rounded-lg bg-muted border border-border px-3 py-2 text-sm text-muted-foreground truncate focus:outline-none" />
                    <button onClick={() => copiar(senha, 'senha')} className="shrink-0 px-3 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
                      {copiedSenha ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">Link de acesso: <span className="text-foreground">centrodecomando-two.vercel.app/login</span></p>
              </div>
              <button onClick={onClose} className="w-full py-2 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mt-2">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {error && (
                <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3">{error}</div>
              )}
              <div>
                <label className={lbl}>Nome da agência <span className="text-destructive">*</span></label>
                <input value={nome} onChange={e => setNome(e.target.value)} className={inp} autoFocus placeholder="Ex: Agência Nova Era" />
              </div>
              <div>
                <label className={lbl}>E-mail do responsável <span className="text-destructive">*</span></label>
                <input value={email} onChange={e => setEmail(e.target.value)} className={inp} type="email" placeholder="contato@agencia.com" />
              </div>
              <div>
                <label className={lbl}>Senha temporária <span className="text-destructive">*</span></label>
                <input value={senha} onChange={e => setSenha(e.target.value)} className={inp} placeholder="Mín. 6 caracteres" />
                <p className="text-[11px] text-muted-foreground mt-1">A agência poderá alterar a senha após o primeiro acesso.</p>
              </div>
              <div>
                <label className={lbl}>Plano</label>
                <select value={plano} onChange={e => setPlano(e.target.value)} className={inp + ' cursor-pointer'}>
                  {PLANOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </>
          )}
        </div>

        {!done && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <Button
              size="sm"
              onClick={create}
              disabled={saving || !nome.trim() || !email.trim() || senha.length < 6}
              className="h-9 bg-primary hover:bg-primary/90 text-sm gap-1.5"
            >
              <Plus size={14} /> {saving ? 'Criando...' : 'Criar acesso'}
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgenciasPage() {
  const [agencies, setAgencies]   = useState<Agency[]>([])
  const [showNew, setShowNew]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/agencias')
      .then(r => r.json())
      .then(d => { setAgencies(d.agencies ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir a agência "${nome}"? Esta ação não pode ser desfeita.`)) return
    setDeleting(id)
    await fetch('/api/agencias', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: id }),
    })
    setAgencies(prev => prev.filter(a => a.id !== id))
    setDeleting(null)
  }

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 size={18} className="text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Agências cadastradas</p>
            <p className="text-xs text-muted-foreground">{agencies.length} {agencies.length === 1 ? 'agência' : 'agências'} com acesso à plataforma</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="h-9 bg-primary hover:bg-primary/90 text-sm gap-1.5">
          <Plus size={14} /> Nova agência
        </Button>
      </div>

      {/* List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">Carregando...</div>
          ) : agencies.length === 0 ? (
            <div className="px-5 py-16 text-center space-y-3">
              <Users size={32} className="text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhuma agência cadastrada ainda.</p>
              <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">
                Criar primeira agência
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {agencies.map(a => {
                const initials = a.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || a.email[0].toUpperCase()
                return (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors group">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.nome || '—'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Mail size={11} className="text-muted-foreground shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                      </div>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${planColor[a.plano] ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {a.plano}
                    </Badge>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 w-36">
                      <Clock size={11} />
                      <span>{a.last_sign_in ? fmt(a.last_sign_in) : 'Nunca acessou'}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        title="Redefinir senha"
                        onClick={() => {
                          const nova = prompt(`Nova senha para ${a.nome || a.email} (mín. 6 chars):`)
                          if (!nova || nova.length < 6) return
                          fetch('/api/agencias', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nome: a.nome, email: a.email, senha: nova, plano: a.plano }),
                          })
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <KeyRound size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id, a.nome)}
                        disabled={deleting === a.id}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showNew && (
        <NewAgencyPanel
          onClose={() => setShowNew(false)}
          onCreate={a => { setAgencies(prev => [...prev, a]); setShowNew(false) }}
        />
      )}
    </div>
  )
}
