'use client'

import { usePathname } from 'next/navigation'
import { Search, Bell } from 'lucide-react'

const titles: Record<string, { label: string; sub: string }> = {
  '/dashboard':  { label: 'Dashboard',            sub: 'Visão geral da operação'       },
  '/mensagens':  { label: 'Mensagens',             sub: 'Central de comunicação'        },
  '/tarefas':    { label: 'Tarefas',               sub: 'Gestão de entregas'            },
  '/pipeline':   { label: 'Pipeline',              sub: 'Funil de vendas e projetos'    },
  '/calendario': { label: 'Calendário',            sub: 'Agenda de conteúdo e eventos'  },
  '/clientes':   { label: 'Clientes',              sub: 'Base de clientes e contas'     },
  '/equipe':     { label: 'Equipe',                sub: 'Membros e permissões'          },
}

export function TopBar() {
  const pathname = usePathname()
  const base = '/' + (pathname.split('/')[1] ?? '')
  const { label, sub } = titles[base] ?? { label: 'Centro de Comando', sub: '' }

  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-base font-semibold text-foreground leading-none">{label}</h1>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Buscar..."
            className="h-8 w-56 rounded-lg bg-muted border border-border pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
          />
        </div>

        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
        </button>
      </div>
    </header>
  )
}
