'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/contexts/empresa-context'
import {
  Building2, Rocket, Eye, Heart, Users, Palette,
  MessageSquare, Briefcase, Pencil, CheckCircle2, Loader2,
  Globe, Phone, Mail, MapPin, BookOpen,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface DadosEmpresa {
  razao_social: string
  nome_fantasia: string
  cnpj: string
  endereco: string
  cep: string
  cidade: string
  estado: string
  telefone: string
  email: string
  site: string
}

interface Estrutura {
  id: string
  empresa_id: string
  dados: DadosEmpresa
  missao: string
  visao: string
  valores: string
  cultura: string
  publico: string
  persona: string
  manual_marca: string
  linguagem: string
  o_que_fazemos: string
  updated_at: string
}

const emptyDados: DadosEmpresa = {
  razao_social: '', nome_fantasia: '', cnpj: '',
  endereco: '', cep: '', cidade: '', estado: '',
  telefone: '', email: '', site: '',
}

function blank(empresa_id: string): Omit<Estrutura, 'id' | 'updated_at'> {
  return {
    empresa_id,
    dados: emptyDados,
    missao: '', visao: '', valores: '', cultura: '',
    publico: '', persona: '', manual_marca: '', linguagem: '', o_que_fazemos: '',
  }
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = 'w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all'
const lbl = 'text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5'

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Secao({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Inline save buttons ──────────────────────────────────────────────────────

function SaveBar({ onCancel, onSave, saving }: { onCancel: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-2 mt-4">
      <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
        Cancelar
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
        Salvar
      </button>
    </div>
  )
}

// ─── Text section ─────────────────────────────────────────────────────────────

function TextSecao({ value, onSave, placeholder, rows = 5 }: {
  value: string
  onSave: (v: string) => Promise<void>
  placeholder: string
  rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { setDraft(value) }, [value])

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        {value
          ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{value}</p>
          : <p className="text-sm text-muted-foreground/40 italic">{placeholder}</p>
        }
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Pencil size={12} /> Editar
        </button>
      </div>
    )
  }

  return (
    <div>
      <textarea autoFocus value={draft} onChange={e => setDraft(e.target.value)} rows={rows}
        className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
      <SaveBar onCancel={() => { setEditing(false); setDraft(value) }} onSave={handleSave} saving={saving} />
    </div>
  )
}

// ─── Dual text section (two separate fields in one card) ──────────────────────

function DualTextSecao({ valueA, valueB, labelA, labelB, placeholderA, placeholderB, onSave, rows = 5 }: {
  valueA: string; valueB: string
  labelA: string; labelB: string
  placeholderA: string; placeholderB: string
  onSave: (a: string, b: string) => Promise<void>
  rows?: number
}) {
  const [editing, setEditing] = useState(false)
  const [draftA, setDraftA]   = useState(valueA)
  const [draftB, setDraftB]   = useState(valueB)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { setDraftA(valueA); setDraftB(valueB) }, [valueA, valueB])

  async function handleSave() {
    setSaving(true)
    await onSave(draftA, draftB)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{labelA}</p>
          {valueA
            ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{valueA}</p>
            : <p className="text-sm text-muted-foreground/40 italic">{placeholderA}</p>
          }
        </div>
        <div>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{labelB}</p>
          {valueB
            ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{valueB}</p>
            : <p className="text-sm text-muted-foreground/40 italic">{placeholderB}</p>
          }
        </div>
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Pencil size={12} /> Editar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={lbl}>{labelA}</label>
        <textarea autoFocus value={draftA} onChange={e => setDraftA(e.target.value)} rows={rows}
          className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
      </div>
      <div>
        <label className={lbl}>{labelB}</label>
        <textarea value={draftB} onChange={e => setDraftB(e.target.value)} rows={rows}
          className="w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
      </div>
      <SaveBar onCancel={() => { setEditing(false); setDraftA(valueA); setDraftB(valueB) }} onSave={handleSave} saving={saving} />
    </div>
  )
}

// ─── Dados section ────────────────────────────────────────────────────────────

function DadosSecao({ dados, onSave }: { dados: DadosEmpresa; onSave: (d: DadosEmpresa) => Promise<void> }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState<DadosEmpresa>(dados)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { setDraft(dados) }, [dados])

  const set = (k: keyof DadosEmpresa) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft(prev => ({ ...prev, [k]: e.target.value }))

  async function handleSave() {
    setSaving(true)
    await onSave(draft)
    setSaving(false)
    setEditing(false)
  }

  if (!editing) {
    const hasData = Object.values(dados).some(v => v.trim())
    return (
      <div className="space-y-3">
        {hasData ? (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {dados.razao_social && (
              <InfoRow label="Razão Social" value={dados.razao_social} />
            )}
            {dados.nome_fantasia && (
              <InfoRow label="Nome Fantasia" value={dados.nome_fantasia} />
            )}
            {dados.cnpj && (
              <InfoRow label="CNPJ" value={dados.cnpj} />
            )}
            {dados.telefone && (
              <InfoRow label="Telefone" value={dados.telefone} icon={<Phone size={11} />} />
            )}
            {dados.email && (
              <InfoRow label="E-mail" value={dados.email} icon={<Mail size={11} />} />
            )}
            {dados.site && (
              <InfoRow label="Site" value={dados.site} icon={<Globe size={11} />} link />
            )}
            {(dados.endereco || dados.cidade) && (
              <InfoRow
                label="Endereço"
                value={[dados.endereco, dados.cidade, dados.estado, dados.cep].filter(Boolean).join(', ')}
                icon={<MapPin size={11} />}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/40 italic">Nenhum dado cadastrado</p>
        )}
        <button onClick={() => setEditing(true)}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
          <Pencil size={12} /> Editar
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Razão Social</label>
          <input value={draft.razao_social} onChange={set('razao_social')} placeholder="Nome jurídico da empresa" className={inp} />
        </div>
        <div>
          <label className={lbl}>Nome Fantasia</label>
          <input value={draft.nome_fantasia} onChange={set('nome_fantasia')} placeholder="Como é conhecida" className={inp} />
        </div>
        <div>
          <label className={lbl}>CNPJ</label>
          <input value={draft.cnpj} onChange={set('cnpj')} placeholder="00.000.000/0000-00" className={inp} />
        </div>
        <div>
          <label className={lbl}>Telefone</label>
          <input value={draft.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" className={inp} />
        </div>
        <div>
          <label className={lbl}>E-mail</label>
          <input type="email" value={draft.email} onChange={set('email')} placeholder="contato@empresa.com" className={inp} />
        </div>
        <div>
          <label className={lbl}>Site</label>
          <input value={draft.site} onChange={set('site')} placeholder="https://empresa.com" className={inp} />
        </div>
      </div>
      <div>
        <label className={lbl}>Endereço</label>
        <input value={draft.endereco} onChange={set('endereco')} placeholder="Rua, número, complemento" className={inp} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={lbl}>CEP</label>
          <input value={draft.cep} onChange={set('cep')} placeholder="00000-000" className={inp} />
        </div>
        <div>
          <label className={lbl}>Cidade</label>
          <input value={draft.cidade} onChange={set('cidade')} placeholder="São Paulo" className={inp} />
        </div>
        <div>
          <label className={lbl}>Estado</label>
          <input value={draft.estado} onChange={set('estado')} placeholder="SP" className={inp} />
        </div>
      </div>
      <SaveBar onCancel={() => { setEditing(false); setDraft(dados) }} onSave={handleSave} saving={saving} />
    </div>
  )
}

function InfoRow({ label, value, icon, link }: { label: string; value: string; icon?: React.ReactNode; link?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {link
          ? <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer"
              className="text-sm text-primary hover:underline truncate">{value}</a>
          : <p className="text-sm text-foreground">{value}</p>
        }
      </div>
    </div>
  )
}

// ─── Main Module ──────────────────────────────────────────────────────────────

export function EstruturaModule() {
  const supabase = createClient()
  const { empresaId } = useEmpresa()
  const [estrutura, setEstrutura] = useState<Estrutura | null>(null)
  const [loading, setLoading]     = useState(true)

  const load = useCallback(async () => {
    if (!empresaId) { setLoading(false); return }
    const { data } = await supabase
      .from('empresa_estrutura')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle()
    setEstrutura(data as Estrutura | null)
    setLoading(false)
  }, [supabase, empresaId])

  useEffect(() => { load() }, [load])

  async function save(fields: Partial<Omit<Estrutura, 'id' | 'updated_at'>>) {
    if (!empresaId) return
    const payload = {
      ...(estrutura ?? blank(empresaId)),
      ...fields,
      empresa_id: empresaId,
      updated_at: new Date().toISOString(),
    }
    const { data } = await supabase
      .from('empresa_estrutura')
      .upsert(payload, { onConflict: 'empresa_id' })
      .select()
      .single()
    if (data) setEstrutura(data as Estrutura)
  }

  if (!empresaId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Building2 size={32} className="text-muted-foreground/20 mb-3" />
        <p className="text-sm text-muted-foreground">Selecione uma empresa na barra lateral para ver a estrutura.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  const e = estrutura ?? blank(empresaId)

  return (
    <div className="space-y-5 max-w-[860px]">

      {/* Dados */}
      <Secao icon={<Building2 size={16} />} title="Dados da Empresa">
        <DadosSecao
          dados={e.dados}
          onSave={dados => save({ dados })}
        />
      </Secao>

      {/* Missão */}
      <Secao icon={<Rocket size={16} />} title="Missão">
        <TextSecao
          value={e.missao}
          onSave={missao => save({ missao })}
          placeholder="Qual é o propósito da empresa? Por que ela existe?"
          rows={4}
        />
      </Secao>

      {/* Visão */}
      <Secao icon={<Eye size={16} />} title="Visão">
        <TextSecao
          value={e.visao}
          onSave={visao => save({ visao })}
          placeholder="Onde a empresa quer chegar? Qual é o futuro desejado?"
          rows={4}
        />
      </Secao>

      {/* Valores & Cultura */}
      <Secao icon={<Heart size={16} />} title="Valores & Cultura Organizacional">
        <DualTextSecao
          valueA={e.valores}
          valueB={e.cultura}
          labelA="Valores"
          labelB="Cultura Organizacional"
          placeholderA="Liste os valores que guiam a empresa: integridade, inovação, colaboração..."
          placeholderB="Como é o ambiente interno? Quais comportamentos são valorizados?"
          onSave={(valores, cultura) => save({ valores, cultura })}
          rows={5}
        />
      </Secao>

      {/* Público e Persona */}
      <Secao icon={<Users size={16} />} title="Público e Persona">
        <DualTextSecao
          valueA={e.publico}
          valueB={e.persona}
          labelA="Público-Alvo"
          labelB="Persona"
          placeholderA="Quem é o público da empresa? Faixa etária, perfil, dores, desejos..."
          placeholderB="Descreva a persona detalhada: nome, rotina, objetivos, frustrações..."
          onSave={(publico, persona) => save({ publico, persona })}
          rows={6}
        />
      </Secao>

      {/* Manual de Marca */}
      <Secao icon={<Palette size={16} />} title="Manual de Marca e Identidade Visual">
        <TextSecao
          value={e.manual_marca}
          onSave={manual_marca => save({ manual_marca })}
          placeholder="Descreva as diretrizes visuais: cores, tipografia, logo, aplicações, restrições... Cole links para arquivos externos se preferir."
          rows={7}
        />
      </Secao>

      {/* Linguagem */}
      <Secao icon={<MessageSquare size={16} />} title="Linguagem">
        <TextSecao
          value={e.linguagem}
          onSave={linguagem => save({ linguagem })}
          placeholder="Como a marca se comunica? Tom de voz, vocabulário, estilo de escrita, o que evitar..."
          rows={6}
        />
      </Secao>

      {/* O Que Fazemos */}
      <Secao icon={<Briefcase size={16} />} title="O Que Fazemos">
        <TextSecao
          value={e.o_que_fazemos}
          onSave={o_que_fazemos => save({ o_que_fazemos })}
          placeholder="Descreva os serviços e produtos oferecidos, metodologia de trabalho, diferenciais..."
          rows={6}
        />
      </Secao>

    </div>
  )
}
