'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Plus, Search, Users, TrendingUp, DollarSign, BarChart3,
  AtSign, Mail, Phone, X, Building2, Globe, MapPin,
  FileText, Pencil, Trash2, Save, ChevronRight,
  Hash, CreditCard, CheckSquare, Calendar,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'active' | 'paused' | 'churned'

interface Client {
  id: number
  // Pessoal
  name: string
  email: string
  phone: string
  cpf: string
  // Empresa
  company: string
  cnpj: string
  instagram: string
  website: string
  address: string
  segment: string
  // Contrato
  status: Status
  plan: string
  mrr: string
  since: string
  // Operação
  assignee: string
  assigneeInitials: string
  tasks: number
  notes: string
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
const ASSIGNEES = [
  { name: 'Maria G.',  initials: 'MG' },
  { name: 'Carlos F.', initials: 'CF' },
  { name: 'Lucas R.',  initials: 'LR' },
  { name: 'Camila',    initials: 'CA' },
]

// ─── Mock data ────────────────────────────────────────────────────────────────

const INITIAL_CLIENTS: Client[] = [
  {
    id: 1, name: 'Ana Beatriz', email: 'ana@lojabloom.com', phone: '(11) 99234-5678', cpf: '123.456.789-00',
    company: 'Loja Bloom', cnpj: '12.345.678/0001-99', instagram: '@lojabloom', website: 'lojabloom.com.br',
    address: 'Rua das Flores, 123 – São Paulo, SP', segment: 'Moda & Lifestyle',
    status: 'active', plan: 'Premium', mrr: 'R$ 4.500', since: 'Jan/24',
    assignee: 'Maria G.', assigneeInitials: 'MG', tasks: 5, notes: 'Cliente VIP. Reunião quinzenal toda segunda.',
  },
  {
    id: 2, name: 'Carlos Mendes', email: 'carlos@studiofit.com', phone: '(11) 98765-4321', cpf: '987.654.321-00',
    company: 'Studio Fit', cnpj: '98.765.432/0001-10', instagram: '@studiofit', website: 'studiofit.com.br',
    address: 'Av. Paulista, 1000 – São Paulo, SP', segment: 'Fitness & Saúde',
    status: 'active', plan: 'Pro', mrr: 'R$ 2.800', since: 'Mar/24',
    assignee: 'Carlos F.', assigneeInitials: 'CF', tasks: 3, notes: '',
  },
  {
    id: 3, name: 'Fernanda Lima', email: 'fe@cafeaurora.com', phone: '(21) 97654-3210', cpf: '456.789.123-00',
    company: 'Café Aurora', cnpj: '45.678.912/0001-34', instagram: '@cafeaurora', website: 'cafeaurora.com.br',
    address: 'Rua do Catete, 200 – Rio de Janeiro, RJ', segment: 'Alimentação',
    status: 'active', plan: 'Premium', mrr: 'R$ 3.200', since: 'Fev/24',
    assignee: 'Lucas R.', assigneeInitials: 'LR', tasks: 7, notes: 'Precisa de relatório semanal toda sexta.',
  },
  {
    id: 4, name: 'Diego Rocha', email: 'diego@techsolve.com', phone: '(31) 96543-2109', cpf: '321.654.987-00',
    company: 'Tech Solve', cnpj: '32.165.498/0001-76', instagram: '@techsolve', website: 'techsolve.com.br',
    address: 'Av. Afonso Pena, 500 – Belo Horizonte, MG', segment: 'Tecnologia',
    status: 'active', plan: 'Starter', mrr: 'R$ 1.400', since: 'Abr/24',
    assignee: 'Maria G.', assigneeInitials: 'MG', tasks: 2, notes: '',
  },
  {
    id: 5, name: 'Juliana Santos', email: 'ju@belezapura.com', phone: '(41) 95432-1098', cpf: '654.321.987-00',
    company: 'Beleza Pura', cnpj: '65.432.198/0001-54', instagram: '@belezapura', website: '',
    address: 'Rua XV de Novembro, 300 – Curitiba, PR', segment: 'Beleza & Estética',
    status: 'paused', plan: 'Pro', mrr: 'R$ 0', since: 'Mai/24',
    assignee: 'Carlos F.', assigneeInitials: 'CF', tasks: 0, notes: 'Pausado por férias da cliente. Retorno em julho.',
  },
  {
    id: 6, name: 'Roberto Maia', email: 'rob@constrrj.com', phone: '(21) 94321-0987', cpf: '789.123.456-00',
    company: 'Construção RJ', cnpj: '78.912.345/0001-23', instagram: '@constrrj', website: '',
    address: 'Rua Visconde de Pirajá, 400 – Rio de Janeiro, RJ', segment: 'Construção Civil',
    status: 'churned', plan: 'Starter', mrr: 'R$ 0', since: 'Jun/23',
    assignee: 'Lucas R.', assigneeInitials: 'LR', tasks: 0, notes: 'Saiu por corte de budget.',
  },
]

const stats = [
  { label: 'Total Clientes', value: '6',          icon: Users,      color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
  { label: 'Ativos',         value: '4',          icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'MRR Total',      value: 'R$ 11.900',  icon: DollarSign, color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  { label: 'Ticket Médio',   value: 'R$ 2.975',   icon: BarChart3,  color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
]

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
  onClose,
  onSave,
  onDelete,
}: {
  client: Client
  onClose: () => void
  onSave: (c: Client) => void
  onDelete: (id: number) => void
}) {
  const [editing, setEditing]   = useState(false)
  const [form, setForm]         = useState<Client>(client)

  const initials = client.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

  function f(key: keyof Client) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      if (key === 'assignee') {
        const a = ASSIGNEES.find(x => x.name === val)
        setForm(p => ({ ...p, assignee: val, assigneeInitials: a?.initials ?? p.assigneeInitials }))
      } else {
        setForm(p => ({ ...p, [key]: val }))
      }
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
              {/* Pessoal */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Pessoais</p>
                <InfoRow icon={Mail}       label="Email"    value={form.email}   />
                <InfoRow icon={Phone}      label="Telefone" value={form.phone}   />
                <InfoRow icon={CreditCard} label="CPF"      value={form.cpf}     />
              </section>

              {/* Empresa */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Empresariais</p>
                <InfoRow icon={Building2} label="Empresa"   value={form.company}   />
                <InfoRow icon={Hash}      label="CNPJ"      value={form.cnpj}      />
                <InfoRow icon={AtSign}    label="Instagram" value={form.instagram} />
                <InfoRow icon={Globe}     label="Website"   value={form.website}   />
                <InfoRow icon={MapPin}    label="Endereço"  value={form.address}   />
                <InfoRow icon={BarChart3} label="Segmento"  value={form.segment}   />
              </section>

              {/* Contrato */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Contrato</p>
                <InfoRow icon={FileText}  label="Plano"   value={form.plan}  />
                <InfoRow icon={DollarSign}label="MRR"     value={form.mrr}   />
                <InfoRow icon={Calendar}  label="Cliente desde" value={form.since} />
              </section>

              {/* Operação */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Operação</p>
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-6 h-6 shrink-0">
                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">{form.assigneeInitials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Responsável</p>
                    <p className="text-xs text-foreground mt-0.5">{form.assignee}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckSquare size={13} className="text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Tarefas abertas</p>
                    <p className="text-xs text-foreground mt-0.5">{form.tasks > 0 ? `${form.tasks} tarefas` : 'Nenhuma'}</p>
                  </div>
                </div>
              </section>

              {/* Notas */}
              {form.notes && (
                <section className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Notas</p>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{form.notes}</p>
                </section>
              )}
            </>
          ) : (
            /* ── Edit mode ── */
            <>
              {/* Pessoal */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Pessoais</p>
                <div><label className={lbl}>Nome</label><input value={form.name} onChange={f('name')} className={inp} /></div>
                <div><label className={lbl}>Email</label><input value={form.email} onChange={f('email')} className={inp} /></div>
                <div><label className={lbl}>Telefone</label><input value={form.phone} onChange={f('phone')} className={inp} /></div>
                <div><label className={lbl}>CPF</label><input value={form.cpf} onChange={f('cpf')} className={inp} placeholder="000.000.000-00" /></div>
              </section>

              {/* Empresa */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Informações Empresariais</p>
                <div><label className={lbl}>Empresa</label><input value={form.company} onChange={f('company')} className={inp} /></div>
                <div><label className={lbl}>CNPJ</label><input value={form.cnpj} onChange={f('cnpj')} className={inp} placeholder="00.000.000/0001-00" /></div>
                <div><label className={lbl}>Instagram</label><input value={form.instagram} onChange={f('instagram')} className={inp} placeholder="@conta" /></div>
                <div><label className={lbl}>Website</label><input value={form.website} onChange={f('website')} className={inp} placeholder="site.com.br" /></div>
                <div><label className={lbl}>Endereço</label><input value={form.address} onChange={f('address')} className={inp} /></div>
                <div><label className={lbl}>Segmento</label><input value={form.segment} onChange={f('segment')} className={inp} placeholder="Ex: Moda, Fitness..." /></div>
              </section>

              {/* Contrato */}
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

              {/* Operação */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Operação</p>
                <div>
                  <label className={lbl}>Responsável</label>
                  <select value={form.assignee} onChange={f('assignee')} className={inp + ' cursor-pointer'}>
                    {ASSIGNEES.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
                  </select>
                </div>
              </section>

              {/* Notas */}
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

function NewClientPanel({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Client) => void }) {
  const [form, setForm] = useState<Partial<Client>>({
    status: 'active', plan: 'Starter', mrr: 'R$ 0', since: '',
    assignee: ASSIGNEES[0].name, assigneeInitials: ASSIGNEES[0].initials, tasks: 0, notes: '',
  })

  function f(key: keyof Client) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.target.value
      if (key === 'assignee') {
        const a = ASSIGNEES.find(x => x.name === val)
        setForm(p => ({ ...p, assignee: val, assigneeInitials: a?.initials ?? '' }))
      } else {
        setForm(p => ({ ...p, [key]: val }))
      }
    }
  }

  function create() {
    if (!form.name?.trim() || !form.company?.trim()) return
    onCreate({
      id: Date.now(),
      name: form.name!, email: form.email ?? '', phone: form.phone ?? '', cpf: form.cpf ?? '',
      company: form.company!, cnpj: form.cnpj ?? '', instagram: form.instagram ?? '',
      website: form.website ?? '', address: form.address ?? '', segment: form.segment ?? '',
      status: form.status!, plan: form.plan!, mrr: form.mrr!, since: form.since ?? '',
      assignee: form.assignee!, assigneeInitials: form.assigneeInitials!,
      tasks: 0, notes: form.notes ?? '',
    })
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
            <div>
              <label className={lbl}>Responsável</label>
              <select value={form.assignee} onChange={f('assignee')} className={inp + ' cursor-pointer'}>
                {ASSIGNEES.map(a => <option key={a.name} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          </section>
          <section className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold border-b border-border pb-1.5">Notas</p>
            <textarea value={form.notes ?? ''} onChange={f('notes')} rows={3} placeholder="Observações..." className="w-full resize-none rounded-lg bg-muted border border-border px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
          </section>
        </div>
        <div className="px-5 py-4 border-t border-border flex items-center justify-between shrink-0">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
          <Button size="sm" onClick={create} disabled={!form.name?.trim() || !form.company?.trim()} className="h-8 bg-primary hover:bg-primary/90 text-xs gap-1.5">
            <Plus size={12} /> Criar cliente
          </Button>
        </div>
      </div>
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clients, setClients]     = useState(INITIAL_CLIENTS)
  const [selected, setSelected]   = useState<Client | null>(null)
  const [showNew, setShowNew]     = useState(false)
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState<'all' | Status>('all')

  const filtered = useMemo(() => clients.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    }
    return true
  }), [clients, filter, search])

  function handleSave(updated: Client) {
    setClients(prev => prev.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  function handleDelete(id: number) {
    setClients(prev => prev.filter(c => c.id !== id))
    setSelected(null)
  }

  function handleCreate(c: Client) {
    setClients(prev => [...prev, c])
    setShowNew(false)
    setSelected(c)
  }

  const activeCount  = clients.filter(c => c.status === 'active').length
  const mrrTotal     = clients.filter(c => c.status === 'active').reduce((sum, c) => {
    const n = parseFloat(c.mrr.replace(/[^\d,]/g, '').replace(',', '.')) || 0
    return sum + n
  }, 0)
  const ticket = activeCount > 0 ? mrrTotal / activeCount : 0

  const dynamicStats = [
    { label: 'Total Clientes', value: String(clients.length),              icon: Users,      color: 'text-orange-400',  bg: 'bg-orange-400/10'  },
    { label: 'Ativos',         value: String(activeCount),                 icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'MRR Total',      value: `R$ ${mrrTotal.toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-amber-400',  bg: 'bg-amber-400/10'   },
    { label: 'Ticket Médio',   value: `R$ ${Math.round(ticket).toLocaleString('pt-BR')}`,   icon: BarChart3,  color: 'text-sky-400',    bg: 'bg-sky-400/10'     },
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
                  {['Cliente', 'Status', 'Plano', 'MRR', 'Instagram', 'Responsável', 'Tarefas', 'Desde', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(client => (
                  <tr
                    key={client.id}
                    onClick={() => setSelected(client)}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                            {client.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">{client.name}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{client.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${statusConfig[client.status].cls}`}>
                        {statusConfig[client.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${planColor[client.plan] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {client.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-foreground whitespace-nowrap">{client.mrr}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                        <AtSign size={11} /> {client.instagram}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                            {client.assigneeInitials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{client.assignee}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium whitespace-nowrap ${client.tasks > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {client.tasks > 0 ? `${client.tasks} abertas` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{client.since}</span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center">
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
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
      {showNew && (
        <NewClientPanel
          onClose={() => setShowNew(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
