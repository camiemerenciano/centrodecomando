'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Plus, Search, Users, TrendingUp, DollarSign, BarChart3,
  AtSign, Mail, Phone, X, Building2, Globe, MapPin,
  FileText, Pencil, Trash2, Save, ChevronRight,
  Hash, CreditCard, CheckSquare, Calendar, Bot, Tag,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status   = 'active' | 'paused' | 'churned'
type Contrato = 'sem_contrato' | 'contrato_enviado' | 'contrato_assinado'
type Reuniao  = 'sem_reuniao'  | 'com_reuniao'

interface Client {
  id: string
  name: string
  email: string
  phone: string
  cpf: string
  company: string
  cnpj: string
  instagram: string
  website: string
  address: string
  segment: string
  status: Status
  plan: string
  mrr: string
  since: string
  assignee: string
  assigneeInitials: string
  tasks: number
  notes: string
  servicos: string[]
  tags: string[]
  contrato: Contrato
  reuniao: Reuniao
  pipelineStage: string
  updatedAt: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<Status, { label: string; cls: string }> = {
  active:  { label: 'Ativo',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  paused:  { label: 'Pausado', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  churned: { label: 'Churned', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

const planColor: Record<string, string> = {
  Premium: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Pro:     'bg-sky-500/15 text-sky-400 border-sky-500/20',
  Starter: 'bg-muted text-muted-foreground border-border',
}

const PLANS    = ['Starter', 'Pro', 'Premium']
const STATUSES: Status[] = ['active', 'paused', 'churned']

const PIPELINE_STAGES = [
  { id: 'recepcao',          label: 'Recepção',          cls: 'bg-slate-400/15 text-slate-400 border-slate-400/20'        },
  { id: 'viabilidade',       label: 'Viabilidade',       cls: 'bg-indigo-400/15 text-indigo-400 border-indigo-400/20'    },
  { id: 'ag_agendamento',    label: 'Ag. Agendamento',   cls: 'bg-amber-400/15 text-amber-400 border-amber-400/20'       },
  { id: 'agendado',          label: 'Agendado',          cls: 'bg-sky-400/15 text-sky-400 border-sky-400/20'             },
  { id: 'contrato_enviado',  label: 'Contrato Enviado',  cls: 'bg-orange-400/15 text-orange-400 border-orange-400/20'    },
  { id: 'contrato_assinado', label: 'Contrato Assinado', cls: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/20' },
  { id: 'followup',          label: 'Follow-up',         cls: 'bg-violet-400/15 text-violet-400 border-violet-400/20'    },
  { id: 'perdido',           label: 'Lead Perdido',      cls: 'bg-red-400/15 text-red-400 border-red-400/20'             },
]

const CONTRATO_CFG: Record<Contrato, { label: string; cls: string }> = {
  sem_contrato:      { label: 'Sem contrato',      cls: 'bg-muted text-muted-foreground border-border'              },
  contrato_enviado:  { label: 'Contrato Enviado',  cls: 'bg-orange-500/15 text-orange-400 border-orange-500/20'     },
  contrato_assinado: { label: 'Contrato Assinado', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'  },
}

const REUNIAO_CFG: Record<Reuniao, { label: string; cls: string }> = {
  sem_reuniao: { label: 'Sem reunião', cls: 'bg-muted text-muted-foreground border-border'          },
  com_reuniao: { label: 'Com reunião', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/20'          },
}

function pipelineCls(id: string) {
  return PIPELINE_STAGES.find(s => s.id === id) ?? null
}

function fmtUpdatedAt(iso: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function phoneToJid(phone: string): string | null {
  const d = phone.replace(/\D/g, '')
  if (d.length < 8) return null
  const cc = d.startsWith('55') ? d : `55${d}`
  return `${cc}@s.whatsapp.net`
}

function toRow(c: Client, userId: string) {
  return {
    id: c.id,
    user_id: userId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    cpf: c.cpf,
    company: c.company,
    cnpj: c.cnpj,
    instagram: c.instagram,
    website: c.website,
    address: c.address,
    segment: c.segment,
    status: c.status,
    plan: c.plan,
    mrr: c.mrr,
    since: c.since,
    assignee: c.assignee,
    assignee_initials: c.assigneeInitials,
    tasks: c.tasks,
    notes: c.notes,
    servicos: c.servicos,
    tags: c.tags,
    contrato: c.contrato,
    reuniao: c.reuniao,
    pipeline_stage: c.pipelineStage,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(r: any): Client {
  return {
    id: r.id,
    name: r.name ?? '',
    email: r.email ?? '',
    phone: r.phone ?? '',
    cpf: r.cpf ?? '',
    company: r.company ?? '',
    cnpj: r.cnpj ?? '',
    instagram: r.instagram ?? '',
    website: r.website ?? '',
    address: r.address ?? '',
    segment: r.segment ?? '',
    status: (r.status ?? 'active') as Status,
    plan: r.plan ?? 'Starter',
    mrr: r.mrr ?? 'R$ 0',
    since: r.since ?? '',
    assignee: r.assignee ?? '',
    assigneeInitials: r.assignee_initials ?? '',
    tasks: r.tasks ?? 0,
    notes: r.notes ?? '',
    servicos: Array.isArray(r.servicos) ? r.servicos : [],
    tags: Array.isArray(r.tags) ? r.tags : [],
    contrato: (r.contrato ?? 'sem_contrato') as Contrato,
    reuniao: (r.reuniao ?? 'sem_reuniao') as Reuniao,
    pipelineStage: r.pipeline_stage ?? '',
    updatedAt: r.updated_at ?? r.created_at ?? '',
  }
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  function add() {
    const v = input.trim()
    if (!v || tags.includes(v)) { setInput(''); return }
    onChange([...tags, v])
    setInput('')
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
            <Tag size={8} />{t}
            <button type="button" onClick={() => onChange(tags.filter(x => x !== t))} className="hover:text-foreground transition-colors">
              <X size={9} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Nova tag…"
          className="flex-1 h-7 rounded-lg bg-muted border border-border px-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
        />
        <button type="button" onClick={add} className="h-7 px-2.5 rounded-lg bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
          +
        </button>
      </div>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={13} className="text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-xs text-foreground break-all mt-0.5">{value}</p>
      </div>
    </div>
  )
}

// ─── ClientPanel ──────────────────────────────────────────────────────────────

function ClientPanel({
  client,
  areas,
  onClose,
  onSave,
  onDelete,
}: {
  client: Client
  areas: string[]
  onClose: () => void
  onSave: (c: Client) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing]       = useState(false)
  const [form, setForm]             = useState<Client>(client)
  const [inviting, setInviting]         = useState(false)
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [inviteError, setInviteError]   = useState<string | null>(null)
  const [senhaTmp, setSenhaTmp]         = useState('')
  const [copiedEmail, setCopiedEmail]   = useState(false)
  const [copiedSenha, setCopiedSenha]   = useState(false)

  const initials = client.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  async function criarAcesso() {
    setInviting(true)
    setInviteStatus('idle')
    setInviteError(null)
    const res = await fetch('/api/clientes/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: client.email, nome: client.name, senha: senhaTmp }),
    })
    const json = await res.json().catch(() => ({}))
    setInviting(false)
    if (res.ok) {
      setInviteStatus('done')
    } else {
      setInviteStatus('error')
      setInviteError(json.error ?? 'Erro desconhecido')
    }
  }

  function copiar(text: string, tipo: 'email' | 'senha') {
    navigator.clipboard.writeText(text)
    if (tipo === 'email') { setCopiedEmail(true); setTimeout(() => setCopiedEmail(false), 2000) }
    else { setCopiedSenha(true); setTimeout(() => setCopiedSenha(false), 2000) }
  }

  function f(key: keyof Client) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
    }
  }

  function save() {
    onSave(form)
    setEditing(false)
  }

  const inp  = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl  = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{client.name}</h2>
              <p className="text-xs text-muted-foreground">{client.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Editar"
              >
                <Pencil size={13} />
              </button>
            )}
            <button
              onClick={() => { if (confirm('Excluir este cliente?')) onDelete(client.id) }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
              title="Excluir"
            >
              <Trash2 size={13} />
            </button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Status + Plan badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[10px] ${statusConfig[form.status].cls}`}>
              {statusConfig[form.status].label}
            </Badge>
            <Badge className={`text-[10px] ${planColor[form.plan] ?? 'bg-muted text-muted-foreground'}`}>
              {form.plan}
            </Badge>
            <span className="text-xs text-muted-foreground">desde {form.since}</span>
          </div>

          {/* ── View mode ── */}
          {!editing ? (
            <>
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Pessoais</p>
                <InfoRow icon={Mail}       label="Email"    value={form.email}   />
                <InfoRow icon={Phone}      label="Telefone" value={form.phone}   />
                <InfoRow icon={CreditCard} label="CPF"      value={form.cpf}     />
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Empresariais</p>
                <InfoRow icon={Building2} label="Empresa"   value={form.company}   />
                <InfoRow icon={Hash}      label="CNPJ"      value={form.cnpj}      />
                <InfoRow icon={AtSign}    label="Instagram" value={form.instagram} />
                <InfoRow icon={Globe}     label="Website"   value={form.website}   />
                <InfoRow icon={MapPin}    label="Endereço"  value={form.address}   />
                <InfoRow icon={BarChart3} label="Segmento"  value={form.segment}   />
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Contrato</p>
                <InfoRow icon={FileText}  label="Plano"        value={form.plan}  />
                <InfoRow icon={DollarSign}label="MRR"          value={form.mrr}   />
                <InfoRow icon={Calendar}  label="Cliente desde" value={form.since} />
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Operação</p>
                {form.assignee && (
                  <div className="flex items-center gap-2.5">
                    <Avatar className="w-6 h-6 shrink-0">
                      <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">{form.assigneeInitials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Responsável</p>
                      <p className="text-xs text-foreground mt-0.5">{form.assignee}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <CheckSquare size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tarefas abertas</p>
                    <p className="text-xs text-foreground mt-0.5">{form.tasks > 0 ? `${form.tasks} tarefas` : 'Nenhuma'}</p>
                  </div>
                </div>
              </section>

              {form.notes && (
                <section className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Notas</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{form.notes}</p>
                </section>
              )}

              {form.servicos.length > 0 && (
                <section className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Serviços</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.servicos.map(s => (
                      <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/15 text-primary border border-primary/25">
                        {s}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Comercial</p>
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge className={`text-[10px] ${PIPELINE_STAGES.find(s => s.id === form.pipelineStage)?.cls ?? 'bg-muted text-muted-foreground border-border'}`}>
                      {PIPELINE_STAGES.find(s => s.id === form.pipelineStage)?.label ?? 'Sem etapa'}
                    </Badge>
                    <Badge className={`text-[10px] ${CONTRATO_CFG[form.contrato].cls}`}>{CONTRATO_CFG[form.contrato].label}</Badge>
                    <Badge className={`text-[10px] ${REUNIAO_CFG[form.reuniao].cls}`}>{REUNIAO_CFG[form.reuniao].label}</Badge>
                  </div>
                </div>
              </section>

              {form.tags.length > 0 && (
                <section className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map(t => (
                      <span key={t} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-muted text-muted-foreground border border-border">
                        <Tag size={9} className="mr-1" />{t}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Acesso ao Portal */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Acesso ao Portal</p>
                <p className="text-xs text-muted-foreground">
                  Envie um convite para <span className="text-foreground font-medium">{client.email}</span> — o cliente receberá um link para criar a senha e acessar o portal.
                </p>
                {inviteStatus === 'done' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2.5">
                      <CheckSquare size={13} />
                      Acesso criado! Envie as credenciais abaixo para o cliente.
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">E-mail</p>
                      <div className="flex gap-2">
                        <input readOnly value={client.email} className="flex-1 min-w-0 rounded-lg bg-muted border border-border px-3 py-2 text-xs text-muted-foreground truncate focus:outline-none" />
                        <button onClick={() => copiar(client.email, 'email')} className="shrink-0 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                          {copiedEmail ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-2">Senha temporária</p>
                      <div className="flex gap-2">
                        <input readOnly value={senhaTmp} className="flex-1 min-w-0 rounded-lg bg-muted border border-border px-3 py-2 text-xs text-muted-foreground truncate focus:outline-none" />
                        <button onClick={() => copiar(senhaTmp, 'senha')} className="shrink-0 px-3 py-2 rounded-lg bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all">
                          {copiedSenha ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Link de acesso: <span className="text-foreground">centrodecomando-two.vercel.app/login</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inviteStatus === 'error' && (
                      <div className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2.5">
                        {inviteError ?? 'Erro ao criar acesso.'}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Senha temporária</label>
                      <input
                        type="text"
                        value={senhaTmp}
                        onChange={e => setSenhaTmp(e.target.value)}
                        placeholder="Ex: Orbita@2026"
                        className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <button
                      onClick={criarAcesso}
                      disabled={inviting || !client.email || senhaTmp.length < 6}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-40 text-xs font-medium transition-all border border-primary/20"
                    >
                      {inviting ? 'Criando acesso...' : 'Criar acesso'}
                    </button>
                  </div>
                )}
              </section>
            </>
          ) : (
            /* ── Edit mode ── */
            <>
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Pessoais</p>
                <div><label className={lbl}>Nome</label><input value={form.name} onChange={f('name')} className={inp} /></div>
                <div><label className={lbl}>Email</label><input value={form.email} onChange={f('email')} className={inp} /></div>
                <div><label className={lbl}>Telefone</label><input value={form.phone} onChange={f('phone')} className={inp} /></div>
                <div><label className={lbl}>CPF</label><input value={form.cpf} onChange={f('cpf')} className={inp} placeholder="000.000.000-00" /></div>
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Empresariais</p>
                <div><label className={lbl}>Empresa</label><input value={form.company} onChange={f('company')} className={inp} /></div>
                <div><label className={lbl}>CNPJ</label><input value={form.cnpj} onChange={f('cnpj')} className={inp} placeholder="00.000.000/0001-00" /></div>
                <div><label className={lbl}>Instagram</label><input value={form.instagram} onChange={f('instagram')} className={inp} placeholder="@conta" /></div>
                <div><label className={lbl}>Website</label><input value={form.website} onChange={f('website')} className={inp} /></div>
                <div><label className={lbl}>Endereço</label><input value={form.address} onChange={f('address')} className={inp} /></div>
                <div><label className={lbl}>Segmento</label><input value={form.segment} onChange={f('segment')} className={inp} placeholder="Ex: Moda, Fitness..." /></div>
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Contrato</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Status</label>
                    <select value={form.status} onChange={f('status')} className={inp + ' cursor-pointer'}>
                      {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Plano</label>
                    <select value={form.plan} onChange={f('plan')} className={inp + ' cursor-pointer'}>
                      {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className={lbl}>MRR</label><input value={form.mrr} onChange={f('mrr')} className={inp} placeholder="R$ 0,00" /></div>
                <div><label className={lbl}>Cliente desde</label><input value={form.since} onChange={f('since')} className={inp} placeholder="Jan/24" /></div>
              </section>

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Operação</p>
                <div><label className={lbl}>Responsável</label><input value={form.assignee} onChange={f('assignee')} className={inp} placeholder="Nome do responsável" /></div>
              </section>

              <section className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Notas</p>
                <textarea
                  value={form.notes}
                  onChange={f('notes')}
                  rows={3}
                  placeholder="Observações sobre o cliente..."
                  className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </section>

              {areas.length > 0 && (
                <section className="space-y-2.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Serviços</p>
                  <div className="flex flex-wrap gap-1.5">
                    {areas.map(area => {
                      const on = form.servicos.includes(area)
                      return (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setForm(p => ({
                            ...p,
                            servicos: on ? p.servicos.filter(s => s !== area) : [...p.servicos, area],
                          }))}
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                            on
                              ? 'bg-primary/15 text-primary border-primary/40'
                              : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                          }`}
                        >
                          {area}
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Comercial</p>
                <div>
                  <label className={lbl}>Etapa do Pipeline</label>
                  <select value={form.pipelineStage} onChange={f('pipelineStage')} className={inp + ' cursor-pointer'}>
                    <option value="">Sem etapa</option>
                    {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={lbl}>Contrato</label>
                    <select value={form.contrato} onChange={f('contrato')} className={inp + ' cursor-pointer'}>
                      <option value="sem_contrato">Sem contrato</option>
                      <option value="contrato_enviado">Contrato Enviado</option>
                      <option value="contrato_assinado">Contrato Assinado</option>
                    </select>
                  </div>
                  <div>
                    <label className={lbl}>Reunião</label>
                    <select value={form.reuniao} onChange={f('reuniao')} className={inp + ' cursor-pointer'}>
                      <option value="sem_reuniao">Sem reunião</option>
                      <option value="com_reuniao">Com reunião</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Tags</p>
                <TagInput tags={form.tags} onChange={tags => setForm(p => ({ ...p, tags }))} />
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
            <button onClick={() => { setForm(client); setEditing(false) }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
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

// ─── NewClientPanel ───────────────────────────────────────────────────────────

function NewClientPanel({ areas, onClose, onCreate }: { areas: string[]; onClose: () => void; onCreate: (c: Omit<Client, 'id'>) => void }) {
  const [form, setForm] = useState<Partial<Client>>({
    status: 'active', plan: 'Starter', mrr: 'R$ 0', since: '',
    assignee: '', assigneeInitials: '', tasks: 0, notes: '', servicos: [],
    tags: [], contrato: 'sem_contrato', reuniao: 'sem_reuniao', pipelineStage: '',
  })
  const [saving, setSaving] = useState(false)

  function f(key: keyof Client) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
    }
  }

  async function create() {
    if (!form.name?.trim() || !form.company?.trim()) return
    setSaving(true)
    await onCreate({
      name: form.name!, email: form.email ?? '', phone: form.phone ?? '', cpf: form.cpf ?? '',
      company: form.company!, cnpj: form.cnpj ?? '', instagram: form.instagram ?? '',
      website: form.website ?? '', address: form.address ?? '', segment: form.segment ?? '',
      status: form.status!, plan: form.plan!, mrr: form.mrr!, since: form.since ?? '',
      assignee: form.assignee ?? '', assigneeInitials: form.assigneeInitials ?? '',
      tasks: 0, notes: form.notes ?? '', servicos: form.servicos ?? [],
      tags: form.tags ?? [], contrato: (form.contrato ?? 'sem_contrato') as Contrato,
      reuniao: (form.reuniao ?? 'sem_reuniao') as Reuniao, pipelineStage: form.pipelineStage ?? '',
      updatedAt: '',
    })
    setSaving(false)
  }

  const inp = 'w-full h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all'
  const lbl = 'block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1'

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-[460px] bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Novo cliente</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Pessoal</p>
            <div><label className={lbl}>Nome <span className="text-destructive">*</span></label><input value={form.name ?? ''} onChange={f('name')} className={inp} autoFocus /></div>
            <div><label className={lbl}>Email</label><input value={form.email ?? ''} onChange={f('email')} className={inp} /></div>
            <div><label className={lbl}>Telefone</label><input value={form.phone ?? ''} onChange={f('phone')} className={inp} /></div>
            <div><label className={lbl}>CPF</label><input value={form.cpf ?? ''} onChange={f('cpf')} className={inp} placeholder="000.000.000-00" /></div>
          </section>
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Empresa</p>
            <div><label className={lbl}>Empresa <span className="text-destructive">*</span></label><input value={form.company ?? ''} onChange={f('company')} className={inp} /></div>
            <div><label className={lbl}>CNPJ</label><input value={form.cnpj ?? ''} onChange={f('cnpj')} className={inp} placeholder="00.000.000/0001-00" /></div>
            <div><label className={lbl}>Instagram</label><input value={form.instagram ?? ''} onChange={f('instagram')} className={inp} placeholder="@conta" /></div>
            <div><label className={lbl}>Website</label><input value={form.website ?? ''} onChange={f('website')} className={inp} /></div>
            <div><label className={lbl}>Endereço</label><input value={form.address ?? ''} onChange={f('address')} className={inp} /></div>
            <div><label className={lbl}>Segmento</label><input value={form.segment ?? ''} onChange={f('segment')} className={inp} /></div>
          </section>
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Contrato</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Status</label>
                <select value={form.status} onChange={f('status')} className={inp + ' cursor-pointer'}>
                  {STATUSES.map(s => <option key={s} value={s}>{statusConfig[s].label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Plano</label>
                <select value={form.plan} onChange={f('plan')} className={inp + ' cursor-pointer'}>
                  {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div><label className={lbl}>MRR</label><input value={form.mrr ?? ''} onChange={f('mrr')} className={inp} placeholder="R$ 0,00" /></div>
            <div><label className={lbl}>Cliente desde</label><input value={form.since ?? ''} onChange={f('since')} className={inp} placeholder="Jan/24" /></div>
          </section>
          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Operação</p>
            <div><label className={lbl}>Responsável</label><input value={form.assignee ?? ''} onChange={f('assignee')} className={inp} placeholder="Nome do responsável" /></div>
          </section>
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Notas</p>
            <textarea value={form.notes ?? ''} onChange={f('notes')} rows={3} placeholder="Observações..." className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
          </section>

          {areas.length > 0 && (
            <section className="space-y-2.5">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Serviços</p>
              <div className="flex flex-wrap gap-1.5">
                {areas.map(area => {
                  const on = (form.servicos ?? []).includes(area)
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setForm(p => ({
                        ...p,
                        servicos: on ? (p.servicos ?? []).filter(s => s !== area) : [...(p.servicos ?? []), area],
                      }))}
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                        on
                          ? 'bg-primary/15 text-primary border-primary/40'
                          : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      {area}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Comercial</p>
            <div>
              <label className={lbl}>Etapa do Pipeline</label>
              <select value={form.pipelineStage ?? ''} onChange={f('pipelineStage')} className={inp + ' cursor-pointer'}>
                <option value="">Sem etapa</option>
                {PIPELINE_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contrato</label>
                <select value={form.contrato ?? 'sem_contrato'} onChange={f('contrato')} className={inp + ' cursor-pointer'}>
                  <option value="sem_contrato">Sem contrato</option>
                  <option value="contrato_enviado">Contrato Enviado</option>
                  <option value="contrato_assinado">Contrato Assinado</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Reunião</label>
                <select value={form.reuniao ?? 'sem_reuniao'} onChange={f('reuniao')} className={inp + ' cursor-pointer'}>
                  <option value="sem_reuniao">Sem reunião</option>
                  <option value="com_reuniao">Com reunião</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Tags</p>
            <TagInput tags={form.tags ?? []} onChange={tags => setForm(p => ({ ...p, tags }))} />
          </section>
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <Button size="sm" onClick={create} disabled={saving || !form.name?.trim() || !form.company?.trim()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            <Plus size={12} /> {saving ? 'Salvando...' : 'Criar cliente'}
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clients, setClients]     = useState<Client[]>([])
  const [selected, setSelected]   = useState<Client | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | Status>('all')
  const [userId, setUserId]       = useState<string | null>(null)
  const [areas, setAreas]         = useState<string[]>([])
  const [lunnaMap, setLunnaMap]   = useState<Record<string, boolean>>({})

  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const saved = user.user_metadata?.areas_de_atuacao
      if (Array.isArray(saved)) setAreas(saved)
      const { data } = await supabase
        .from('clientes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      if (!data) return
      const mapped = data.map(fromRow)
      setClients(mapped)

      // Load Lunna active status per client phone
      const jidMap: Record<string, string> = {} // jid → clientId
      for (const c of mapped) {
        const jid = phoneToJid(c.phone)
        if (jid) jidMap[jid] = c.id
      }
      const jids = Object.keys(jidMap)
      if (jids.length === 0) return
      const { data: pausas } = await supabase
        .from('lunna_pausas')
        .select('remote_jid')
        .eq('user_id', user.id)
        .in('remote_jid', jids)
      const pausedSet = new Set((pausas ?? []).map(p => p.remote_jid))
      const lMap: Record<string, boolean> = {}
      for (const [jid, clientId] of Object.entries(jidMap)) {
        lMap[clientId] = !pausedSet.has(jid)
      }
      setLunnaMap(lMap)
    }
    load()
  }, [])

  const filtered = useMemo(() => clients.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    }
    return true
  }), [clients, filter, search])

  async function handleSave(updated: Client) {
    if (!userId) return
    await supabase.from('clientes').update(toRow(updated, userId)).eq('id', updated.id)
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  async function handleDelete(id: string) {
    await supabase.from('clientes').delete().eq('id', id)
    setClients(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  async function handleCreate(data: Omit<Client, 'id'>) {
    if (!userId) return
    const assigneeInitials = data.assignee
      ? data.assignee.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
      : ''
    const row = {
      user_id: userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      company: data.company,
      cnpj: data.cnpj,
      instagram: data.instagram,
      website: data.website,
      address: data.address,
      segment: data.segment,
      status: data.status,
      plan: data.plan,
      mrr: data.mrr,
      since: data.since,
      assignee: data.assignee,
      assignee_initials: assigneeInitials,
      tasks: data.tasks,
      notes: data.notes,
      servicos: data.servicos,
      tags: data.tags,
      contrato: data.contrato,
      reuniao: data.reuniao,
      pipeline_stage: data.pipelineStage,
    }
    const { data: inserted, error } = await supabase.from('clientes').insert(row).select().single()
    if (error || !inserted) return
    const client = fromRow(inserted)
    setClients(prev => [...prev, client])
    setShowNew(false)
    setSelected(client)
  }

  const activeCount = clients.filter(c => c.status === 'active').length
  const mrrTotal    = clients.filter(c => c.status === 'active').reduce((sum, c) => {
    const n = parseFloat(c.mrr.replace(/[^\d,]/g, '').replace(',', '.')) || 0
    return sum + n
  }, 0)
  const ticket = activeCount > 0 ? mrrTotal / activeCount : 0

  const dynamicStats = [
    { label: 'Total Clientes', value: String(clients.length),                    icon: Users,      color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
    { label: 'Ativos',         value: String(activeCount),                       icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'MRR Total',      value: `R$ ${mrrTotal.toLocaleString('pt-BR')}`,  icon: DollarSign, color: 'text-amber-400',  bg: 'bg-amber-400/10'   },
    { label: 'Ticket Médio',   value: `R$ ${Math.round(ticket).toLocaleString('pt-BR')}`, icon: BarChart3, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  ]

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {dynamicStats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative max-w-xs w-full">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar clientes..."
              className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
          {([['all', 'Todos'], ['active', 'Ativos'], ['paused', 'Pausados'], ['churned', 'Churned']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                filter === val
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="h-8 bg-primary hover:bg-primary/90 text-xs shrink-0">
          <Plus size={14} /> Novo cliente
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Cliente', 'Telefone', 'Área', 'Tags', 'Pipeline', 'Atribuído', 'IA', 'Contrato', 'Reunião', 'Atualização', ''].map(h => (
                    <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => {
                  const pipe = pipelineCls(client.pipelineStage)
                  const iaActive = lunnaMap[client.id]
                  const iaKnown  = client.phone && iaActive !== undefined
                  return (
                    <tr
                      key={client.id}
                      onClick={() => setSelected(client)}
                      className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                    >
                      {/* Nome */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                              {client.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">{client.name}</p>
                            {client.company && <p className="text-[10px] text-muted-foreground whitespace-nowrap">{client.company}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Telefone */}
                      <td className="px-3 py-3">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{client.phone || '—'}</span>
                      </td>
                      {/* Área (servicos) */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {client.servicos.slice(0, 2).map(s => (
                            <span key={s} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20 whitespace-nowrap">{s}</span>
                          ))}
                          {client.servicos.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">+{client.servicos.length - 2}</span>
                          )}
                          {client.servicos.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      {/* Tags */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[120px]">
                          {client.tags.slice(0, 2).map(t => (
                            <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border bg-muted text-muted-foreground border-border whitespace-nowrap">{t}</span>
                          ))}
                          {client.tags.length > 2 && (
                            <span className="text-[9px] text-muted-foreground">+{client.tags.length - 2}</span>
                          )}
                          {client.tags.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </td>
                      {/* Pipeline */}
                      <td className="px-3 py-3">
                        {pipe
                          ? <Badge className={`text-[9px] whitespace-nowrap ${pipe.cls}`}>{pipe.label}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Atribuído */}
                      <td className="px-3 py-3">
                        {client.assignee ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
                                {client.assigneeInitials || client.assignee[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{client.assignee}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* IA */}
                      <td className="px-3 py-3">
                        {iaKnown ? (
                          <Badge className={`text-[9px] gap-1 ${iaActive ? 'bg-primary/15 text-primary border-primary/20' : 'bg-muted text-muted-foreground border-border'}`}>
                            <Bot size={8} />{iaActive ? 'Ativa' : 'Pausada'}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Contrato */}
                      <td className="px-3 py-3">
                        <Badge className={`text-[9px] whitespace-nowrap ${CONTRATO_CFG[client.contrato].cls}`}>
                          {CONTRATO_CFG[client.contrato].label}
                        </Badge>
                      </td>
                      {/* Reunião */}
                      <td className="px-3 py-3">
                        <Badge className={`text-[9px] whitespace-nowrap ${REUNIAO_CFG[client.reuniao].cls}`}>
                          {REUNIAO_CFG[client.reuniao].label}
                        </Badge>
                      </td>
                      {/* Última atualização */}
                      <td className="px-3 py-3">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtUpdatedAt(client.updatedAt)}</span>
                      </td>
                      <td className="px-3 py-3">
                        <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-12 text-center">
                      <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Panels */}
      {selected && (
        <ClientPanel
          client={selected}
          areas={areas}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {showNew && (
        <NewClientPanel
          areas={areas}
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
