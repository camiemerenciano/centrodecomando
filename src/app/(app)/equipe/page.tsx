'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Mail, Crown, X, Loader2, Trash2, Pencil, Check,
  MapPin, Briefcase, Banknote, CalendarDays, Cake,
  UserPlus, Eye, EyeOff, ChevronDown, UserCog, Phone,
  Building2, CreditCard, User, FileText, Shield, Hash,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/contexts/empresa-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Member {
  id: string; nome: string; email: string
  cargo: string | null; parent_id: string | null
  // Dados da empresa
  razao_social: string | null; nome_fantasia: string | null; cnpj: string | null
  endereco_empresa: string | null; cep_empresa: string | null
  telefone_empresa: string | null; email_empresa: string | null
  // Pagamento
  remuneracao: number | null; dados_pagamento: string | null
  valor_pagamento: number | null; data_pagamento: string | null
  // Dados pessoais
  rg: string | null; cpf: string | null; endereco: string | null
  cep: string | null; telefone: string | null; aniversario: string | null
  data_entrada: string | null
  // Responsabilidades
  responsabilidades: string | null
}

interface OrgPerson {
  id: string; nome: string; cargo: string | null; parent_id: string | null
  // Dados da empresa
  razao_social: string | null; nome_fantasia: string | null; cnpj: string | null
  endereco_empresa: string | null; cep_empresa: string | null
  telefone_empresa: string | null; email_empresa: string | null
  // Pagamento
  remuneracao: number | null; dados_pagamento: string | null
  valor_pagamento: number | null; data_pagamento: string | null
  // Dados pessoais
  email: string | null; rg: string | null; cpf: string | null
  endereco: string | null; cep: string | null; telefone: string | null
  aniversario: string | null; data_entrada: string | null
  // Responsabilidades
  responsabilidades: string | null
}

type TreeNode = {
  kind: 'member' | 'org'
  id: string; nome: string; cargo: string | null
  data: Member | OrgPerson
  children: TreeNode[]
}

type Tab = 'empresa' | 'pagamento' | 'pessoal' | 'responsabilidades'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function initials(n: string) { return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(iso + 'T00:00:00'))
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
  const roots: TreeNode[] = []
  members.forEach(m => {
    const node = memberNodes.get(m.id)!
    if (m.parent_id) {
      const parent = memberNodes.get(m.parent_id) ?? orgNodes.get(m.parent_id)
      if (parent) { parent.children.push(node); return }
    }
    roots.push(node)
  })
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

// ─── Primitives ───────────────────────────────────────────────────────────────

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

function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><X size={16} /></button>
    </div>
  )
}

function ModalFooter({ onClose, children }: { onClose: () => void; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
      <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
      {children ?? <div />}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-36">{label}</span>
      <span className="text-xs text-foreground text-right break-words flex-1">{value || '—'}</span>
    </div>
  )
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary">{icon}</span>
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{msg}</p>
}

// ─── Profile Form type ────────────────────────────────────────────────────────

type ProfileForm = {
  cargo: string
  // Empresa
  razao_social: string; nome_fantasia: string; cnpj: string
  endereco_empresa: string; cep_empresa: string; telefone_empresa: string; email_empresa: string
  // Pagamento
  remuneracao: string; dados_pagamento: string; valor_pagamento: string; data_pagamento: string
  // Pessoal
  rg: string; cpf: string; endereco: string; cep: string; telefone: string
  email: string; aniversario: string; data_entrada: string
  // Responsabilidades
  responsabilidades: string
}

