import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Clock, CheckSquare2, Circle, PlayCircle, Eye } from 'lucide-react'

type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

interface Task {
  id: number
  title: string
  client: string
  assignee: string
  priority: TaskPriority
  due: string
  tags: string[]
}

const columns: { id: TaskStatus; label: string; icon: React.ReactNode; color: string; tasks: Task[] }[] = [
  {
    id: 'todo',
    label: 'A Fazer',
    icon: <Circle size={13} />,
    color: 'text-muted-foreground',
    tasks: [
      { id: 1, title: 'Criar copy para campanha Dia dos Namorados', client: 'Loja Bloom', assignee: 'MG', priority: 'urgent', due: 'Hoje', tags: ['copy', 'campanha'] },
      { id: 2, title: 'Pesquisa de concorrentes – setor fitness', client: 'Studio Fit', assignee: 'CF', priority: 'medium', due: '25/05', tags: ['pesquisa'] },
      { id: 3, title: 'Paleta de cores nova identidade', client: 'Tech Solve', assignee: 'LR', priority: 'low', due: '28/05', tags: ['design'] },
    ],
  },
  {
    id: 'in_progress',
    label: 'Em Andamento',
    icon: <PlayCircle size={13} />,
    color: 'text-sky-400',
    tasks: [
      { id: 4, title: 'Edição de reels – pacote maio', client: 'Café Aurora', assignee: 'MG', priority: 'high', due: 'Amanhã', tags: ['vídeo', 'reels'] },
      { id: 5, title: 'Calendário editorial – junho', client: 'Loja Bloom', assignee: 'CF', priority: 'medium', due: '26/05', tags: ['planejamento'] },
    ],
  },
  {
    id: 'review',
    label: 'Em Revisão',
    icon: <Eye size={13} />,
    color: 'text-amber-400',
    tasks: [
      { id: 6, title: 'Feed layout semanal', client: 'Beleza Pura', assignee: 'LR', priority: 'high', due: '24/05', tags: ['design', 'feed'] },
      { id: 7, title: 'Relatório de performance abril', client: 'Studio Fit', assignee: 'CF', priority: 'medium', due: '24/05', tags: ['relatório'] },
    ],
  },
  {
    id: 'done',
    label: 'Concluído',
    icon: <CheckSquare2 size={13} />,
    color: 'text-emerald-400',
    tasks: [
      { id: 8, title: 'Artes para stories – promoção', client: 'Loja Bloom', assignee: 'MG', priority: 'medium', due: '22/05', tags: ['stories'] },
      { id: 9, title: 'Bio e destaques atualizados', client: 'Café Aurora', assignee: 'LR', priority: 'low', due: '20/05', tags: ['perfil'] },
    ],
  },
]

const priorityClass: Record<TaskPriority, string> = {
  urgent: 'bg-red-500/15 text-red-400 border-0',
  high:   'bg-orange-500/15 text-orange-400 border-0',
  medium: 'bg-sky-500/15 text-sky-400 border-0',
  low:    'bg-muted text-muted-foreground border-0',
}

const priorityLabel: Record<TaskPriority, string> = {
  urgent: 'Urgente', high: 'Alta', medium: 'Média', low: 'Baixa',
}

export default function TarefasPage() {
  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['Todas', 'Minhas', 'Sem dono', 'Atrasadas'] as const).map((f, i) => (
            <button
              key={f}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                i === 0
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <Button size="sm" className="h-8 bg-primary hover:bg-primary/90 text-xs">
          <Plus size={14} /> Nova tarefa
        </Button>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
        {columns.map(col => (
          <div key={col.id} className="flex flex-col gap-3">
            {/* Column header */}
            <div className="flex items-center justify-between px-1">
              <div className={`flex items-center gap-2 text-xs font-semibold ${col.color}`}>
                {col.icon}
                {col.label}
                <span className="text-[10px] text-muted-foreground font-normal">({col.tasks.length})</span>
              </div>
              <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={12} />
              </button>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2.5">
              {col.tasks.map(task => (
                <Card
                  key={task.id}
                  className="bg-card border-border hover:border-primary/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 group"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-foreground font-medium leading-snug group-hover:text-primary/90 transition-colors">
                        {task.title}
                      </p>
                    </div>

                    <p className="text-xs text-muted-foreground">{task.client}</p>

                    <div className="flex flex-wrap gap-1">
                      {task.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={`text-[10px] px-1.5 h-4 ${priorityClass[task.priority]}`}>
                        {priorityLabel[task.priority]}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Clock size={10} /> {task.due}
                        </span>
                        <Avatar className="w-5 h-5">
                          <AvatarFallback className="text-[9px] bg-primary/20 text-primary font-semibold">
                            {task.assignee}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add card button */}
              <button className="w-full py-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
                + Adicionar tarefa
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
