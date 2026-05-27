'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Plus, X, Save, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Fallback vazio (usado só se o template da fabrica não existir) ──────────

const DEFAULTS = {
  nome:              '',
  cargo:             '',
  missao:            '',
  agencia:           '',
  tom_de_voz:        [] as string[],
  regras:            [] as string[],
  proibicoes:        [] as string[],
  emojis_permitidos: [] as string[],
  emojis_proibidos:  [] as string[],
  exemplos:          [] as string[],
}

const TOM_OPTIONS = [
  'moderno', 'informal', 'dinâmico', 'natural', 'estratégico',
  'humano', 'leve', 'direto', 'jovem', 'profissional',
  'empático', 'criativo', 'objetivo', 'próximo', 'confiante',
]

const EMOJI_SUGESTOES = [
  '🚀','✨','🪐','🌌','☄️','📡','💫','🔭','💡','🎯',
  '📈','🤝','💬','🧠','⚡','🔥','🌟','💎','🏆','🎉',
  '👋','😄','😊','❤️','💗','💕','🌸','🥺','😍','😂',
  '👍','🙏','✅','⚠️','📌','🔑','💰','📊','🗓️','📝',
]

// ── TagInput ───────────────────────────────────────────────────────────────

function TagInput({
  label, description, items, onChange, placeholder = 'Adicionar…',
}: {
  label: string
  description?: string
  items: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const v = draft.trim()
    if (!v || items.includes(v)) return
    onChange([...items, v])
    setDraft('')
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-0.5">{label}</p>
      {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px]">
        {items.map(item => (
          <span
            key={item}
            className="flex items-center gap-1 bg-muted border border-border rounded-lg px-2.5 py-1 text-xs text-foreground"
          >
            {item}
            <button onClick={() => onChange(items.filter(i => i !== item))} className="text-muted-foreground hover:text-red-400 transition-colors ml-0.5">
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder={placeholder}
          className="flex-1 h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 hover:bg-primary/25 text-primary transition-colors disabled:opacity-40"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

// ── EmojiGrid ──────────────────────────────────────────────────────────────

function EmojiGrid({
  label, description, selected, onChange,
}: {
  label: string
  description?: string
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [customDraft, setCustomDraft] = useState('')

  function toggle(emoji: string) {
    if (selected.includes(emoji)) {
      onChange(selected.filter(e => e !== emoji))
    } else {
      onChange([...selected, emoji])
    }
  }

  function addCustom() {
    const v = customDraft.trim()
    if (!v) return
    // accept single emoji or space-separated list
    const emojis = v.split(/\s+/).filter(Boolean)
    const toAdd = emojis.filter(e => !selected.includes(e))
    if (toAdd.length) onChange([...selected, ...toAdd])
    setCustomDraft('')
  }

  return (
    <div>
      <p className="text-xs font-semibold text-foreground/80 uppercase tracking-wide mb-0.5">{label}</p>
      {description && <p className="text-xs text-muted-foreground mb-3">{description}</p>}
      <div className="flex flex-wrap gap-1 mb-3">
        {EMOJI_SUGESTOES.map(emoji => (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
              selected.includes(emoji)
                ? 'bg-primary/20 ring-1 ring-primary/50'
                : 'bg-muted hover:bg-muted/70'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 p-2.5 rounded-lg bg-muted/40 border border-border">
          {selected.map(e => (
            <span key={e} className="flex items-center gap-1 text-sm bg-card border border-border rounded-md px-2 py-0.5">
              {e}
              <button onClick={() => toggle(e)} className="text-muted-foreground hover:text-red-400"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={customDraft}
          onChange={e => setCustomDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Adicionar emoji personalizado…"
          className="flex-1 h-8 rounded-lg bg-muted border border-border px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        <button
          onClick={addCustom}
          disabled={!customDraft.trim()}
          className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/15 hover:bg-primary/25 text-primary transition-colors disabled:opacity-40"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  )
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground/80 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

const inputCls = "w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
const textareaCls = "w-full rounded-lg bg-muted border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"

// ── Page ──────────────────────────────────────────────────────────────────

export default function InformacoesPage() {
  const supabase = createClient()

  const [loading, setSaving]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [fetching, setFetching] = useState(true)

  const [nome,    setNome]    = useState(DEFAULTS.nome)
  const [cargo,   setCargo]   = useState(DEFAULTS.cargo)
  const [missao,  setMissao]  = useState(DEFAULTS.missao)
  const [agencia, setAgencia] = useState(DEFAULTS.agencia)

  const [conhecimento,      setConhecimento]      = useState('')
  const [tomDeVoz,          setTomDeVoz]          = useState<string[]>(DEFAULTS.tom_de_voz)
  const [regras,            setRegras]            = useState<string[]>(DEFAULTS.regras)
  const [proibicoes,        setProibicoes]        = useState<string[]>(DEFAULTS.proibicoes)
  const [emojisPermitidos,  setEmojisPermitidos]  = useState<string[]>(DEFAULTS.emojis_permitidos)
  const [emojisProibidos,   setEmojisProibidos]   = useState<string[]>(DEFAULTS.emojis_proibidos)
  const [exemplos,          setExemplos]          = useState<string[]>(DEFAULTS.exemplos)
  const [delaySegundos,     setDelaySegundos]     = useState(10)

  // Load from Supabase
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('ai_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (data) {
        setNome(data.nome ?? '')
        setCargo(data.cargo ?? '')
        setMissao(data.missao ?? '')
        setAgencia(data.agencia ?? '')
        setTomDeVoz(data.tom_de_voz ?? [])
        setRegras(data.regras ?? [])
        setProibicoes(data.proibicoes ?? [])
        setEmojisPermitidos(data.emojis_permitidos ?? [])
        setEmojisProibidos(data.emojis_proibidos ?? [])
        setExemplos(data.exemplos ?? [])
        setConhecimento(data.conhecimento ?? '')
        setDelaySegundos(data.delay_segundos ?? 10)
      } else {
        // Primeira vez — busca template da conta fabrica
        const tmplRes = await fetch('/api/config/template')
        const { data: tmpl } = tmplRes.ok ? await tmplRes.json() : { data: null }
        const base = tmpl ?? DEFAULTS

        // identidade sempre em branco — cada cliente preenche o próprio
        setNome('')
        setCargo('')
        setMissao('')
        setAgencia('')
        setConhecimento('')
        // comportamento herdado do template
        setTomDeVoz(base.tom_de_voz ?? [])
        setRegras(base.regras ?? [])
        setProibicoes(base.proibicoes ?? [])
        setEmojisPermitidos(base.emojis_permitidos ?? [])
        setEmojisProibidos(base.emojis_proibidos ?? [])
        setExemplos(base.exemplos ?? [])

        // persiste no banco para o webhook sempre ter um config
        await supabase.from('ai_config').upsert({
          user_id:           user.id,
          nome:              '',
          cargo:             '',
          missao:            '',
          agencia:           '',
          tom_de_voz:        base.tom_de_voz ?? [],
          regras:            base.regras ?? [],
          proibicoes:        base.proibicoes ?? [],
          emojis_permitidos: base.emojis_permitidos ?? [],
          emojis_proibidos:  base.emojis_proibidos ?? [],
          exemplos:          base.exemplos ?? [],
          conhecimento:      '',
        }, { onConflict: 'user_id' })
      }
      setFetching(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('ai_config').upsert({
      user_id:           user.id,
      nome,
      cargo,
      missao,
      agencia,
      tom_de_voz:        tomDeVoz,
      regras,
      proibicoes,
      emojis_permitidos: emojisPermitidos,
      emojis_proibidos:  emojisProibidos,
      exemplos,
      conhecimento,
      delay_segundos:    delaySegundos,
      updated_at:        new Date().toISOString(),
    }, { onConflict: 'user_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={20} className="text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[860px] space-y-6 pb-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1">Assistente IA</p>
          <h2 className="text-xl font-bold text-foreground">Configuração da IA</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Defina identidade, personalidade e regras de comportamento da sua IA.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="h-9 text-xs bg-primary hover:bg-primary/90 shrink-0 gap-1.5"
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> Salvando…</>
            : saved
            ? <><CheckCircle2 size={13} /> Salvo!</>
            : <><Save size={13} /> Salvar configuração</>
          }
        </Button>
      </div>

      {/* Identidade */}
      <Section title="Identidade" description="Como a IA se apresenta e qual é o seu propósito.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome do assistente">
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="lunna" className={inputCls} />
          </Field>
          <Field label="Nome da agência">
            <input value={agencia} onChange={e => setAgencia(e.target.value)} placeholder="Propulsor Criativo" className={inputCls} />
          </Field>
        </div>
        <Field label="Cargo / Função">
          <input value={cargo} onChange={e => setCargo(e.target.value)} placeholder="assistente da propulsor criativo" className={inputCls} />
        </Field>
        <Field label="Missão">
          <textarea
            value={missao}
            onChange={e => setMissao(e.target.value)}
            placeholder="Descreva a missão principal do assistente…"
            rows={3}
            className={textareaCls}
          />
        </Field>
      </Section>

      {/* Base de Conhecimento */}
      <Section
        title="Base de Conhecimento do Produto"
        description="Escreva aqui tudo sobre seus serviços, diferenciais, processo, preços, perguntas frequentes, cases — quanto mais detalhes, melhor a IA responde."
      >
        <textarea
          value={conhecimento}
          onChange={e => setConhecimento(e.target.value)}
          placeholder={`Exemplos do que incluir:

• O que é cada serviço e para quem é indicado
• Como funciona o processo (ex: briefing → criação → entrega)
• Diferenciais em relação à concorrência
• Perguntas frequentes e suas respostas
• Valores médios ou forma de precificação
• Prazo de entrega
• Cases ou resultados obtidos
• Quem é a equipe`}
          rows={14}
          className={textareaCls}
        />
      </Section>

      {/* Tom de voz */}
      <Section title="Tom de voz" description="Selecione os adjetivos que descrevem como a IA deve soar.">
        <div className="flex flex-wrap gap-2">
          {TOM_OPTIONS.map(tom => (
            <button
              key={tom}
              onClick={() =>
                tomDeVoz.includes(tom)
                  ? setTomDeVoz(tomDeVoz.filter(t => t !== tom))
                  : setTomDeVoz([...tomDeVoz, tom])
              }
              className={`h-8 px-3.5 rounded-full text-xs font-medium transition-all ${
                tomDeVoz.includes(tom)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/70 border border-border'
              }`}
            >
              {tom}
            </button>
          ))}
        </div>
      </Section>

      {/* Regras */}
      <Section title="Regras obrigatórias" description="O que a IA deve sempre fazer em todas as interações.">
        <TagInput
          label=""
          items={regras}
          onChange={setRegras}
          placeholder="Ex: sempre cumprimentar pelo nome…"
        />
      </Section>

      {/* Proibições */}
      <Section title="Proibições" description="Comportamentos que a IA nunca deve ter.">
        <TagInput
          label=""
          items={proibicoes}
          onChange={setProibicoes}
          placeholder="Ex: nunca mencionar concorrentes…"
        />
      </Section>

      {/* Emojis */}
      <Section title="Emojis" description="Controle quais emojis a IA pode e não pode usar.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <EmojiGrid
            label="Permitidos"
            description="Emojis que a IA pode usar (com moderação)."
            selected={emojisPermitidos}
            onChange={setEmojisPermitidos}
          />
          <EmojiGrid
            label="Proibidos"
            description="Emojis que a IA nunca deve usar."
            selected={emojisProibidos}
            onChange={setEmojisProibidos}
          />
        </div>
      </Section>

      {/* Exemplos */}
      <Section title="Exemplos de comunicação" description="Frases de referência para calibrar o estilo da IA.">
        <TagInput
          label=""
          items={exemplos}
          onChange={setExemplos}
          placeholder="Ex: entendi, faz sentido pro momento de vocês…"
        />
      </Section>

      {/* Tempo de resposta */}
      <Section title="Tempo de resposta" description="Quantos segundos a IA aguarda antes de responder, simulando digitação humana.">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Delay atual</span>
            <span className="text-sm font-semibold text-foreground tabular-nums">{delaySegundos}s</span>
          </div>
          <input
            type="range"
            min={1}
            max={60}
            step={1}
            value={delaySegundos}
            onChange={e => setDelaySegundos(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>1s</span>
            <span>15s</span>
            <span>30s</span>
            <span>45s</span>
            <span>60s</span>
          </div>
          <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
            Recomendado entre <strong className="text-foreground">20–30 segundos</strong> para soar natural. Valores muito baixos podem parecer bot; muito altos podem frustrar o cliente.
          </p>
        </div>
      </Section>

    </div>
  )
}
