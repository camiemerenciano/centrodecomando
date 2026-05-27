'use client'

import { useState, useEffect, useRef } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Plus, Mail, Crown, X, Send, Loader2, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface Member {
  id: string
  name: string
  email: string
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
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
              {error && (
                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
              )}
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

// ── Member popover ─────────────────────────────────────────────────────────────

function MemberPopover({ member, onClose, onDelete, deleting }: {
  member: Member
  onClose: () => void
  onDelete: (m: Member) => void
  deleting: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 z-30 bg-card border border-border rounded-2xl shadow-2xl w-56 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Arrow */}
      <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-card border-l border-t border-border rotate-45" />

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Membro</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      <div className="flex flex-col items-center gap-2.5 px-4 pb-4">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-primary/20 text-primary font-bold text-base">
            {initials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center w-full">
          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
          <div className="flex items-center gap-1 justify-center mt-1">
            <Mail size={10} className="text-muted-foreground shrink-0" />
            <p className="text-[11px] text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-3">
        <button
          onClick={() => onDelete(member)}
          disabled={deleting}
          className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg py-2 transition-colors disabled:opacity-50"
        >
          {deleting
            ? <><Loader2 size={12} className="animate-spin" /> Removendo…</>
            : <><Trash2 size={12} /> Remover da equipe</>
          }
        </button>
      </div>
    </div>
  )
}

// ── Org chart ──────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { user } = useAuth()
  const [members, setMembers]       = useState<Member[]>([])
  const [loading, setLoading]       = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [selected, setSelected]     = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const ownerName  = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'Você'
  const ownerEmail = user?.email ?? ''

  async function fetchMembers() {
    try {
      const res = await fetch('/api/team/members')
      if (!res.ok) return
      const data = await res.json() as { id: string; nome: string; email: string }[]
      setMembers(data.map(m => ({ id: m.id, name: m.nome, email: m.email })))
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

  useEffect(() => { fetchMembers() }, [])

  return (
    <div className="flex flex-col items-center pt-10 pb-20 select-none">

      {/* ── Owner node ── */}
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

      {/* ── Vertical stem owner → members ── */}
      {(loading || members.length > 0) && (
        <div className="w-px h-10 bg-border" />
      )}

      {/* ── Loading ── */}
      {loading && (
        <Loader2 size={18} className="animate-spin text-muted-foreground mt-2" />
      )}

      {/* ── Members row ── */}
      {!loading && members.length > 0 && (
        <div className="relative flex">
          {members.map((m, i) => {
            const isOnly  = members.length === 1
            const isFirst = i === 0
            const isLast  = i === members.length - 1
            const isSel   = selected === m.id

            return (
              <div key={m.id} className="relative flex flex-col items-center px-5">
                {/* Horizontal connector bar */}
                {!isOnly && (
                  <div className={`absolute top-0 h-px bg-border ${
                    isFirst ? 'left-1/2 right-0' :
                    isLast  ? 'left-0 right-1/2' :
                    'left-0 right-0'
                  }`} />
                )}

                {/* Vertical stem to node */}
                <div className="w-px h-10 bg-border" />

                {/* Member node */}
                <button
                  onClick={() => setSelected(isSel ? null : m.id)}
                  className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-150 ${
                    isSel
                      ? 'bg-primary/10 border-primary/40 shadow-md shadow-primary/10'
                      : 'bg-card border-border hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm'
                  }`}
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold text-sm">
                      {initials(m.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground leading-none">{m.name.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Membro</p>
                  </div>
                </button>

                {/* Detail popover */}
                {isSel && (
                  <MemberPopover
                    member={m}
                    onClose={() => setSelected(null)}
                    onDelete={deleteMember}
                    deleting={deletingId === m.id}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && members.length === 0 && (
        <p className="text-xs text-muted-foreground mt-4">Nenhum membro ainda. Convide alguém abaixo.</p>
      )}

      {/* ── Invite button ── */}
      <div className="mt-14">
        <Button
          size="sm"
          onClick={() => setShowInvite(true)}
          className="h-9 bg-primary hover:bg-primary/90 text-xs gap-2 px-4"
        >
          <Plus size={14} /> Convidar membro
        </Button>
      </div>

      {showInvite && (
        <InviteModal onClose={() => setShowInvite(false)} onInvited={fetchMembers} />
      )}
    </div>
  )
}
