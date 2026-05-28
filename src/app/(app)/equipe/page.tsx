'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Mail, Crown, X, Loader2, Trash2, Pencil, Check,
  MapPin, Briefcase, Banknote, CalendarDays, Cake,
  UserPlus, Eye, EyeOff, ChevronDown, UserCog, Phone,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string; nome: string; email: string
  cargo: string | null; telefone: string | null; endereco: string | null
  remuneracao: number | null; data_entrada: string | null; aniversario: string | null
}

interface OrgPerson {
  id: string; nome: string
  cargo: string | null; telefone: string | null; email: string | null
  endereco: string | null; remuneracao: number | null
  data_entrada: string | null; aniversario: string | null
  parent_id: string | null
}

type TreeNode = {
  kind: 'member' | 'org'
  id: string; nome: string; cargo: string | null
  data: Member | OrgPerson
  children: TreeNode[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

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

// ─── Tree building ────────────────────────────────────────────────────────────

function buildTree(members: Member[], orgPeople: OrgPerson[]): TreeNode[] {
  const memberNodes = new Map<string, TreeNode>()
  members.forEach(m => memberNodes.set(m.id, { kind: 'member', id: m.id, nome: m.nome, cargo: m.cargo, data: m, children: [] }))

  const orgNodes = new Map<string, TreeNode>()
  orgPeople.forEach(p => orgNodes.set(p.id, { kind: 'org', id: p.id, nome: p.nome, cargo: p.cargo, data: p, children: [] }))

  const roots: TreeNode[] = [...memberNodes.values()]

  orgPeople.forEach(p => {
    const node = orgNodes.get(p.id)!
    if (p.parent_id) {
      const parent = orgNodes.get(p.parent_id) ?? memberNodes.get(p.parent_id)
      if (parent) { parent.children.push(node); return }
    }
    roots.push(node)
  })

  return roots
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function Modal({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
          {children}
        </div>
      </div>
    </>
  )
}

function ModalHeader({ title, sub, onClose, extra }: { title: string; sub?: string; onClose: () => void; extra?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><X size={16} /></button>
      </div>
    </div>
  )
}

function ModalFooter({ onClose, deleteAction, deleting, children }: {
  onClose: () => void; deleteAction?: () => void; deleting?: boolean; children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
      {deleteAction ? (
        <button onClick={deleteAction} disabled={deleting} className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
          {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Remover
        </button>
      ) : (
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
      )}
      {children ?? <div />}
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground leading-none">{label}</p>
        <p className="text-xs text-foreground mt-0.5 break-words">{value}</p>
      </div>
    </div>
  )
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1">
        <span>{icon}</span>{label}
      </label>
      {children}
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{msg}</p>
}

// ─── Profile form (shared between both modal types) ───────────────────────────

type ProfileForm = {
  cargo: string; telefone: string; email: string
  endereco: string; remuneracao: string; data_entrada: string; aniversario: string
}

function ProfileFields({ form, onChange, inp }: {
  form: ProfileForm
  onChange: (k: keyof ProfileForm, v: string) => void
  inp: string
}) {
  return (
    <>
      <Field icon={<Briefcase size={13} />} label="Função / Cargo">
        <input value={form.cargo} onChange={e => onChange('cargo', e.target.value)} placeholder="Ex: Designer" className={inp} />
      </Field>
      <Field icon={<Phone size={13} />} label="Telefone">
        <input value={form.telefone} onChange={e => onChange('telefone', e.target.value)} placeholder="(11) 99999-9999" className={inp} />
      </Field>
      <Field icon={<Mail size={13} />} label="E-mail">
        <input type="email" value={form.email} onChange={e => onChange('email', e.target.value)} placeholder="nome@empresa.com" className={inp} />
      </Field>
      <Field icon={<MapPin size={13} />} label="Endereço">
        <input value={form.endereco} onChange={e => onChange('endereco', e.target.value)} placeholder="Ex: São Paulo, SP" className={inp} />
      </Field>
      <Field icon={<CalendarDays size={13} />} label="Início na empresa">
        <input type="date" value={form.data_entrada} onChange={e => onChange('data_entrada', e.target.value)} className={inp} />
      </Field>
      <Field icon={<Cake size={13} />} label="Aniversário">
        <input type="date" value={form.aniversario} onChange={e => onChange('aniversario', e.target.value)} className={inp} />
      </Field>
      <Field icon={<Banknote size={13} />} label="Remuneração (R$)">
        <input type="number" value={form.remuneracao} onChange={e => onChange('remuneracao', e.target.value)} placeholder="5000" className={inp} />
      </Field>
    </>
  )
}

function ProfileView({ cargo, telefone, email, endereco, data_entrada, aniversario, remuneracao }: {
  cargo: string | null; telefone: string | null; email: string | null
  endereco: string | null; data_entrada: string | null; aniversario: string | null
  remuneracao: number | null
}) {
  const hasAny = !!(cargo || telefone || email || endereco || data_entrada || aniversario || remuneracao)
  return (
    <div className="space-y-2.5">
      {cargo        && <InfoRow icon={<Briefcase size={13} />}    label="Função / Cargo"    value={cargo} />}
      {telefone     && <InfoRow icon={<Phone size={13} />}        label="Telefone"           value={telefone} />}
      {email        && <InfoRow icon={<Mail size={13} />}         label="E-mail"             value={email} />}
      {endereco     && <InfoRow icon={<MapPin size={13} />}       label="Endereço"           value={endereco} />}
      {data_entrada && <InfoRow icon={<CalendarDays size={13} />} label="Início na empresa"  value={fmtDate(data_entrada)} />}
      {aniversario  && <InfoRow icon={<Cake size={13} />}         label="Aniversário"        value={fmtBirthday(aniversario)} />}
      {remuneracao != null && <InfoRow icon={<Banknote size={13} />} label="Remuneração"    value={fmtCurrency(remuneracao)} />}
      {!hasAny && <p className="text-xs text-muted-foreground text-center py-3">Nenhuma informação preenchida. Clique em Editar.</p>}
    </div>
  )
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
      const res  = await fetch('/api/team/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar membro')
      onAdded(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setSaving(false) }
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <Modal>
      <ModalHeader title="Convidar membro" sub="Cria conta com email e senha" onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <Field icon={<UserPlus size={13} />} label="Nome completo">
          <input value={form.nome} onChange={e => field('nome', e.target.value)} placeholder="Ana Silva" className={inp} autoFocus />
        </Field>
        <Field icon={<Mail size={13} />} label="E-mail">
          <input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="ana@empresa.com" className={inp} />
        </Field>
        <Field icon={<Briefcase size={13} />} label="Senha">
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={form.senha} onChange={e => field('senha', e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Mínimo 8 caracteres" className={inp + ' pr-10'} />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </Field>
        {error && <ErrorMsg msg={error} />}
      </div>
      <ModalFooter onClose={onClose}>
        <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
          {saving ? <><Loader2 size={12} className="animate-spin" /> Criando…</> : <><UserPlus size={12} /> Convidar</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ─── Add org person Modal ─────────────────────────────────────────────────────

function AddOrgModal({ onClose, onAdded, members, orgPeople }: {
  onClose: () => void; onAdded: () => void; members: Member[]; orgPeople: OrgPerson[]
}) {
  const supabase = createClient()
  const [nome, setNome]         = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const selCls = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all appearance-none cursor-pointer'

  async function save() {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { error: err } = await supabase.from('organograma_pessoas').insert({ user_id: user.id, nome: nome.trim(), parent_id: parentId || null })
      if (err) throw new Error(err.message)
      onAdded(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setSaving(false) }
  }

  return (
    <Modal>
      <ModalHeader title="Adicionar membro" sub="Sem email e senha" onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <Field icon={<UserCog size={13} />} label={<>Nome completo <span className="text-red-400">*</span></>}>
          <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Carlos Souza" className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" autoFocus />
        </Field>
        <Field icon={<ChevronDown size={13} />} label="Reporta a">
          <select value={parentId} onChange={e => setParentId(e.target.value)} className={selCls}>
            <option value="">Proprietário</option>
            {members.length > 0 && (
              <optgroup label="Equipe (com acesso)">
                {members.map(m => <option key={m.id} value={m.id}>{m.nome}{m.cargo ? ` — ${m.cargo}` : ''}</option>)}
              </optgroup>
            )}
            {orgPeople.length > 0 && (
              <optgroup label="Organograma">
                {orgPeople.map(p => <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
              </optgroup>
            )}
          </select>
        </Field>
        {error && <ErrorMsg msg={error} />}
        <p className="text-[10px] text-muted-foreground">Demais informações podem ser adicionadas após salvar.</p>
      </div>
      <ModalFooter onClose={onClose}>
        <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
          {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><UserCog size={12} /> Adicionar</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ─── Member detail Modal ──────────────────────────────────────────────────────

function MemberModal({ member, onClose, onDelete, onSave, deleting }: {
  member: Member; onClose: () => void
  onDelete: (m: Member) => void
  onSave: (id: string, fields: Partial<Member>) => Promise<void>
  deleting: boolean
}) {
  const hasData = !!(member.cargo || member.telefone || member.endereco || member.data_entrada || member.aniversario || member.remuneracao)
  const [editing, setEditing] = useState(!hasData)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState<ProfileForm>({
    cargo:        member.cargo        ?? '',
    telefone:     member.telefone     ?? '',
    email:        member.email        ?? '',
    endereco:     member.endereco     ?? '',
    remuneracao:  member.remuneracao != null ? String(member.remuneracao) : '',
    data_entrada: member.data_entrada ?? '',
    aniversario:  member.aniversario  ?? '',
  })

  function onChange(k: keyof ProfileForm, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function cancelEdit() {
    setEditing(false)
    setForm({ cargo: member.cargo ?? '', telefone: member.telefone ?? '', email: member.email ?? '', endereco: member.endereco ?? '', remuneracao: member.remuneracao != null ? String(member.remuneracao) : '', data_entrada: member.data_entrada ?? '', aniversario: member.aniversario ?? '' })
  }

  async function save() {
    setSaving(true)
    await onSave(member.id, {
      cargo:        form.cargo        || null,
      telefone:     form.telefone     || null,
      endereco:     form.endereco     || null,
      remuneracao:  form.remuneracao  ? Number(form.remuneracao) : null,
      data_entrada: form.data_entrada || null,
      aniversario:  form.aniversario  || null,
    })
    setSaving(false); setEditing(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'

  return (
    <Modal>
      <ModalHeader
        title="Ficha do membro"
        onClose={onClose}
        extra={!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Pencil size={12} /> Editar</button>
          : <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
        }
      />

      <div className="flex flex-col items-center gap-2 pt-5 pb-3 px-5 shrink-0">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">{initials(member.nome)}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold text-foreground">{member.nome}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {editing
          ? <ProfileFields form={form} onChange={onChange} inp={inp} />
          : <ProfileView cargo={member.cargo} telefone={member.telefone} email={member.email} endereco={member.endereco} data_entrada={member.data_entrada} aniversario={member.aniversario} remuneracao={member.remuneracao} />
        }
      </div>

      <ModalFooter onClose={onClose} deleteAction={() => onDelete(member)} deleting={deleting}>
        {editing && (
          <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><Check size={12} /> Salvar</>}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

// ─── Org person detail Modal ──────────────────────────────────────────────────

function OrgPersonModal({ person, onClose, onDelete, onSave, deleting, members, orgPeople }: {
  person: OrgPerson; onClose: () => void
  onDelete: (p: OrgPerson) => void
  onSave: (id: string, fields: Partial<OrgPerson>) => Promise<void>
  deleting: boolean; members: Member[]; orgPeople: OrgPerson[]
}) {
  const hasData = !!(person.cargo || person.telefone || person.email || person.endereco || person.data_entrada || person.aniversario || person.remuneracao)
  const [editing, setEditing] = useState(!hasData)
  const [saving, setSaving]   = useState(false)
  const [parentId, setParentId] = useState(person.parent_id ?? '')
  const [form, setForm]       = useState<ProfileForm>({
    cargo:        person.cargo        ?? '',
    telefone:     person.telefone     ?? '',
    email:        person.email        ?? '',
    endereco:     person.endereco     ?? '',
    remuneracao:  person.remuneracao != null ? String(person.remuneracao) : '',
    data_entrada: person.data_entrada ?? '',
    aniversario:  person.aniversario  ?? '',
  })

  function onChange(k: keyof ProfileForm, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function cancelEdit() {
    setEditing(false)
    setForm({ cargo: person.cargo ?? '', telefone: person.telefone ?? '', email: person.email ?? '', endereco: person.endereco ?? '', remuneracao: person.remuneracao != null ? String(person.remuneracao) : '', data_entrada: person.data_entrada ?? '', aniversario: person.aniversario ?? '' })
    setParentId(person.parent_id ?? '')
  }

  async function save() {
    setSaving(true)
    await onSave(person.id, {
      cargo:        form.cargo        || null,
      telefone:     form.telefone     || null,
      email:        form.email        || null,
      endereco:     form.endereco     || null,
      remuneracao:  form.remuneracao  ? Number(form.remuneracao) : null,
      data_entrada: form.data_entrada || null,
      aniversario:  form.aniversario  || null,
      parent_id:    parentId          || null,
    })
    setSaving(false); setEditing(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const selCls = inp + ' appearance-none cursor-pointer'

  return (
    <Modal>
      <ModalHeader
        title="Ficha do membro"
        onClose={onClose}
        extra={!editing
          ? <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Pencil size={12} /> Editar</button>
          : <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
        }
      />

      <div className="flex flex-col items-center gap-2 pt-5 pb-3 px-5 shrink-0">
        <Avatar className="w-14 h-14">
          <AvatarFallback className="bg-muted text-muted-foreground font-bold text-lg">{initials(person.nome)}</AvatarFallback>
        </Avatar>
        <p className="text-sm font-semibold text-foreground">{person.nome}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {editing ? (
          <div className="space-y-3">
            <ProfileFields form={form} onChange={onChange} inp={inp} />
            <Field icon={<ChevronDown size={13} />} label="Reporta a">
              <select value={parentId} onChange={e => setParentId(e.target.value)} className={selCls}>
                <option value="">Proprietário</option>
                {members.length > 0 && (
                  <optgroup label="Equipe (com acesso)">
                    {members.filter(m => m.id !== person.id).map(m => <option key={m.id} value={m.id}>{m.nome}{m.cargo ? ` — ${m.cargo}` : ''}</option>)}
                  </optgroup>
                )}
                {orgPeople.length > 0 && (
                  <optgroup label="Organograma">
                    {orgPeople.filter(p => p.id !== person.id).map(p => <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
                  </optgroup>
                )}
              </select>
            </Field>
          </div>
        ) : (
          <div className="space-y-2.5">
            <ProfileView cargo={person.cargo} telefone={person.telefone} email={person.email} endereco={person.endereco} data_entrada={person.data_entrada} aniversario={person.aniversario} remuneracao={person.remuneracao} />
            <InfoRow
              icon={<ChevronDown size={13} />}
              label="Reporta a"
              value={
                !person.parent_id ? 'Proprietário' :
                members.find(m => m.id === person.parent_id)?.nome ??
                orgPeople.find(p => p.id === person.parent_id)?.nome ?? '—'
              }
            />
          </div>
        )}
      </div>

      <ModalFooter onClose={onClose} deleteAction={() => onDelete(person)} deleting={deleting}>
        {editing && (
          <Button size="sm" onClick={save} disabled={saving} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            {saving ? <><Loader2 size={12} className="animate-spin" /> Salvando…</> : <><Check size={12} /> Salvar</>}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

// ─── Tree rendering ───────────────────────────────────────────────────────────

function OrgNodeCard({ node, onSelectMember, onSelectOrg }: {
  node: TreeNode
  onSelectMember: (m: Member) => void
  onSelectOrg: (p: OrgPerson) => void
}) {
  const isMember = node.kind === 'member'
  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => isMember ? onSelectMember(node.data as Member) : onSelectOrg(node.data as OrgPerson)}
        className={`flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border bg-card hover:shadow-sm transition-all duration-150 ${isMember ? 'border-border hover:border-primary/30 hover:bg-primary/5' : 'border-dashed border-border hover:border-primary/30 hover:bg-muted/30'}`}
      >
        <Avatar className="w-12 h-12">
          <AvatarFallback className={isMember ? 'bg-primary/20 text-primary font-semibold text-sm' : 'bg-muted text-muted-foreground font-semibold text-sm'}>
            {initials(node.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="text-xs font-semibold text-foreground leading-none">{node.nome.split(' ')[0]}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{node.cargo ?? (isMember ? 'Membro' : 'Organograma')}</p>
        </div>
      </button>

      {node.children.length > 0 && (
        <>
          <div className="w-px h-8 bg-border" />
          <ChildrenRow nodes={node.children} onSelectMember={onSelectMember} onSelectOrg={onSelectOrg} />
        </>
      )}
    </div>
  )
}

function ChildrenRow({ nodes, onSelectMember, onSelectOrg }: {
  nodes: TreeNode[]
  onSelectMember: (m: Member) => void
  onSelectOrg: (p: OrgPerson) => void
}) {
  return (
    <div className="relative flex">
      {nodes.map((node, i) => {
        const isOnly = nodes.length === 1
        const isFirst = i === 0
        const isLast  = i === nodes.length - 1
        return (
          <div key={node.id} className="relative flex flex-col items-center px-5">
            {!isOnly && (
              <div className={`absolute top-0 h-px bg-border ${isFirst ? 'left-1/2 right-0' : isLast ? 'left-0 right-1/2' : 'left-0 right-0'}`} />
            )}
            <div className="w-px h-8 bg-border" />
            <OrgNodeCard node={node} onSelectMember={onSelectMember} onSelectOrg={onSelectOrg} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EquipePage() {
  const { user }  = useAuth()
  const supabase  = createClient()

  const [members, setMembers]               = useState<Member[]>([])
  const [orgPeople, setOrgPeople]           = useState<OrgPerson[]>([])
  const [loading, setLoading]               = useState(true)
  const [showMenu, setShowMenu]             = useState(false)
  const [showManual, setShowManual]         = useState(false)
  const [showOrg, setShowOrg]               = useState(false)
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedOrg, setSelectedOrg]       = useState<OrgPerson | null>(null)
  const [deletingId, setDeletingId]         = useState<string | null>(null)

  const ownerName  = (user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split('@')[0] ?? 'Você'
  const ownerEmail = user?.email ?? ''

  async function fetchAll() {
    const [membersRes, orgRes] = await Promise.all([
      fetch('/api/team/members'),
      supabase.from('organograma_pessoas')
        .select('id, nome, cargo, telefone, email, endereco, remuneracao, data_entrada, aniversario, parent_id')
        .order('created_at', { ascending: true }),
    ])
    if (membersRes.ok) setMembers(await membersRes.json())
    setOrgPeople((orgRes.data ?? []) as OrgPerson[])
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
    setSelectedOrg(prev => prev?.id === id ? { ...prev, ...fields } as OrgPerson : prev)
  }

  useEffect(() => { fetchAll() }, [])

  const rootNodes = buildTree(members, orgPeople)

  return (
    <div className="flex flex-col items-center pt-10 pb-20 select-none overflow-x-auto min-w-full">

      {/* Owner */}
      <div className="flex flex-col items-center gap-2.5 px-6 py-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 shadow-sm">
        <div className="relative">
          <Avatar className="w-16 h-16">
            <AvatarFallback className="bg-amber-500/20 text-amber-400 font-bold text-lg">{initials(ownerName)}</AvatarFallback>
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

      {(loading || rootNodes.length > 0) && <div className="w-px h-10 bg-border" />}
      {loading && <Loader2 size={18} className="animate-spin text-muted-foreground" />}

      {!loading && rootNodes.length > 0 && (
        <ChildrenRow nodes={rootNodes} onSelectMember={setSelectedMember} onSelectOrg={setSelectedOrg} />
      )}

      {!loading && rootNodes.length === 0 && (
        <p className="text-xs text-muted-foreground mt-4">Nenhum membro ainda. Adicione alguém abaixo.</p>
      )}

      {/* Add button */}
      <div className="mt-14 relative">
        <div className="flex items-center rounded-lg overflow-hidden border border-primary/40">
          <Button size="sm" onClick={() => { setShowManual(true); setShowMenu(false) }} className="h-9 bg-primary hover:bg-primary/90 text-xs gap-2 px-4 rounded-none border-0">
            <UserPlus size={14} /> Adicionar membro
          </Button>
          <div className="w-px h-9 bg-primary/40" />
          <button onClick={() => setShowMenu(v => !v)} className="h-9 px-2.5 bg-primary hover:bg-primary/90 text-white transition-colors flex items-center">
            <ChevronDown size={14} />
          </button>
        </div>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full mt-1 left-0 z-20 bg-card border border-border rounded-xl shadow-xl overflow-hidden w-64 animate-in fade-in zoom-in-95 duration-150">
              <button onClick={() => { setShowManual(true); setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-foreground hover:bg-muted transition-colors text-left">
                <UserPlus size={14} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium">Convidar membro</p>
                  <p className="text-muted-foreground">Cria conta com email e senha</p>
                </div>
              </button>
              <div className="border-t border-border" />
              <button onClick={() => { setShowOrg(true); setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-foreground hover:bg-muted transition-colors text-left">
                <UserCog size={14} className="text-primary shrink-0" />
                <div>
                  <p className="font-medium">Adicionar membro</p>
                  <p className="text-muted-foreground">Sem email e senha, aparece no organograma</p>
                </div>
              </button>
            </div>
          </>
        )}
      </div>

      {showManual && <AddManualModal onClose={() => setShowManual(false)} onAdded={fetchAll} />}
      {showOrg    && <AddOrgModal   onClose={() => setShowOrg(false)}    onAdded={fetchAll} members={members} orgPeople={orgPeople} />}
      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} onDelete={deleteMember} onSave={saveMember} deleting={deletingId === selectedMember.id} />
      )}
      {selectedOrg && (
        <OrgPersonModal person={selectedOrg} onClose={() => setSelectedOrg(null)} onDelete={deleteOrgPerson} onSave={saveOrgPerson} deleting={deletingId === selectedOrg.id} members={members} orgPeople={orgPeople} />
      )}
    </div>
  )
}
