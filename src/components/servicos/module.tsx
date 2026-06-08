'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Search, X, Pencil, Trash2, ChevronRight,
  Wrench, DollarSign, GripVertical, Check, Tag,
  Clock, User, ArrowUp, ArrowDown,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresa } from '@/contexts/empresa-context'

// ─── Types ───────────────────────────────────────────────────────────────────

type ValorTipo = 'fixo' | 'por_hora' | 'sob_consulta' | 'range'

type Etapa = {
  id: string
  servico_id: string
  titulo: string
  descricao: string
  responsavel: string
  duracao: string
  ordem: number
}

type Servico = {
  id: string
  user_id: string
  empresa_id: string | null
  nome: string
  descricao: string
  categoria: string
  valor_tipo: ValorTipo
  valor: number | null
  valor_max: number | null
  ativo: boolean
  created_at: string
  etapas: Etapa[]
}

type EtapaDraft = Omit<Etapa, 'id' | 'servico_id'>

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIAS = [
  'Consultoria', 'Design', 'Desenvolvimento', 'Marketing', 'Gestão',
  'Treinamento', 'Suporte', 'Produção', 'Outros',
]

const VALOR_TIPOS: { value: ValorTipo; label: string }[] = [
  { value: 'fixo',         label: 'Valor fixo' },
  { value: 'por_hora',     label: 'Por hora' },
  { value: 'range',        label: 'Faixa de valor' },
  { value: 'sob_consulta', label: 'Sob consulta' },
]

