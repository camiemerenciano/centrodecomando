'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Mail, Shield, User, Crown, CheckSquare, Users, X, Send, Briefcase, Calendar, ChevronRight, Pencil, Trash2, Save } from 'lucide-react'

type Role = 'owner' | 'admin' | 'member'

interface Member {
  id: number; name: string; email: string; role: Role
  specialty: string; clients: number; tasks: number
  joined: string; status: 'online' | 'away' | 'offline'
  initials: string
}

const members: Member[] = []

const roleConfig: Record<Role, { label: string; cls: string; icon: React.ReactNode }> = {
  owner:  { label: 'Proprietário', cls: 'bg-amber-500/15 text-amber-400 border-0',  icon: <Crown size={10} /> },
  admin:  { label: 'Admin',        cls: 'bg-orange-500/15 text-orange-400 border-0', icon: <Shield size={10} /> },
  member: { label: 'Membro',       cls: 'bg-muted text-muted-foreground border-0',  icon: <User size={10} /> },
}

const statusConfig = {
  online:  { label: 'Online',  cls: 'bg-emerald-400' },
  away:    { label: 'Ausente', cls: 'bg-amber-400' },
  offline: { label: 'Offline', cls: 'bg-muted-foreground' },
}

function MemberPanel({
  member,
  onClose,
  onSave,
  onRemove,
}: {
  member: Member
  onClose: () => void
  onSave: (m: Member) => void
  onRemove: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState<Member>(member)

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1'

  function save() { onSave(form); setEditing(false) }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">{member.initials}</AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusConfig[member.status].cls}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{member.name}</p>
              <p className="text-xs text-muted-foreground">{member.specialty}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!editing && (
              <button onClick={() => setEditing(true)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Pencil size={13} />
              </button>
            )}
            {member.role !== 'owner' && (
              <button
                onClick={() => { if (confirm('Remover este membro?')) onRemove(member.id) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] flex items-center gap-1 ${roleConfig[form.role].cls}`}>
              {roleConfig[form.role].icon} {roleConfig[form.role].label}
            </Badge>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[form.status].cls}`} />
              <span className="text-xs text-muted-foreground">{statusConfig[form.status].label}</span>
            </div>
          </div>

          {!editing ? (
            <>
              {/* Contato */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Contato</p>
                <div className="flex items-center gap-2.5">
                  <Mail size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">E-mail</p>
                    <p className="text-xs text-foreground mt-0.5">{form.email}</p>
                  </div>
                </div>
              </section>

              {/* Função */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Função</p>
                <div className="flex items-center gap-2.5">
                  <Briefcase size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Especialidade</p>
                    <p className="text-xs text-foreground mt-0.5">{form.specialty}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Calendar size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Entrou em</p>
                    <p className="text-xs text-foreground mt-0.5">{form.joined}</p>
                  </div>
                </div>
              </section>

              {/* Stats */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Desempenho</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/40 border border-border p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{form.clients}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Clientes</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 border border-border p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{form.tasks}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Tarefas abertas</p>
                  </div>
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações</p>
                <div><label className={lbl}>Nome</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inp} /></div>
                <div><label className={lbl}>E-mail</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inp} /></div>
                <div><label className={lbl}>Especialidade</label><input value={form.specialty} onChange={e => setForm(p => ({ ...p, specialty: e.target.value }))} className={inp} /></div>
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Acesso</p>
                <div>
                  <label className={lbl}>Função</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['member', 'admin', 'owner'] as Role[]).map(r => (
                      <button
                        key={r}
                        disabled={member.role === 'owner' && r !== 'owner'}
                        onClick={() => setForm(p => ({ ...p, role: r }))}
                        className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs transition-all ${
                          form.role === r
                            ? 'bg-primary/15 border-primary/40 text-primary'
                            : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed'
                        }`}
                      >
                        {roleConfig[r].icon}
                        <span className="font-medium text-[10px]">{roleConfig[r].label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(p => ({ ...p, status: e.target.value as Member['status'] }))}
                    className={inp + ' cursor-pointer'}
                  >
                    <option value="online">Online</option>
                    <option value="away">Ausente</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer (edit mode) */}
        {editing && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
            <button onClick={() => { setForm(member); setEditing(false) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancelar
            </button>
            <Button size="sm" onClick={save} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
              <Save size={12} /> Salvar alterações
            </Button>
          </div>
        )}
      </div>
    </>
  )
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail]   = useState('')
  const [role, setRole]     = useState<Role>('member')
  const [sent, setSent]     = useState(false)

  function send() {
    if (!email.trim()) return
    setSent(true)
    setTimeout(onClose, 1800)
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
              <p className="text-xs text-muted-foreground mt-0.5">Um link de convite será enviado por e-mail</p>
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
              <p className="text-xs text-muted-foreground text-center">Um e-mail foi enviado para <span className="text-foreground font-medium">{email}</span></p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  E-mail
                </label>
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

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">
                  Função
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['member', 'admin'] as Role[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        role === r
                          ? 'bg-primary/15 border-primary/40 text-primary'
                          : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {roleConfig[r].icon}
                      <span className="font-medium">{roleConfig[r].label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {role === 'admin' ? 'Admin pode gerenciar membros e clientes.' : 'Membro acessa tarefas e projetos atribuídos.'}
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
                <Button
                  size="sm"
                  onClick={send}
                  disabled={!email.trim()}
                  className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5"
                >
                  <Send size={12} /> Enviar convite
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
  const [teamMembers, setTeamMembers] = useState(members)
  const [selected, setSelected]       = useState<Member | null>(null)

  function handleSave(updated: Member) {
    setTeamMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
    setSelected(updated)
  }

  function handleRemove(id: number) {
    setTeamMembers(prev => prev.filter(m => m.id !== id))
    setSelected(null)
  }

  return (
    <div className="space-y-5 max-w-[1200px]">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 flex items-center justify-center">
              <Users size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de membros</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center">
              <CheckSquare size={18} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tarefas em aberto</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.reduce((s, m) => s + m.tasks, 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-400/10 flex items-center justify-center">
              <Users size={18} className="text-sky-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Clientes atribuídos</p>
              <p className="text-2xl font-bold text-foreground">{teamMembers.reduce((s, m) => s + m.clients, 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-xs w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
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
        {teamMembers.map(member => (
          <Card key={member.id} onClick={() => setSelected(member)} className="bg-card border-border hover:border-primary/25 transition-all group cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className="w-11 h-11">
                    <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${statusConfig[member.status].cls}`}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{member.name}</p>
                    <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 ${roleConfig[member.role].cls}`}>
                      {roleConfig[member.role].icon}
                      {roleConfig[member.role].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{member.specialty}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Mail size={10} className="text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-8 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{member.clients}</p>
                    <p className="text-[10px] text-muted-foreground">Clientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">{member.tasks}</p>
                    <p className="text-[10px] text-muted-foreground">Tarefas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-foreground">{member.joined}</p>
                    <p className="text-[10px] text-muted-foreground">Entrou em</p>
                  </div>
                </div>

                {/* Status & actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[member.status].cls}`} />
                    <span className="text-[10px] text-muted-foreground">{statusConfig[member.status].label}</span>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

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

      {selected && (
        <MemberPanel
          member={selected}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onRemove={handleRemove}
        />
      )}
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
