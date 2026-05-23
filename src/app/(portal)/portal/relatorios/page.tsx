import { BarChart2, TrendingUp, Users, Eye, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const metricas = [
  { label: 'Alcance Total',        value: '–',  sub: 'últimos 30 dias', icon: Eye,       color: 'text-sky-400',     bg: 'bg-sky-400/10'     },
  { label: 'Novos Seguidores',     value: '–',  sub: 'últimos 30 dias', icon: Users,     color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'Engajamento Médio',    value: '–',  sub: 'por publicação',  icon: Heart,     color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
  { label: 'Crescimento Mensal',   value: '–',  sub: 'vs. mês anterior',icon: TrendingUp,color: 'text-violet-400',  bg: 'bg-violet-400/10'  },
]

export default function PortalRelatorios() {
  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Relatórios</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Resultados e métricas do seu projeto.</p>
      </div>

      {/* Métricas principais */}
      <div className="grid grid-cols-2 gap-4">
        {metricas.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className={`text-3xl font-bold mt-1 leading-none ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{sub}</p>
                </div>
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Relatório detalhado */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2 size={14} className="text-primary" />
            Relatório Detalhado
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Maio 2026</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <BarChart2 size={36} className="text-muted-foreground/25" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Relatório em preparação</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Sua agência irá publicar o relatório mensal aqui assim que estiver pronto.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
