'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Plus, Mail, Crown, X, Send, Loader2, Trash2,
  Pencil, Check, MapPin, Briefcase, Banknote, CalendarDays, Cake,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface Member {
  id: string
  nome: string
  email: string
  cargo: string | null
  endereco: string | null
  remuneracao: number | null
  data_entrada: string | null
  aniversario: string | null
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso + 'T00:00:00'))
}

function fmtBirthday(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long' }).format(new Date(iso + 'T00:00:00'))
}

function fmtCurrency(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ── Invite Modal ───────────────────────────────────────────────────────────────

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function send() {
    if (!email.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar convite')
      setSent(true)
      onInvited()
      setTimeout(onClose, 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar convite')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Convidar membro</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Um link de acesso será enviado por e-mail</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
          {sent ? (
            <div className="px-5 py-10 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <Send size={20} className="text-emerald-400" />
              </div>
              <p className="text-sm font-medium text-foreground">Convite enviado!</p>
              <p className="text-xs text-muted-foreground text-center">
                E-mail enviado para <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="nome@empresa.com"
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex items-center justify-between pt-1">
                <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
                <Button size="sm" onClick={send} disabled={!email.trim() || sending} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
                  {sending ? <><Loader2 size={12} className="animate-spin" /> Enviando…</> : <><Send size={12} /> Enviar convite</>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Member Modal ───────────────────────────────────────────────────────────────

function MemberModal({ member, onClose, onDelete, onSave, deleting }: {
  member: Member
  onClose: () => void
  onDelete: (m: Member) => void
  onSave: (id: string, fields: Partial<Member>) => Promise<void>
  deleting: boolean
}) {
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({
    cargo:        member.cargo        ?? '',
    endereco:     member.endereco     ?? '',
    remuneracao:  member.remuneracao != null ? String(member.remuneracao) : '',
    data_entrada: member.data_entrada ?? '',
    aniversario:  member.aniversario  ?? '',
  })

  function field(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function save() {
    setSaving(true)
    await onSave(member.id, {
      cargo:        form.cargo        || null,
      endereco:     form.endereco     || null,
      remuneracao:  form.remuneracao ? Number(form.remuneracao) : null,
      data_entrada: form.data_entrada || null,
      aniversario:  form.aniversario  || null,
    })
    setSaving(false)
    setEditing(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Ficha do membro</p>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Pencil size={12} /> Editar
                </button>
              ) : (
                <button
                  onClick={() => { setEditing(false); setForm({ cargo: member.cargo ?? '', endereco: member.endereco ?? '', remuneracao: member.remuneracao != null ? String(member.remuneracao) : '', data_entrada: member.data_entrada ?? '', aniversario: member.aniversario ?? '' }) }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Avatar + name */}
          <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-5">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                {initials(member.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{member.nome}</p>
              <div className="flex items-center gap-1 justify-center mt-0.5">
                <Mail size={10} className="text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{member.email}</p>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="px-5 pb-4 space-y-3">
            {editing ? (
              <>
                <Field icon={<Briefcase size={13} />} label="Cargo">
                  <input value={form.cargo} onChange={e => field('cargo', e.target.value)} placeholder="Ex: Designer" className={inp} />
                </Field>
                <Field icon={<MapPin size={13} />} label="Endereço">
                  <input value={form.endereco} onChange={e => field('endereco', e.target.value)} placeholder="Ex: São Paulo, SP" className={inp} />
                </Field>
                <Field icon={<Banknote size={13} />} label="Remuneração (R$)">
                  <input value={form.remuneracao} onChange={e => field('remuneracao', e.target.value)} type="number" placeholder="5000" className={inp} />
                </Field>
                <Field icon={<CalendarDays size={13} />} label="Entrada na empresa">
                  <input value={form.data_entrada} onChange={e => field('data_entrada', e.target.value)} type="date" className={inp} />
                </Field>
                <Field icon={<Cake size={13} />} label="Aniversário">
                  <input value={form.aniversario} onChange={e => field('aniversario', e.target.value)} type="date" className={inp} />
                </Field>
              </>
            ) : (
              <>
                <InfoRow icon={<Briefcase size={13} />} label="Cargo"           value={member.cargo ?? '—'} />
                <InfoRow icon={<MapPin size={13} />}    label="Endereço"        value={member.endereco ?? '—'} />
                <InfoRow icon={<Banknote size={13} />}  label="Remuneração"     value={fmtCurrency(member.remuneracao)} />
                <InfoRow icon={<CalendarDays size={13} />} label="Na empresa desde" value={fmtDate(member.data_entrada)} />
                <InfoRow icon={<Cake size={13} />}      label="Aniversário"     value={fmtBirthday(member.aniversario)} />
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button
              onClick={() => onDelete(member)}
              disabled={deleting}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Remover
            </button>
            {editing && (
              <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
                {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><Check size={12} /> Salvar</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-xs text-foreground mt-0.5 truncate">{value}</p>
      </div>
    </div>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <span>{icon}</span>{label}
      </label>
      {children}
    </div>
  )
}

// ── Org chart ──────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { user } = useAuth()
  const [members, setMembers]       = useState<Member[]>([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selected, setSelected]     = useState<Member | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const ownerName  = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'Você'
  const ownerEmail = user?.email ?? ''

  async function fetchMembers() {
    try {
      const res = await fetch('/api/team/members')
      if (!res.ok) return
      setMembers(await res.json())
    } finally {
      setLoading(false)
    }
  }

  async function deleteMember(member: Member) {
    setDeletingId(member.id)
    try {
      const res = await fetch(`/api/team/members/${member.id}`, { method: 'DELETE' })
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== member.id))
        setSelected(null)
      }
    } finally {
      setDeletingId(null)
    }
  }

  async function saveMember(id: string, fields: Partial<Member>) {
    await fetch(`/api/team/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m))
    setSelected(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }

  useEffect(() => { fetchMembers() }, [])

  return (
    <div className="flex flex-col items-center pt-10 pb-20 select-none">

      {/* Owner node */}
      <div className="flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-sm">
        <div className="relative">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-amber-500/20 text-amber-400 font-bold text-lg">
              {initials(ownerName)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-md">
            <Crown size={12} className="text-black" />
          </span>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">{ownerName}</p>
          <p className="text-[11px] text-amber-400 font-medium mt-0.5">Proprietário</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{ownerEmail}</p>
        </div>
      </div>

      {/* Vertical stem */}
      {(loading || members.length > 0) && (
        <div className="w-px h-10 bg-border" />
      )}

      {loading && <Loader2 size={18} className="animate-spin text-muted-foreground mt-2" />}

      {/* Members row */}
      {!loading && members.length > 0 && (
        <div className="relative flex">
          {members.map((m, i) => {
            const isOnly  = members.length === 1
            const isFirst = i === 0
            const isLast  = i === members.length - 1

            return (
              <div key={m.id} className="relative flex flex-col items-center px-5">
                {/* Horizontal connector */}
                {!isOnly && (
                  <div className={`absolute top-0 h-px bg-border ${
                    isFirst ? 'left-1/2 right-0' :
                    isLast  ? 'left-0 right-1/2' :
                    'left-0 right-0'
                  }`} />
                )}

                {/* Vertical stem */}
                <div className="w-px h-10 bg-border" />

                {/* Member node */}
                <button
                  onClick={() => setSelected(m)}
                  className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm transition-all duration-150"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                      {initials(m.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground leading-none">{m.nome.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.cargo ?? 'Membro'}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!loading && members.length === 0 && (
        <p className="text-xs text-muted-foreground mt-4">Nenhum membro ainda. Convide alguém abaixo.</p>
      )}

      {/* Invite button */}
      <div className="mt-14">
        <Button
          size="sm"
          onClick={() => setShowInvite(true)}
          className="h-9 bg-primary hover:bg-primary/90 text-xs gap-2 px-4"
        >
          <Plus size={14} /> Convidar membro
        </Button>
      </div>

      {/* Modals */}
      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={fetchMembers} />
      )}
      {selected && (
        <MemberModal
          member={selected}
          onClose={() => setSelected(null)}
          onDelete={deleteMember}
          onSave={saveMember}
          deleting={deletingId === selected.id}
        />
      )}
    </div>
  )
}