function emptyForm(data?: Partial<Member & OrgPerson>): ProfileForm {
  return {
    cargo:            data?.cargo            ?? '',
    razao_social:     data?.razao_social     ?? '',
    nome_fantasia:    data?.nome_fantasia    ?? '',
    cnpj:             data?.cnpj             ?? '',
    endereco_empresa: data?.endereco_empresa ?? '',
    cep_empresa:      data?.cep_empresa      ?? '',
    telefone_empresa: data?.telefone_empresa ?? '',
    email_empresa:    data?.email_empresa    ?? '',
    remuneracao:      data?.remuneracao != null ? String(data.remuneracao) : '',
    dados_pagamento:  data?.dados_pagamento  ?? '',
    valor_pagamento:  data?.valor_pagamento != null ? String(data.valor_pagamento) : '',
    data_pagamento:   data?.data_pagamento   ?? '',
    rg:               data?.rg               ?? '',
    cpf:              data?.cpf              ?? '',
    endereco:         data?.endereco         ?? '',
    cep:              data?.cep              ?? '',
    telefone:         data?.telefone         ?? '',
    email:            (data as OrgPerson)?.email ?? '',
    aniversario:      data?.aniversario      ?? '',
    data_entrada:     data?.data_entrada     ?? '',
    responsabilidades: data?.responsabilidades ?? '',
  }
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  nome, isMember, memberEmail, parentName,
  data, onClose, onSave, onDelete, deleting,
  members, orgPeople, selfId,
}: {
  nome: string; isMember: boolean; memberEmail?: string; parentName: string
  data: Member | OrgPerson
  onClose: () => void
  onSave: (fields: ProfileForm & { parent_id: string | null }) => Promise<void>
  onDelete: () => void
  deleting: boolean
  members: Member[]; orgPeople: OrgPerson[]; selfId: string
}) {
  const [tab, setTab]         = useState<Tab>('empresa')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [parentId, setParentId] = useState((data as Member).parent_id ?? '')
  const [form, setForm]       = useState<ProfileForm>(() => emptyForm(data as Partial<Member & OrgPerson>))

  function upd(k: keyof ProfileForm, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function cancelEdit() {
    setEditing(false)
    setForm(emptyForm(data as Partial<Member & OrgPerson>))
    setParentId((data as Member).parent_id ?? '')
  }

  async function save() {
    setSaving(true)
    await onSave({ ...form, parent_id: parentId || null })
    setSaving(false)
    setEditing(false)
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40'
  const inp2 = inp + ' h-8 text-xs'
  const selCls = inp2 + ' appearance-none cursor-pointer'

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'empresa',          label: 'Empresa',          icon: <Building2 size={13} /> },
    { id: 'pagamento',        label: 'Pagamento',        icon: <CreditCard size={13} /> },
    { id: 'pessoal',          label: 'Pessoal',          icon: <User size={13} /> },
    { id: 'responsabilidades', label: 'Responsabilidades', icon: <FileText size={13} /> },
  ]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-xl bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={`font-bold text-sm ${isMember ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {initials(nome)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold text-foreground">{nome}</p>
              <p className="text-xs text-muted-foreground">{form.cargo || (isMember ? 'Membro' : 'Organograma')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/10">
                <Pencil size={12} /> Editar
              </button>
            )}
            {editing && (
              <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                Cancelar
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0 px-2 pt-1">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── EMPRESA ── */}
          {tab === 'empresa' && (
            editing ? (
              <div className="space-y-4">
                <SectionTitle icon={<Building2 size={14} />} title="Dados da Empresa" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Razão social">
                    <input value={form.razao_social} onChange={e => upd('razao_social', e.target.value)} placeholder="Nome jurídico" className={inp2} />
                  </Field>
                  <Field label="Nome fantasia">
                    <input value={form.nome_fantasia} onChange={e => upd('nome_fantasia', e.target.value)} placeholder="Nome comercial" className={inp2} />
                  </Field>
                </div>
                <Field label="CNPJ">
                  <input value={form.cnpj} onChange={e => upd('cnpj', e.target.value)} placeholder="00.000.000/0001-00" className={inp2} />
                </Field>
                <Field label="Endereço">
                  <input value={form.endereco_empresa} onChange={e => upd('endereco_empresa', e.target.value)} placeholder="Rua, número, bairro" className={inp2} />
                </Field>
                <Field label="CEP">
                  <input value={form.cep_empresa} onChange={e => upd('cep_empresa', e.target.value)} placeholder="00000-000" className={inp2} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone">
                    <input value={form.telefone_empresa} onChange={e => upd('telefone_empresa', e.target.value)} placeholder="(11) 3000-0000" className={inp2} />
                  </Field>
                  <Field label="Email">
                    <input type="email" value={form.email_empresa} onChange={e => upd('email_empresa', e.target.value)} placeholder="contato@empresa.com" className={inp2} />
                  </Field>
                </div>
                <Field label="Função / Cargo">
                  <input value={form.cargo} onChange={e => upd('cargo', e.target.value)} placeholder="Ex: Designer, Dev, Gestor" className={inp2} />
                </Field>
                <Field label="Reporta a">
                  <select value={parentId} onChange={e => setParentId(e.target.value)} className={selCls}>
                    <option value="">Proprietário</option>
                    {members.filter(m => m.id !== selfId).length > 0 && (
                      <optgroup label="Equipe (com acesso)">
                        {members.filter(m => m.id !== selfId).map(m => <option key={m.id} value={m.id}>{m.nome}{m.cargo ? ` — ${m.cargo}` : ''}</option>)}
                      </optgroup>
                    )}
                    {orgPeople.filter(p => p.id !== selfId).length > 0 && (
                      <optgroup label="Organograma">
                        {orgPeople.filter(p => p.id !== selfId).map(p => <option key={p.id} value={p.id}>{p.nome}{p.cargo ? ` — ${p.cargo}` : ''}</option>)}
                      </optgroup>
                    )}
                  </select>
                </Field>
              </div>
            ) : (
              <div>
                <SectionTitle icon={<Building2 size={14} />} title="Dados da Empresa" />
                <div className="bg-muted/30 rounded-xl p-4">
                  <InfoRow label="Razão social"   value={form.razao_social} />
                  <InfoRow label="Nome fantasia"  value={form.nome_fantasia} />
                  <InfoRow label="CNPJ"           value={form.cnpj} />
                  <InfoRow label="Endereço"       value={form.endereco_empresa} />
                  <InfoRow label="CEP"            value={form.cep_empresa} />
                  <InfoRow label="Telefone"       value={form.telefone_empresa} />
                  <InfoRow label="Email"          value={form.email_empresa} />
                  <InfoRow label="Função / Cargo" value={form.cargo} />
                  <InfoRow label="Reporta a"      value={parentName} />
                </div>
              </div>
            )
          )}

          {/* ── PAGAMENTO ── */}
          {tab === 'pagamento' && (
            editing ? (
              <div className="space-y-4">
                <SectionTitle icon={<CreditCard size={14} />} title="Pagamento" />
                <Field label="Remuneração (R$)">
                  <input type="number" value={form.remuneracao} onChange={e => upd('remuneracao', e.target.value)} placeholder="5000" className={inp2} />
                </Field>
                <Field label="Dados de pagamento">
                  <textarea value={form.dados_pagamento} onChange={e => upd('dados_pagamento', e.target.value)} rows={3}
                    placeholder="Banco, agência, conta, PIX..." className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/40" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Valor">
                    <input type="number" value={form.valor_pagamento} onChange={e => upd('valor_pagamento', e.target.value)} placeholder="0,00" className={inp2} />
                  </Field>
                  <Field label="Data">
                    <input type="date" value={form.data_pagamento} onChange={e => upd('data_pagamento', e.target.value)} className={inp2} />
                  </Field>
                </div>
              </div>
            ) : (
              <div>
                <SectionTitle icon={<CreditCard size={14} />} title="Pagamento" />
                <div className="bg-muted/30 rounded-xl p-4">
                  <InfoRow label="Remuneração"       value={form.remuneracao ? fmtCurrency(Number(form.remuneracao)) : null} />
                  <InfoRow label="Dados de pagamento" value={form.dados_pagamento} />
                  <InfoRow label="Valor"             value={form.valor_pagamento ? fmtCurrency(Number(form.valor_pagamento)) : null} />
                  <InfoRow label="Data"              value={form.data_pagamento ? fmtDate(form.data_pagamento) : null} />
                </div>
              </div>
            )
          )}

          {/* ── PESSOAL ── */}
          {tab === 'pessoal' && (
            editing ? (
              <div className="space-y-4">
                <SectionTitle icon={<User size={14} />} title="Dados Pessoais" />
                <Field label="Nome completo">
                  <input value={nome} readOnly className={inp2 + ' opacity-50 cursor-not-allowed'} />
                </Field>
                {!isMember && (
                  <Field label="Email">
                    <input type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="email@pessoal.com" className={inp2} />
                  </Field>
                )}
                {isMember && memberEmail && (
                  <Field label="Email">
                    <input value={memberEmail} readOnly className={inp2 + ' opacity-50 cursor-not-allowed'} />
                  </Field>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="RG">
                    <input value={form.rg} onChange={e => upd('rg', e.target.value)} placeholder="00.000.000-0" className={inp2} />
                  </Field>
                  <Field label="CPF">
                    <input value={form.cpf} onChange={e => upd('cpf', e.target.value)} placeholder="000.000.000-00" className={inp2} />
                  </Field>
                </div>
                <Field label="Endereço">
                  <input value={form.endereco} onChange={e => upd('endereco', e.target.value)} placeholder="Rua, número, bairro, cidade" className={inp2} />
                </Field>
                <Field label="CEP">
                  <input value={form.cep} onChange={e => upd('cep', e.target.value)} placeholder="00000-000" className={inp2} />
                </Field>
                <Field label="Telefone">
                  <input value={form.telefone} onChange={e => upd('telefone', e.target.value)} placeholder="(11) 99999-9999" className={inp2} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Data de nascimento">
                    <input type="date" value={form.aniversario} onChange={e => upd('aniversario', e.target.value)} className={inp2} />
                  </Field>
                  <Field label="Início na empresa">
                    <input type="date" value={form.data_entrada} onChange={e => upd('data_entrada', e.target.value)} className={inp2} />
                  </Field>
                </div>
              </div>
            ) : (
              <div>
                <SectionTitle icon={<User size={14} />} title="Dados Pessoais" />
                <div className="bg-muted/30 rounded-xl p-4">
                  <InfoRow label="Nome"              value={nome} />
                  <InfoRow label="Email"             value={isMember ? memberEmail : form.email} />
                  <InfoRow label="RG"                value={form.rg} />
                  <InfoRow label="CPF"               value={form.cpf} />
                  <InfoRow label="Endereço"          value={form.endereco} />
                  <InfoRow label="CEP"               value={form.cep} />
                  <InfoRow label="Telefone"          value={form.telefone} />
                  <InfoRow label="Data de nascimento" value={form.aniversario ? fmtDate(form.aniversario) : null} />
                  <InfoRow label="Início na empresa" value={form.data_entrada ? fmtDate(form.data_entrada) : null} />
                </div>
              </div>
            )
          )}

          {/* ── RESPONSABILIDADES ── */}
          {tab === 'responsabilidades' && (
            editing ? (
              <div className="space-y-4">
                <SectionTitle icon={<Shield size={14} />} title="Responsabilidades" />
                <textarea
                  value={form.responsabilidades}
                  onChange={e => upd('responsabilidades', e.target.value)}
                  rows={12}
                  placeholder="Descreva as responsabilidades, atribuições e escopo de atuação deste membro..."
                  className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none placeholder:text-muted-foreground/40 leading-relaxed"
                />
              </div>
            ) : (
              <div>
                <SectionTitle icon={<Shield size={14} />} title="Responsabilidades" />
                {form.responsabilidades ? (
                  <div className="bg-muted/30 rounded-xl p-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{form.responsabilidades}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Shield size={28} className="text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma responsabilidade cadastrada</p>
                    <button onClick={() => setEditing(true)} className="text-xs text-primary mt-2 hover:text-primary/80 transition-colors">
                      + Adicionar
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0">
          <button onClick={onDelete} disabled={deleting}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
            {deleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            Remover
          </button>
          {editing ? (
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 h-9 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : <><Check size={13} /> Salvar</>}
            </button>
          ) : (
            <button onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 h-9 px-5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Pencil size={13} /> Editar ficha
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Invite (manual) Modal ────────────────────────────────────────────────────

function AddManualModal({ onClose, onAdded, members, orgPeople }: {
  onClose: () => void; onAdded: () => void; members: Member[]; orgPeople: OrgPerson[]
}) {
  const { empresaId } = useEmpresa()
  const [form, setForm]         = useState({ nome: '', email: '', senha: '' })
  const [parentId, setParentId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    const email = form.email.trim().toLowerCase()
    if (!email) { setError('E-mail é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch('/api/team/members', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, email, parent_id: parentId || null, empresa_id: empresaId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao adicionar membro')
      onAdded(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setSaving(false) }
  }

  const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all'
  const selCls = inp + ' appearance-none cursor-pointer'

  return (
    <Modal>
      <ModalHeader title="Convidar membro" sub="Vincule quem já tem conta ou crie uma nova" onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 px-3 py-2.5">
          <p className="text-[11px] text-sky-400 leading-relaxed">
            Se o membro já tem conta na plataforma, basta informar o e-mail. Nome e senha são necessários apenas para criar uma conta nova.
          </p>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Mail size={13} /> E-mail *</label>
          <input type="email" value={form.email} onChange={e => field('email', e.target.value)} placeholder="ana@empresa.com" className={inp} autoFocus />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><UserPlus size={13} /> Nome completo (conta nova)</label>
          <input value={form.nome} onChange={e => field('nome', e.target.value)} placeholder="Ana Silva" className={inp} />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><Briefcase size={13} /> Senha (conta nova)</label>
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} value={form.senha} onChange={e => field('senha', e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Mínimo 8 caracteres" className={inp + ' pr-10'} />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><ChevronDown size={13} /> Reporta a</label>
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
        </div>
        {error && <ErrorMsg msg={error} />}
      </div>
      <ModalFooter onClose={onClose}>
        <Button size="sm" onClick={save} disabled={saving || !form.email} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
          {saving ? <><Loader2 size={12} className="animate-spin" /> Verificando…</> : <><UserPlus size={12} /> Adicionar</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ─── Add org person Modal ─────────────────────────────────────────────────────

function AddOrgModal({ onClose, onAdded, members, orgPeople }: {
  onClose: () => void; onAdded: () => void; members: Member[]; orgPeople: OrgPerson[]
}) {
  const supabase      = createClient()
  const { empresaId } = useEmpresa()
  const [nome, setNome]         = useState('')
  const [parentId, setParentId] = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const selCls = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all appearance-none cursor-pointer'

  async function save() {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return }
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autenticado')
      const { error: err } = await supabase.from('organograma_pessoas').insert({ user_id: user.id, empresa_id: empresaId || null, nome: nome.trim(), parent_id: parentId || null })
      if (err) throw new Error(err.message)
      onAdded(); onClose()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro') }
    finally { setSaving(false) }
  }

  return (
    <Modal>
      <ModalHeader title="Adicionar membro" sub="Sem email e senha" onClose={onClose} />
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><UserCog size={13} /> Nome completo *</label>
          <input value={nome} onChange={e => setNome(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} placeholder="Carlos Souza" className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" autoFocus />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-1"><ChevronDown size={13} /> Reporta a</label>
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
        </div>
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
        const isOnly  = nodes.length === 1
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

const ORG_SELECT = 'id, nome, cargo, telefone, email, endereco, remuneracao, data_entrada, aniversario, parent_id, razao_social, nome_fantasia, cnpj, endereco_empresa, cep_empresa, telefone_empresa, email_empresa, dados_pagamento, valor_pagamento, data_pagamento, rg, cpf, cep, responsabilidades'

export default function EquipePage() {
  const { user }       = useAuth()
  const supabase       = createClient()
  const { empresaId }  = useEmpresa()

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
      (empresaId
        ? supabase.from('organograma_pessoas').select(ORG_SELECT).eq('empresa_id', empresaId)
        : supabase.from('organograma_pessoas').select(ORG_SELECT).is('empresa_id', null)
      ).order('created_at', { ascending: true }),
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

  async function saveMember(id: string, fields: ProfileForm & { parent_id: string | null }) {
    await fetch(`/api/team/members/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cargo:            fields.cargo            || null,
        razao_social:     fields.razao_social     || null,
        nome_fantasia:    fields.nome_fantasia    || null,
        cnpj:             fields.cnpj             || null,
        endereco_empresa: fields.endereco_empresa || null,
        cep_empresa:      fields.cep_empresa      || null,
        telefone_empresa: fields.telefone_empresa || null,
        email_empresa:    fields.email_empresa    || null,
        remuneracao:      fields.remuneracao ? Number(fields.remuneracao) : null,
        dados_pagamento:  fields.dados_pagamento  || null,
        valor_pagamento:  fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
        data_pagamento:   fields.data_pagamento   || null,
        rg:               fields.rg               || null,
        cpf:              fields.cpf              || null,
        endereco:         fields.endereco         || null,
        cep:              fields.cep              || null,
        telefone:         fields.telefone         || null,
        aniversario:      fields.aniversario      || null,
        data_entrada:     fields.data_entrada     || null,
        responsabilidades: fields.responsabilidades || null,
        parent_id:        fields.parent_id,
      }),
    })
    setMembers(prev => prev.map(m => m.id === id ? {
      ...m, ...fields,
      remuneracao:     fields.remuneracao ? Number(fields.remuneracao) : null,
      valor_pagamento: fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
    } : m))
    setSelectedMember(prev => prev?.id === id ? {
      ...prev, ...fields,
      remuneracao:     fields.remuneracao ? Number(fields.remuneracao) : null,
      valor_pagamento: fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
    } : prev)
  }

  async function deleteOrgPerson(person: OrgPerson) {
    setDeletingId(person.id)
    try {
      await supabase.from('organograma_pessoas').delete().eq('id', person.id)
      setOrgPeople(prev => prev.filter(p => p.id !== person.id))
      setSelectedOrg(null)
    } finally { setDeletingId(null) }
  }

  async function saveOrgPerson(id: string, fields: ProfileForm & { parent_id: string | null }) {
    await supabase.from('organograma_pessoas').update({
      cargo:            fields.cargo            || null,
      razao_social:     fields.razao_social     || null,
      nome_fantasia:    fields.nome_fantasia    || null,
      cnpj:             fields.cnpj             || null,
      endereco_empresa: fields.endereco_empresa || null,
      cep_empresa:      fields.cep_empresa      || null,
      telefone_empresa: fields.telefone_empresa || null,
      email_empresa:    fields.email_empresa    || null,
      remuneracao:      fields.remuneracao ? Number(fields.remuneracao) : null,
      dados_pagamento:  fields.dados_pagamento  || null,
      valor_pagamento:  fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
      data_pagamento:   fields.data_pagamento   || null,
      email:            fields.email            || null,
      rg:               fields.rg               || null,
      cpf:              fields.cpf              || null,
      endereco:         fields.endereco         || null,
      cep:              fields.cep              || null,
      telefone:         fields.telefone         || null,
      aniversario:      fields.aniversario      || null,
      data_entrada:     fields.data_entrada     || null,
      responsabilidades: fields.responsabilidades || null,
      parent_id:        fields.parent_id,
    }).eq('id', id)
    setOrgPeople(prev => prev.map(p => p.id === id ? {
      ...p, ...fields,
      remuneracao:     fields.remuneracao ? Number(fields.remuneracao) : null,
      valor_pagamento: fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
    } : p))
    setSelectedOrg(prev => prev?.id === id ? {
      ...prev, ...fields,
      remuneracao:     fields.remuneracao ? Number(fields.remuneracao) : null,
      valor_pagamento: fields.valor_pagamento ? Number(fields.valor_pagamento) : null,
    } as OrgPerson : prev)
  }

  useEffect(() => { fetchAll() }, [empresaId])

  const rootNodes = buildTree(members, orgPeople)

  function parentName(id: string | null): string {
    if (!id) return 'Proprietário'
    return members.find(m => m.id === id)?.nome ?? orgPeople.find(p => p.id === id)?.nome ?? '—'
  }

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
                <div><p className="font-medium">Convidar membro</p><p className="text-muted-foreground">Cria conta com email e senha</p></div>
              </button>
              <div className="border-t border-border" />
              <button onClick={() => { setShowOrg(true); setShowMenu(false) }} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-foreground hover:bg-muted transition-colors text-left">
                <UserCog size={14} className="text-primary shrink-0" />
                <div><p className="font-medium">Adicionar membro</p><p className="text-muted-foreground">Sem email e senha, aparece no organograma</p></div>
              </button>
            </div>
          </>
        )}
      </div>

      {showManual && <AddManualModal onClose={() => setShowManual(false)} onAdded={fetchAll} members={members} orgPeople={orgPeople} />}
      {showOrg    && <AddOrgModal   onClose={() => setShowOrg(false)}    onAdded={fetchAll} members={members} orgPeople={orgPeople} />}

      {selectedMember && (
        <DetailPanel
          nome={selectedMember.nome}
          isMember={true}
          memberEmail={selectedMember.email}
          parentName={parentName(selectedMember.parent_id)}
          data={selectedMember}
          onClose={() => setSelectedMember(null)}
          onSave={fields => saveMember(selectedMember.id, fields)}
          onDelete={() => deleteMember(selectedMember)}
          deleting={deletingId === selectedMember.id}
          members={members} orgPeople={orgPeople} selfId={selectedMember.id}
        />
      )}

      {selectedOrg && (
        <DetailPanel
          nome={selectedOrg.nome}
          isMember={false}
          parentName={parentName(selectedOrg.parent_id)}
          data={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onSave={fields => saveOrgPerson(selectedOrg.id, fields)}
          onDelete={() => deleteOrgPerson(selectedOrg)}
          deleting={deletingId === selectedOrg.id}
          members={members} orgPeople={orgPeople} selfId={selectedOrg.id}
        />
      )}
    </div>
  )
}
