'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Status = 'pendente' | 'aprovado' | 'reprovado'

type Conteudo = {
  id: string
  titulo: string
  tipo: string
  descricao: string
  data: string
  status: Status
  comentario?: string
}

const inicial: Conteudo[] = [
  { id: '1', titulo: 'Post feed — lançamento produto',  tipo: 'Instagram Feed',   descricao: 'Arte comemorativa do lançamento da nova linha.', data: '23/05/2026', status: 'pendente' },
  { id: '2', titulo: 'Story sequência — promoção',      tipo: 'Instagram Stories', descricao: '3 stories com a promoção de junho.', data: '23/05/2026', status: 'pendente' },
  { id: '3', titulo: 'Banner site — hero section',      tipo: 'Web',               descricao: 'Banner principal da home para o mês de junho.', data: '20/05/2026', status: 'aprovado', comentario: 'Perfeito!' },
]

const statusConfig = {
  pendente:   { label: 'Aguardando',  color: 'text-amber-400',        bg: 'bg-amber-400/10',      icon: Clock },
  aprovado:   { label: 'Aprovado',    color: 'text-emerald-400',      bg: 'bg-emerald-400/10',    icon: CheckCircle2 },
  reprovado:  { label: 'Reprovado',   color: 'text-red-400',          bg: 'bg-red-400/10',        icon: XCircle },
}

export default function PortalAprovacoes() {
  const [itens, setItens] = useState<Conteudo[]>(inicial)
  const [comentarios, setComentarios] = useState<Record<string, string>>({})
  const [expandido, setExpandido] = useState<string | null>(null)

  function responder(id: string, decisao: 'aprovado' | 'reprovado') {
    setItens(prev => prev.map(it =>
      it.id === id
        ? { ...it, status: decisao, comentario: comentarios[id] ?? '' }
        : it
    ))
    setExpandido(null)
  }

  const pendentes  = itens.filter(i => i.status === 'pendente')
  const respondidos = itens.filter(i => i.status !== 'pendente')

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Aprovações</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Revise e aprove os conteúdos enviados pela agência.</p>
      </div>

      {/* Pendentes */}
      {pendentes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-amber-400" />
            <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-400/80">
              Aguardando sua resposta ({pendentes.length})
            </span>
            <div className="flex-1 h-px bg-amber-400/20" />
          </div>

          {pendentes.map(item => (
            <Card key={item.id} className="bg-card border-border border-l-2 border-l-amber-500/50">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.titulo}</p>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full mt-1 inline-block">
                      {item.tipo}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.data}</span>
                </div>

                <p className="text-sm text-muted-foreground">{item.descricao}</p>

                {expandido === item.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={comentarios[item.id] ?? ''}
                      onChange={e => setComentarios(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Comentário opcional..."
                      rows={2}
                      className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => responder(item.id, 'aprovado')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 text-sm font-medium transition-all border border-emerald-500/20"
                      >
                        <ThumbsUp size={14} /> Aprovar
                      </button>
                      <button
                        onClick={() => responder(item.id, 'reprovado')}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 text-sm font-medium transition-all border border-red-500/20"
                      >
                        <ThumbsDown size={14} /> Reprovar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setExpandido(item.id)}
                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    <MessageSquare size={12} /> Responder
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* Respondidos */}
      {respondidos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">Respondidos</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {respondidos.map(item => {
            const cfg = statusConfig[item.status]
            const Icon = cfg.icon
            return (
              <Card key={item.id} className="bg-card border-border opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Icon size={15} className={cfg.color} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.titulo}</p>
                        {item.comentario && (
                          <p className="text-xs text-muted-foreground mt-0.5">"{item.comentario}"</p>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>
      )}

      {pendentes.length === 0 && respondidos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <ThumbsUp size={36} className="text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">Nenhum conteúdo aguardando aprovação</p>
        </div>
      )}
    </div>
  )
}
