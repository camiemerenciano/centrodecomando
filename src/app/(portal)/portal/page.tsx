'use client'

import { useAuth } from '@/hooks/use-auth'
import { CheckSquare, ThumbsUp, BarChart2, Clock, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function PortalDashboard() {
  const { user } = useAuth()
  const nome = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? 'Cliente'

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Saudação */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Olá, {nome} 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe o andamento do seu projeto abaixo.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Tarefas em Andamento</p>
                <p className="text-3xl font-bold text-sky-400 mt-1 leading-none">–</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-sky-400/10 flex items-center justify-center">
                <CheckSquare size={16} className="text-sky-400" />
              </div>
            </div>
            <Link href="/portal/tarefas" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-400 transition-colors">
              Ver tarefas <ArrowRight size={10} />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Aguardando Aprovação</p>
                <p className="text-3xl font-bold text-amber-400 mt-1 leading-none">–</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 flex items-center justify-center">
                <ThumbsUp size={16} className="text-amber-400" />
              </div>
            </div>
            <Link href="/portal/aprovacoes" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-400 transition-colors">
              Ver aprovações <ArrowRight size={10} />
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Entregas Concluídas</p>
                <p className="text-3xl font-bold text-emerald-400 mt-1 leading-none">–</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                <BarChart2 size={16} className="text-emerald-400" />
              </div>
            </div>
            <Link href="/portal/relatorios" className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-emerald-400 transition-colors">
              Ver relatórios <ArrowRight size={10} />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Atividade recente */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock size={14} className="text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Clock size={28} className="text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
