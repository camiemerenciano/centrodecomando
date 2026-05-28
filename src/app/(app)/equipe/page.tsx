'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Mail, Crown, X, Loader2, Trash2,
  Pencil, Check, MapPin, Briefcase, Banknote, CalendarDays, Cake,
  UserPlus, Eye, EyeOff, ChevronDown, UserCog,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface OrgPerson {
  id: string
  nome: string
  cargo: string | null
  email: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Invite (manual) Modal ────────────────────────────────────────────────────

function AddManualModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm]         = useState({ nome: '', email: '', senha: '' })
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome || !form.email || !form.senha) { setError('Preencha todos os campos.'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/team/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar membro')
      onAdded(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao criar membro')
    } finally { setSaving(false) }
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Convidar para equipe</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Cria conta com acesso ao sistema</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <div className="px-5 py-5 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Nome completo</label>
              <input value={form.nome} onChange={e => field('nome', e.target.value)} placeholder="Ana Silva" className={inp} autoFocus />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">E-mail</label>
              <input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="ana@empresa.com" className={inp} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.senha}
                  onChange={e => field('senha', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && save()}
                  placeholder="Mínimo 8 caracteres"
                  className={inp + ' pr-10'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
              {saving ? <><Loader2 size={12} className="animate-spin" /> Criando…</> : <><UserPlus size={12} /> Convidar</>}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Org chart entry Modal ────────────────────────────────────────────────────

function AddOrgModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const supabase = createClient()
  const [form, setForm]     = useState({ nome: '', cargo: '', email: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { error: err } = await supabase.from('organograma_pessoas').insert({
        user_id: user.id,
        nome:    form.nome.trim(),
        cargo:   form.cargo.trim() || null,
        email:   form.email.trim() || null,
      })
      if (err) throw new Error(err.message)
      onAdded(); onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Cadastro de organograma</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Adiciona ao organograma sem criar conta</p>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
          </div>
          <div className="px-5 py-5 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Nome completo <span className="text-red-400">*</span></label>
              <input value={form.nome} onChange={e => field('nome', e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Carlos Souza" className={inp} autoFocus />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Cargo</label>
              <input value={form.cargo} onChange={e => field('cargo', e.target.value)} placeholder="Ex: Designer" className={inp} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">E-mail <span className="text-muted-foreground font-normal normal-case">(opcional)</span></label>
              <input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="carlos@empresa.com" className={inp} />
            </div>
            {error && <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
              {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><UserCog size={12} /> Adicionar</>}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Org Person detail Modal ──────────────────────────────────────────────────

function OrgPersonModal({ person, onClose, onDelete, onSave, deleting }: {
  person: OrgPerson
  onClose: () => void
  onDelete: (p: OrgPerson) => void
  onSave: (id: string, fields: Partial<OrgPerson>) => Promise<void>
  deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ nome: person.nome, cargo: person.cargo ?? '', email: person.email ?? '' })

  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    await onSave(person.id, { nome: form.nome || person.nome, cargo: form.cargo || null, email: form.email || null })
    setSaving(false); setEditing(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Organograma</p>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Pencil size={12} /> Editar
                </button>
              ) : (
                <button onClick={() => { setEditing(false); setForm({ nome: person.nome, cargo: person.cargo ?? '', email: person.email ?? '' }) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Cancelar
                </button>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><X size={16} /></button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-5">
            <Avatar className="w-16 h-16">
              <AvatarFallback className="bg-muted text-muted-foreground font-bold text-lg">
                {initials(person.nome)}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">{person.nome}</p>
              <span className="inline-block text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 mt-1">Organograma</span>
            </div>
          </div>

          <div className="px-5 pb-4 space-y-3">
            {editing ? (
              <>
                <Field icon={<Briefcase size={13} />} label="Nome">
                  <input value={form.nome} onChange={e => field('nome', e.target.value)} className={inp} />
                </Field>
                <Field icon={<Briefcase size={13} />} label="Cargo">
                  <input value={form.cargo} onChange={e => field('cargo', e.target.value)} placeholder="Ex: Designer" className={inp} />
                </Field>
                <Field icon={<Mail size={13} />} label="E-mail">
                  <input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="opcional" className={inp} />
                </Field>
              </>
            ) : (
              <>
                <InfoRow icon={<Briefcase size={13} />} label="Cargo" value={person.cargo ?? '—'} />
                {person.email && <InfoRow icon={<Mail size={13} />} label="E-mail" value={person.email} />}
              </>
            )}
          </div>

          <div className="flex items-center justify-between px-5 py-4 border-t border-border">
            <button
              onClick={() => onDelete(person)}
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

// ─── Member detail Modal ──────────────────────────────────────────────────────

function MemberModal({ member, onClose, onDelete, onSave, deleting }: {
  member: Member
  onClose: () => void
  onDelete: (m: Member) => void
  onSave: (id: string, fields: Partial<Member>) => Promise<void>
  deleting: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({
    cargo:        member.cargo        ?? '',
    endereco:     member.endereco     ?? '',
    remuneracao:  member.remuneracao != null ? String(member.remuneracao) : '',
    data_entrada: member.data_entrada ?? '',
    aniversario:  member.aniversario  ?? '',
  })

  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    setSaving(true)
    await onSave(member.id, {
      cargo:        form.cargo        || null,
      endereco:     form.endereco     || null,
      remuneracao:  form.remuneracao ? Number(form.remuneracao) : null,
      data_entrada: form.data_entrada || null,
      aniversario:  form.aniversario  || null,
    })
    setSaving(false); setEditing(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">Ficha do membro</p>
            <div className="flex items-center gap-2">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
                  <Pencil size={12} /> Editar
                </button>
              ) : (
                <button
                  onClick={() => { setEditing(false); setForm({ cargo: member.cargo ?? '', endereco: member.endereco ?? '', remuneracao: member.remuneracao != null ? String(member.remuneracao) : '', data_entrada: member.data_entrada ?? '', aniversario: member.aniversario ?? '' }) }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >Cancelar</button>
              )}
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><X size={16} /></button>
            </div>
          </div>

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
                <InfoRow icon={<Briefcase size={13} />} label="Cargo"            value={member.cargo ?? '—'} />
                <InfoRow icon={<MapPin size={13} />}    label="Endereço"         value={member.endereco ?? '—'} />
                <InfoRow icon={<Banknote size={13} />}  label="Remuneração"      value={fmtCurrency(member.remuneracao)} />
                <InfoRow icon={<CalendarDays size={13} />} label="Na empresa desde" value={fmtDate(member.data_entrada)} />
                <InfoRow icon={<Cake size={13} />}      label="Aniversário"      value={fmtBirthday(member.aniversario)} />
              </>
            )}
          </div>

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

// ─── Shared sub-components ────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { user }  = useAuth()
  const supabase  = createClient()

  const [members, setMembers]           = useState<Member[]>([])
  const [orgPeople, setOrgPeople]       = useState<OrgPerson[]>([])
  const [loading, setLoading]           = useState(true)
  const [showMenu, setShowMenu]         = useState(false)
  const [showManual, setShowManual]     = useState(false)
  const [showOrg, setShowOrg]           = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedOrg, setSelectedOrg]   = useState<OrgPerson | null>(null)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const ownerName  = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'Você'
  const ownerEmail = user?.email ?? ''

  async function fetchAll() {
    const [membersRes, orgRes] = await Promise.all([
      fetch('/api/team/members'),
      supabase.from('organograma_pessoas').select('id, nome, cargo, email').order('created_at', { ascending: true }),
    ])
    if (membersRes.ok) setMembers(await membersRes.json())
    setOrgPeople(orgRes.data ?? [])
    setLoading(false)
  }

  async function deleteMember(member: Member) {
    setDeletingId(member.id)
    try {
      const res = await fetch(`/api/team/members/${member.id}`, { method: 'DELETE' })
      if (res.ok) { setMembers(prev => prev.filter(m => m.id !== member.id)); setSelectedMember(null) }
    } finally { setDeletingId(null) }
  }

  async function saveMember(id: string, fields: Partial<Member>) {
    await fetch(`/api/team/members/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) })
    setMembers(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m))
    setSelectedMember(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }

  async function deleteOrgPerson(person: OrgPerson) {
    setDeletingId(person.id)
    try {
      await supabase.from('organograma_pessoas').delete().eq('id', person.id)
      setOrgPeople(prev => prev.filter(p => p.id !== person.id))
      setSelectedOrg(null)
    } finally { setDeletingId(null) }
  }

  async function saveOrgPerson(id: string, fields: Partial<OrgPerson>) {
    await supabase.from('organograma_pessoas').update(fields).eq('id', id)
    setOrgPeople(prev => prev.map(p => p.id === id ? { ...p, ...fields } : p))
    setSelectedOrg(prev => prev?.id === id ? { ...prev, ...fields } : prev)
  }

  useEffect(() => { fetchAll() }, [])

  const allNodes = members.length + orgPeople.length
  const hasNodes = allNodes > 0

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
      {(loading || hasNodes) && <div className="w-px h-10 bg-border" />}
      {loading && <Loader2 size={18} className="animate-spin text-muted-foreground mt-2" />}

      {/* All nodes row */}
      {!loading && hasNodes && (
        <div className="relative flex flex-wrap justify-center">
          {/* Team members */}
          {members.map((m, i) => {
            const total   = allNodes
            const idx     = i
            const isOnly  = total === 1
            const isFirst = idx === 0
            const isLast  = idx === total - 1
            return (
              <div key={m.id} className="relative flex flex-col items-center px-5">
                {!isOnly && (
                  <div className={`absolute top-0 h-px bg-border ${isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'}`} />
                )}
                <div className="w-px h-10 bg-border" />
                <button
                  onClick={() => setSelectedMember(m)}
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

          {/* Org-only people */}
          {orgPeople.map((p, i) => {
            const total   = allNodes
            const idx     = members.length + i
            const isOnly  = total === 1
            const isFirst = idx === 0
            const isLast  = idx === total - 1
            return (
              <div key={p.id} className="relative flex flex-col items-center px-5">
                {!isOnly && (
                  <div className={`absolute top-0 h-px bg-border ${isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'}`} />
                )}
                <div className="w-px h-10 bg-border" />
                <button
                  onClick={() => setSelectedOrg(p)}
                  className="flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-border bg-card hover:border-primary/30 hover:bg-muted/30 hover:shadow-sm transition-all duration-150"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                      {initials(p.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-foreground leading-none">{p.nome.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{p.cargo ?? 'Organograma'}</p>
                  </div>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !hasNodes && (
        <p className="text-xs text-muted-foreground mt-4">Nenhum membro ainda. Adicione alguém abaixo.</p>
      )}

      {/* Add button with dropdown */}
      <div className="mt-14 relative">
        <div className="flex items-center gap-0 rounded-lg overflow-hidden border border-primary/40">
          <Button
            size="sm"
            onClick={() => { setShowManual(true); setShowMenu(false) }}
            className="h-9 bg-primary hover:bg-primary/90 text-xs gap-2 px-4 rounded-none border-0"
          >
            <UserPlus size={14} /> Adicionar membro
          </Button>
          <div className="w-px h-9 bg-primary/40" />
          <button
            onClick={() => setShowMenu(v => !v)}
            className="h-9 px-2.5 bg-primary hover:bg-primary/90 text-white transition-colors flex items-center"
          >
            <ChevronDown size={14} />
          </button>
        </div>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full mt-1 left-0 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-60 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => { setShowManual(true); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-foreground hover:bg-muted transition-colors text-left"
              >
                <UserPlus size={14} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium">Convidar para equipe</p>
                  <p className="text-muted-foreground">Cria conta com acesso ao sistema</p>
                </div>
              </button>
              <div className="border-t border-border" />
              <button
                onClick={() => { setShowOrg(true); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-foreground hover:bg-muted transition-colors text-left"
              >
                <UserCog size={14} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium">Cadastro de organograma</p>
                  <p className="text-muted-foreground">Adiciona ao organograma sem conta</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {showManual && <AddManualModal onClose={() => setShowManual(false)} onAdded={fetchAll} />}
      {showOrg    && <AddOrgModal   onClose={() => setShowOrg(false)}    onAdded={fetchAll} />}
      {selectedMember && (
        <MemberModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onDelete={deleteMember}
          onSave={saveMember}
          deleting={deletingId === selectedMember.id}
        />
      )}
      {selectedOrg && (
        <OrgPersonModal
          person={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onDelete={deleteOrgPerson}
          onSave={saveOrgPerson}
          deleting={deletingId === selectedOrg.id}
        />
      )}
    </div>
  )
}
