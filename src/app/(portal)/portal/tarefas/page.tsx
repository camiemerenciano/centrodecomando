import { CheckSquare, Circle, CheckCircle2, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const statusConfig = {
  pendente:    { label: 'Pendente',      color: 'text-muted-foreground', bg: 'bg-muted',            icon: Circle },
  andamento:   { label: 'Em Andamento',  color: 'text-sky-400',          bg: 'bg-sky-400/10',       icon: Clock },
  concluido:   { label: 'Concluído',     color: 'text-emerald-400',      bg: 'bg-emerald-400/10',   icon: CheckCircle2 },
}

const tarefas = [
  { id: '1', titulo: 'Criação de identidade visual', status: 'concluido',  entrega: '10/05/2026' },
  { id: '2', titulo: 'Calendário editorial maio',    status: 'concluido',  entrega: '15/05/2026' },
  { id: '3', titulo: 'Posts semana 3',               status: 'andamento',  entrega: '28/05/2026' },
  { id: '4', titulo: 'Relatório mensal maio',        status: 'pendente',   entrega: '05/06/2026' },
]

export default function PortalTarefas() {
  const counts = {
    concluido: tarefas.filter(t => t.status === 'concluido').length,
    andamento: tarefas.filter(t => t.status === 'andamento').length,
    pendente:  tarefas.filter(t => t.status === 'pendente').length,
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Tarefas do Projeto</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Acompanhe o andamento de cada entrega.</p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {([
          { key: 'andamento', label: 'Em andamento', color: 'text-sky-400',        bg: 'bg-sky-400/10'      },
          { key: 'pendente',  label: 'Pendentes',     color: 'text-muted-foreground', bg: 'bg-muted'         },
          { key: 'concluido', label: 'Concluídas',    color: 'text-emerald-400',    bg: 'bg-emerald-400/10'  },
        ] as const).map(({ key, label, color, bg }) => (
          <div key={key} className={`rounded-xl ${bg} px-4 py-3 text-center`}>
            <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CheckSquare size={14} className="text-primary" />
            Todas as Tarefas
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 divide-y divide-border">
          {tarefas.map(tarefa => {
            const cfg = statusConfig[tarefa.status as keyof typeof statusConfig]
            const Icon = cfg.icon
            return (
              <div key={tarefa.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <Icon size={15} className={cfg.color} />
                  <span className="text-sm text-foreground">{tarefa.titulo}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground">Entrega: {tarefa.entrega}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
