'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Search, Users, ShieldCheck, User, Mail, Clock, Loader2 } from 'lucide-react'

interface Membro {
  id: string
  nome: string
  email: string
  role: string
  created_at: string
  last_sign_in: string | null
}

const roleConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  superadmin: { label: 'Administrador', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20',   icon: <ShieldCheck size={10} /> },
  user:       { label: 'Usuário',       cls: 'bg-muted text-muted-foreground border-border',         icon: <User size={10} /> },
}

function fmt(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

function initials(nome: string) {
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export default function MembrosPage() {
  const [membros, setMembros]   = useState<Membro[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    fetch('/api/admin/membros')
      .then(r => r.json())
      .then(d => { setMembros(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = membros.filter(m =>
    m.nome.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  )

  const admins  = membros.filter(m => m.role === 'superadmin').length
  const usuarios = membros.filter(m => m.role !== 'superadmin').length

  return (
    <div className="space-y-5 max-w-[1200px]">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Users size={18} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Todos os membros</p>
          <p className="text-xs text-muted-foreground">Visão completa de todos os usuários cadastrados na plataforma</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users size={16} className="text-primary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-foreground">{membros.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck size={16} className="text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Administradores</p>
              <p className="text-xl font-bold text-foreground">{admins}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
              <User size={16} className="text-sky-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Usuários</p>
              <p className="text-xl font-bold text-foreground">{usuarios}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
      </div>

      {/* List */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Nenhum membro encontrado.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(m => {
                const cfg = roleConfig[m.role] ?? roleConfig['user']
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <Avatar className="w-9 h-9 shrink-0">
                      <AvatarFallback className={`text-sm font-semibold ${m.role === 'superadmin' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>
                        {initials(m.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-medium text-foreground truncate">{m.nome}</p>
                        <Badge className={`text-[10px] px-1.5 h-4 flex items-center gap-1 shrink-0 ${cfg.cls}`}>
                          {cfg.icon}
                          {cfg.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Mail size={10} className="text-muted-foreground shrink-0" />
                        <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[10px] text-muted-foreground">Cadastro</p>
                      <p className="text-xs text-foreground">{fmt(m.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 w-36">
                      <Clock size={11} />
                      <span>{m.last_sign_in ? fmt(m.last_sign_in) : 'Nunca acessou'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
