import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, DollarSign, TrendingUp, Target, Calendar } from 'lucide-react'

type Stage = { id: string; label: string; color: string; dot: string }

const stages: Stage[] = [
  { id: 'prospect',    label: 'Prospecção', color: 'bg-violet-500/15 border-violet-500/25', dot: 'bg-violet-400' },
  { id: 'proposal',   label: 'Proposta',   color: 'bg-sky-500/15 border-sky-500/25',       dot: 'bg-sky-400'    },
  { id: 'negotiation',label: 'Negociação', color: 'bg-amber-500/15 border-amber-500/25',   dot: 'bg-amber-400'  },
  { id: 'closing',    label: 'Fechamento', color: 'bg-emerald-500/15 border-emerald-500/25',dot:'bg-emerald-400' },
]

interface Deal {
  id: number; title: string; client: string; value: string; prob: number
  stage: string; assignee: string; close: string; tags: string[]
}

const deals: Deal[] = [
  { id: 1, title: 'Gestão completa Social Media', client: 'Natura & Co', value: 'R$ 8.500/mês', prob: 30, stage: 'prospect',    assignee: 'MG', close: 'Jun/25', tags: ['social'] },
  { id: 2, title: 'Pacote Ads + Criativos',        client: 'Fóton Tech',   value: 'R$ 5.200/mês', prob: 45, stage: 'prospect',    assignee: 'CF', close: 'Jun/25', tags: ['ads'] },
  { id: 3, title: 'Branding + Identidade Visual',  client: 'Raiz Café',    value: 'R$ 12.000',    prob: 60, stage: 'proposal',    assignee: 'LR', close: 'Mai/25', tags: ['branding'] },
  { id: 4, title: 'Gestão Instagram + TikTok',     client: 'MoveFit',      value: 'R$ 3.800/mês', prob: 55, stage: 'proposal',    assignee: 'MG', close: 'Mai/25', tags: ['social'] },
  { id: 5, title: 'Campanha lançamento produto',   client: 'Viva Mais',    value: 'R$ 18.000',    prob: 75, stage: 'negotiation', assignee: 'CF', close: 'Mai/25', tags: ['campanha'] },
  { id: 6, title: 'Retenção – upgrade de plano',   client: 'Studio Fit',   value: 'R$ 2.000/mês', prob: 80, stage: 'negotiation', assignee: 'LR', close: 'Mai/25', tags: ['upsell'] },
  { id: 7, title: 'Contrato anual renovado',       client: 'Loja Bloom',   value: 'R$ 54.000',    prob: 90, stage: 'closing',     assignee: 'MG', close: 'Mai/25', tags: ['renovação'] },
  { id: 8, title: 'Pacote vídeo mensal',           client: 'Café Aurora',  value: 'R$ 4.800/mês', prob: 85, stage: 'closing',     assignee: 'CF', close: 'Mai/25', tags: ['vídeo'] },
]

const stats = [
  { label: 'Total Pipeline', value: 'R$ 108k', icon: DollarSign, color: 'text-violet-400', bg: 'bg-violet-400/10' },
  { label: 'Deals Ativos',   value: '8',        icon: Target,     color: 'text-sky-400',    bg: 'bg-sky-400/10' },
  { label: 'Taxa Conversão', value: '34%',      icon: TrendingUp, color: 'text-emerald-400',bg: 'bg-emerald-400/10' },
  { label: 'Fecham em Mai',  value: '4',        icon: Calendar,   color: 'text-amber-400',  bg: 'bg-amber-400/10' },
]

function probColor(p: number) {
  if (p >= 80) return 'bg-emerald-400'
  if (p >= 60) return 'bg-sky-400'
  if (p >= 40) return 'bg-amber-400'
  return 'bg-rose-400'
}

export default function PipelinePage() {
  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
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

      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs">
          <Plus size={14} /> Novo deal
        </Button>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {stages.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage.id)
          const stageTotal = stageDeals.reduce((sum, d) => {
            const num = parseFloat(d.value.replace(/[^0-9.,]/g, '').replace(',', '.'))
            return sum + (isNaN(num) ? 0 : num)
          }, 0)

          return (
            <div key={stage.id} className="flex flex-col gap-3">
              {/* Column header */}
              <div className={`px-3 py-2.5 rounded-xl border ${stage.color} flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${stage.dot}`} />
                  <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                  <span className="text-[10px] text-muted-foreground">({stageDeals.length})</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  R$ {stageTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>

              {/* Deals */}
              <div className="flex flex-col gap-2.5">
                {stageDeals.map(deal => (
                  <Card
                    key={deal.id}
                    className="bg-card border-border hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-foreground leading-snug">{deal.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{deal.client}</p>
                      </div>

                      <p className="text-sm font-bold text-primary">{deal.value}</p>

                      {/* Probability bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Probabilidade</span>
                          <span className="font-medium text-foreground">{deal.prob}%</span>
                        </div>
                        <div className="h-1 rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full ${probColor(deal.prob)} transition-all`}
                            style={{ width: `${deal.prob}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {deal.tags.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar size={10} /> {deal.close}
                        </span>
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
                            {deal.assignee}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <button className="w-full py-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                  + Adicionar deal
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