const CAT_COLORS: Record<string, string> = {
  Consultoria:   'bg-blue-400/10 text-blue-400 border-blue-400/20',
  Design:        'bg-violet-400/10 text-violet-400 border-violet-400/20',
  Desenvolvimento: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  Marketing:     'bg-orange-400/10 text-orange-400 border-orange-400/20',
  Gestão:        'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  Treinamento:   'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Suporte:       'bg-teal-400/10 text-teal-400 border-teal-400/20',
  Produção:      'bg-pink-400/10 text-pink-400 border-pink-400/20',
  Outros:        'bg-slate-400/10 text-slate-400 border-slate-400/20',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValor(s: Servico) {
  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  if (s.valor_tipo === 'sob_consulta') return 'Sob consulta'
  if (s.valor_tipo === 'fixo')     return s.valor != null ? fmt(s.valor) : '—'
  if (s.valor_tipo === 'por_hora') return s.valor != null ? `${fmt(s.valor)}/h` : '—'
  if (s.valor_tipo === 'range') {
    if (s.valor != null && s.valor_max != null) return `${fmt(s.valor)} – ${fmt(s.valor_max)}`
    if (s.valor != null) return `a partir de ${fmt(s.valor)}`
  }
  return '—'
}

function blankEtapa(ordem: number): EtapaDraft {
  return { titulo: '', descricao: '', responsavel: '', duracao: '', ordem }
}

// ─── Fluxo step ──────────────────────────────────────────────────────────────

function EtapaCard({ etapa, index, total, onChange, onRemove, onMove }: {
  etapa: EtapaDraft
  index: number
  total: number
  onChange: (e: EtapaDraft) => void
  onRemove: () => void
  onMove: (dir: -1 | 1) => void
}) {
  return (
    <div className="border border-border rounded-xl p-4 bg-card/40 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-primary">{index + 1}</span>
        </div>
        <input
          value={etapa.titulo}
          onChange={e => onChange({ ...etapa, titulo: e.target.value })}
          placeholder="Nome da etapa"
          className="flex-1 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button disabled={index === 0} onClick={() => onMove(-1)} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowUp size={12} className="text-muted-foreground" />
          </button>
          <button disabled={index === total - 1} onClick={() => onMove(1)} className="p-1 rounded hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowDown size={12} className="text-muted-foreground" />
          </button>
          <button onClick={onRemove} className="p-1 rounded hover:bg-destructive/10 transition-colors">
            <X size={12} className="text-destructive/70" />
          </button>
        </div>
      </div>

      <textarea
        value={etapa.descricao}
        onChange={e => onChange({ ...etapa, descricao: e.target.value })}
        placeholder="Descrição da etapa (opcional)"
        rows={2}
        className="w-full bg-muted/30 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
          <User size={11} className="text-muted-foreground shrink-0" />
          <input
            value={etapa.responsavel}
            onChange={e => onChange({ ...etapa, responsavel: e.target.value })}
            placeholder="Responsável"
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
          <Clock size={11} className="text-muted-foreground shrink-0" />
          <input
            value={etapa.duracao}
            onChange={e => onChange({ ...etapa, duracao: e.target.value })}
            placeholder="Duração (ex: 2h)"
            className="bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none w-full"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Service form ─────────────────────────────────────────────────────────────

function ServicoForm({ servico, onSave, onCancel }: {
  servico?: Servico
  onSave: (data: Omit<Servico, 'id' | 'user_id' | 'empresa_id' | 'created_at'> & { id?: string }) => Promise<void>
  onCancel: () => void
}) {
  const [nome,       setNome]      = useState(servico?.nome       ?? '')
  const [descricao,  setDescricao] = useState(servico?.descricao  ?? '')
  const [categoria,  setCategoria] = useState(servico?.categoria  ?? '')
  const [valorTipo,  setValorTipo] = useState<ValorTipo>(servico?.valor_tipo ?? 'fixo')
  const [valor,      setValor]     = useState(servico?.valor?.toString()    ?? '')
  const [valorMax,   setValorMax]  = useState(servico?.valor_max?.toString() ?? '')
  const [ativo,      setAtivo]     = useState(servico?.ativo ?? true)
  const [etapas,     setEtapas]    = useState<EtapaDraft[]>(
    servico?.etapas.length
      ? servico.etapas
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map(e => ({ titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, duracao: e.duracao, ordem: e.ordem }))
      : []
  )
  const [saving, setSaving] = useState(false)

  function moveEtapa(index: number, dir: -1 | 1) {
    const next = [...etapas]
    const swap = index + dir
    ;[next[index], next[swap]] = [next[swap], next[index]]
    setEtapas(next.map((e, i) => ({ ...e, ordem: i })))
  }

  async function handleSubmit() {
    if (!nome.trim()) return
    setSaving(true)
    await onSave({
      id:         servico?.id,
      nome:       nome.trim(),
      descricao:  descricao.trim(),
      categoria,
      valor_tipo: valorTipo,
      valor:      valor     ? parseFloat(valor)    : null,
      valor_max:  valorMax  ? parseFloat(valorMax) : null,
      ativo,
      etapas: etapas.map((e, i) => ({ ...e, id: '', servico_id: '', ordem: i })),
    })
    setSaving(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          {servico ? 'Editar serviço' : 'Novo serviço'}
        </h2>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <X size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Dados básicos */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nome do serviço *</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Gestão de tráfego pago"
            className="mt-1 w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descrição</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="O que está incluso neste serviço..."
            rows={3}
            className="mt-1 w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Categoria</label>
          <select
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            className="mt-1 w-full bg-muted/40 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Sem categoria</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
          <DollarSign size={13} className="text-primary" /> Precificação
        </p>

        <div className="grid grid-cols-2 gap-2">
          {VALOR_TIPOS.map(t => (
            <button
              key={t.value}
              onClick={() => setValorTipo(t.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                valorTipo === t.value
                  ? 'bg-primary/15 border-primary/30 text-primary'
                  : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {valorTipo !== 'sob_consulta' && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">
                {valorTipo === 'range' ? 'Valor mínimo' : 'Valor (R$)'}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder="0,00"
                className="mt-1 w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {valorTipo === 'range' && (
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Valor máximo</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorMax}
                  onChange={e => setValorMax(e.target.value)}
                  placeholder="0,00"
                  className="mt-1 w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fluxo */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
            <ChevronRight size={13} className="text-primary" /> Fluxo do serviço
          </p>
          <button
            onClick={() => setEtapas(prev => [...prev, blankEtapa(prev.length)])}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus size={12} /> Adicionar etapa
          </button>
        </div>

        {etapas.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl py-6 text-center">
            <p className="text-xs text-muted-foreground">Nenhuma etapa ainda.</p>
            <button
              onClick={() => setEtapas([blankEtapa(0)])}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Adicionar primeira etapa
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {etapas.map((etapa, i) => (
              <EtapaCard
                key={i}
                etapa={etapa}
                index={i}
                total={etapas.length}
                onChange={updated => setEtapas(prev => prev.map((e, j) => j === i ? updated : e))}
                onRemove={() => setEtapas(prev => prev.filter((_, j) => j !== i).map((e, j) => ({ ...e, ordem: j })))}
                onMove={dir => moveEtapa(i, dir)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div
          onClick={() => setAtivo(v => !v)}
          className={`w-9 h-5 rounded-full transition-colors flex items-center ${ativo ? 'bg-primary' : 'bg-muted'}`}
        >
          <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5 ${ativo ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
        <span className="text-sm text-foreground">{ativo ? 'Serviço ativo' : 'Serviço inativo'}</span>
      </label>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!nome.trim() || saving}
          className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}

// ─── Service detail view ──────────────────────────────────────────────────────

function ServicoDetail({ servico, onEdit, onDelete }: {
  servico: Servico
  onEdit: () => void
  onDelete: () => void
}) {
  const sorted = [...(servico.etapas ?? [])].sort((a, b) => a.ordem - b.ordem)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {servico.categoria && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CAT_COLORS[servico.categoria] ?? CAT_COLORS['Outros']}`}>
                {servico.categoria}
              </span>
            )}
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${servico.ativo ? 'bg-emerald-400/10 text-emerald-400' : 'bg-slate-400/10 text-slate-400'}`}>
              {servico.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-foreground">{servico.nome}</h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onEdit} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <Pencil size={14} className="text-muted-foreground" />
          </button>
          <button onClick={onDelete} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
            <Trash2 size={14} className="text-destructive/70" />
          </button>
        </div>
      </div>

      {/* Valor */}
      <div className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center gap-3">
        <DollarSign size={18} className="text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">
            {VALOR_TIPOS.find(t => t.value === servico.valor_tipo)?.label}
          </p>
          <p className="text-base font-bold text-foreground">{formatValor(servico)}</p>
        </div>
      </div>

      {/* Descrição */}
      {servico.descricao && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descrição</p>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{servico.descricao}</p>
        </div>
      )}

      {/* Fluxo */}
      {sorted.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Fluxo do serviço · {sorted.length} {sorted.length === 1 ? 'etapa' : 'etapas'}
          </p>
          <div className="relative">
            {sorted.map((etapa, i) => (
              <div key={etapa.id} className="flex gap-3 mb-4 last:mb-0">
                {/* Timeline */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                  </div>
                  {i < sorted.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                </div>
                {/* Content */}
                <div className="flex-1 pb-2">
                  <p className="text-sm font-semibold text-foreground">{etapa.titulo}</p>
                  {etapa.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{etapa.descricao}</p>
                  )}
                  {(etapa.responsavel || etapa.duracao) && (
                    <div className="flex items-center gap-3 mt-2">
                      {etapa.responsavel && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <User size={10} /> {etapa.responsavel}
                        </span>
                      )}
                      {etapa.duracao && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock size={10} /> {etapa.duracao}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sorted.length === 0 && !servico.descricao && (
        <div className="text-center py-8">
          <p className="text-xs text-muted-foreground">Nenhum detalhe adicionado ainda.</p>
          <button onClick={onEdit} className="mt-2 text-xs text-primary hover:underline">Editar serviço</button>
        </div>
      )}
    </div>
  )
}

// ─── Main module ──────────────────────────────────────────────────────────────

export function ServicosModule() {
  const supabase = createClient()
  const { empresaId } = useEmpresa()

  const [servicos,  setServicos]  = useState<Servico[]>([])
  const [selected,  setSelected]  = useState<Servico | null>(null)
  const [mode,      setMode]      = useState<'view' | 'create' | 'edit'>('view')
  const [search,    setSearch]    = useState('')
  const [userId,    setUserId]    = useState<string | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await (empresaId
        ? supabase.from('servicos').select('*, servico_etapas(*)').eq('user_id', user.id).eq('empresa_id', empresaId).order('created_at')
        : supabase.from('servicos').select('*, servico_etapas(*)').eq('user_id', user.id).is('empresa_id', null).order('created_at')
      )

      const list: Servico[] = (data ?? []).map(s => ({
        ...s,
        etapas: ((s.servico_etapas ?? []) as Etapa[]).sort((a, b) => a.ordem - b.ordem),
      }))
      setServicos(list)
      if (selected) {
        const updated = list.find(s => s.id === selected.id)
        if (updated) setSelected(updated)
      }
      setLoading(false)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId])

  const filtered = servicos.filter(s => {
    if (!search) return true
    const q = search.toLowerCase()
    return s.nome.toLowerCase().includes(q) || s.categoria.toLowerCase().includes(q) || s.descricao.toLowerCase().includes(q)
  })

  async function handleSave(data: Omit<Servico, 'id' | 'user_id' | 'empresa_id' | 'created_at'> & { id?: string }) {
    if (!userId) return
    const { etapas, id, ...fields } = data

    if (id) {
      await supabase.from('servicos').update({ ...fields }).eq('id', id)
      await supabase.from('servico_etapas').delete().eq('servico_id', id)
      if (etapas.length > 0) {
        await supabase.from('servico_etapas').insert(
          etapas.map((e, i) => ({ servico_id: id, titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, duracao: e.duracao, ordem: i }))
        )
      }
    } else {
      const { data: created } = await supabase
        .from('servicos')
        .insert({ ...fields, user_id: userId, empresa_id: empresaId ?? null })
        .select('id')
        .single()
      if (created && etapas.length > 0) {
        await supabase.from('servico_etapas').insert(
          etapas.map((e, i) => ({ servico_id: created.id, titulo: e.titulo, descricao: e.descricao, responsavel: e.responsavel, duracao: e.duracao, ordem: i }))
        )
      }
    }

    const { data: refreshed } = await (empresaId
      ? supabase.from('servicos').select('*, servico_etapas(*)').eq('user_id', userId).eq('empresa_id', empresaId).order('created_at')
      : supabase.from('servicos').select('*, servico_etapas(*)').eq('user_id', userId).is('empresa_id', null).order('created_at')
    )
    const list: Servico[] = (refreshed ?? []).map(s => ({
      ...s,
      etapas: ((s.servico_etapas ?? []) as Etapa[]).sort((a, b) => a.ordem - b.ordem),
    }))
    setServicos(list)

    const savedId = id ?? (refreshed?.find(s => s.nome === fields.nome)?.id)
    const savedServico = list.find(s => s.id === savedId) ?? list[list.length - 1]
    setSelected(savedServico ?? null)
    setMode('view')
  }

  async function handleDelete(id: string) {
    await supabase.from('servicos').delete().eq('id', id)
    setServicos(prev => prev.filter(s => s.id !== id))
    setSelected(null)
    setMode('view')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left panel — list */}
      <div className="w-72 shrink-0 flex flex-col border-r border-border bg-sidebar">
        {/* Header */}
        <div className="px-4 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench size={16} className="text-primary" />
              <h1 className="text-sm font-bold text-foreground">Serviços</h1>
            </div>
            <button
              onClick={() => { setMode('create'); setSelected(null) }}
              className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center hover:bg-primary/25 transition-colors"
            >
              <Plus size={14} className="text-primary" />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
            <Search size={12} className="text-muted-foreground shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar serviço..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            />
            {search && <button onClick={() => setSearch('')}><X size={11} className="text-muted-foreground" /></button>}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Wrench size={18} className="text-primary/60" />
              </div>
              <p className="text-xs text-muted-foreground">
                {search ? 'Nenhum serviço encontrado.' : 'Nenhum serviço cadastrado.'}
              </p>
              {!search && (
                <button
                  onClick={() => { setMode('create'); setSelected(null) }}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Criar primeiro serviço
                </button>
              )}
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setMode('view') }}
                className={`w-full text-left px-3 py-3 rounded-xl transition-all group ${
                  selected?.id === s.id
                    ? 'bg-primary/15 border border-primary/20'
                    : 'hover:bg-sidebar-accent border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className={`text-xs font-semibold truncate flex-1 ${selected?.id === s.id ? 'text-primary' : 'text-foreground'}`}>
                    {s.nome}
                  </p>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${s.ativo ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                </div>
                {s.categoria && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${CAT_COLORS[s.categoria] ?? CAT_COLORS['Outros']}`}>
                    {s.categoria}
                  </span>
                )}
                <p className="text-[11px] text-muted-foreground mt-1 font-medium">{formatValor(s)}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel — detail / form */}
      <div className="flex-1 flex flex-col min-w-0">
        {mode === 'create' && (
          <ServicoForm
            onSave={handleSave}
            onCancel={() => setMode('view')}
          />
        )}
        {mode === 'edit' && selected && (
          <ServicoForm
            servico={selected}
            onSave={handleSave}
            onCancel={() => setMode('view')}
          />
        )}
        {mode === 'view' && selected && (
          <ServicoDetail
            servico={selected}
            onEdit={() => setMode('edit')}
            onDelete={() => handleDelete(selected.id)}
          />
        )}
        {mode === 'view' && !selected && (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Wrench size={24} className="text-primary/60" />
            </div>
            <p className="text-sm font-medium text-foreground/60">Selecione um serviço</p>
            <p className="text-xs text-muted-foreground mt-1">ou crie um novo para começar</p>
            <button
              onClick={() => setMode('create')}
              className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus size={13} /> Novo serviço
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
