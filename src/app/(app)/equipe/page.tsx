'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Mail, Shield, User, Crown, CheckSquare, Users, X, Send, Loader2, Trash2 } from 'lucide-react'

type Role = 'owner' | 'admin' | 'member'

interface Member {
  id: string
  name: string
  email: string
  role: Role
}

const roleConfig: Record<Role, { label: string; cls: string; icon: React.ReactNode }> = {
  owner:  { label: 'Proprietário', cls: 'bg-amber-500/15 text-amber-400 border-0',  icon: <Crown size={10} /> },
  admin:  { label: 'Admin',        cls: 'bg-orange-500/15 text-orange-400 border-0', icon: <Shield size={10} /> },
  member: { label: 'Membro',       cls: 'bg-muted text-muted-foreground border-0',  icon: <User size={10} /> },
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}


function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const [email, setEmail]   = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

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

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

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
              <p className="text-xs text-muted-foreground text-center">E-mail enviado para <span className="text-foreground font-medium">{email}</span></p>
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
                  className={inp}
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

export default function EquipePage() {
  const [showInvite, setShowInvite]   = useState(false)
  const [members, setMembers]         = useState<Member[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [deletingId, setDeletingId]   = useState<string | null>(null)

  async function fetchMembers() {
    try {
      const res = await fetch('/api/team/members')
      if (!res.ok) return
      const data = await res.json() as { id: string; nome: string; email: string }[]
      setMembers(data.map(m => ({ id: m.id, name: m.nome, email: m.email, role: 'member' as Role })))
    } finally {
      setLoading(false)
    }
  }

  async function deleteMember(member: Member) {
    if (!confirm(`Excluir ${member.name} (${member.email})? Todos os dados da conta serão apagados.`)) return
    setDeletingId(member.id)
    try {
      const res = await fetch(`/api/team/members/${member.id}`, { method: 'DELETE' })
      if (res.ok) setMembers(prev => prev.filter(m => m.id !== member.id))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => { fetchMembers() }, [])

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
              <Users size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de membros</p>
              <p className="text-2xl font-bold text-foreground">{members.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
              <CheckSquare size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Convites enviados</p>
              <p className="text-2xl font-bold text-foreground">—</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar membros..."
            className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)} className="h-8 bg-primary hover:bg-primary/90 text-xs">
          <Plus size={14} /> Convidar membro
        </Button>
      </div>

      {/* Members grid */}
      <div className="grid grid-cols-1 gap-4">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && filtered.map(member => (
          <Card key={member.id} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-11 h-11 shrink-0">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground">{member.name}</p>
                    <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 ${roleConfig[member.role].cls}`}>
                      {roleConfig[member.role].icon}
                      {roleConfig[member.role].label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Mail size={10} className="text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMember(member)}
                  disabled={deletingId === member.id}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40"
                >
                  {deletingId === member.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />
                  }
                </button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && members.length === 0 && (
          <div className="text-center py-12 text-sm text-muted-foreground">
            Nenhum membro ainda. Convide alguém para começar.
          </div>
        )}

        {/* Invite card */}
        <Card onClick={() => setShowInvite(true)} className="bg-card border-border border-dashed hover:border-primary/40 cursor-pointer transition-all">
          <CardContent className="p-5 flex items-center justify-center gap-3">
            <div className="w-11 h-11 rounded-full border-2 border-dashed border-border flex items-center justify-center">
              <Plus size={16} className="text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Convidar novo membro</p>
              <p className="text-xs text-muted-foreground/60">Envie um convite por e-mail</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onInvited={fetchMembers}
        />
      )}
    </div>
  )
}
