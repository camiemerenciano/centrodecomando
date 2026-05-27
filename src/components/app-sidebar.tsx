'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  Calendar,
  Users,
  UsersRound,
  Settings,
  ChevronDown,
  Bell,
  LogOut,
  Plug,
  MessagesSquare,
  Building2,
  FolderOpen,
  ShieldCheck,
  MessageSquareDot,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Logo } from '@/components/logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navGroups = [
  {
    label: 'Inteligência',
    items: [
      { href: '/dashboard',          label: 'Dashboard',     icon: LayoutDashboard },
      { href: '/assistente/conexoes', label: 'Conexões',     icon: Plug },
      { href: '/pipeline',            label: 'Pipeline',     icon: FolderKanban },
      { href: '/clientes',            label: 'Clientes',     icon: Users },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { href: '/chat', label: 'Chat Interno', icon: MessagesSquare },
    ],
  },
  {
    label: 'Operação',
    items: [
      { href: '/projetos',   label: 'Projetos',   icon: FolderOpen },
      { href: '/tarefas',    label: 'Tarefas',    icon: CheckSquare },
      { href: '/calendario', label: 'Calendário', icon: Calendar },
      { href: '/equipe',     label: 'Equipe',     icon: UsersRound },
    ],
  },
]

type ChatToast = { id: number; autor: string; texto: string; isDM: boolean }

export function AppSidebar() {
  const pathname = usePathname()
  const { user, role, signOut } = useAuth()
  const supabase = createClient()

  const [unreadChat, setUnreadChat] = useState(false)
  const [toasts, setToasts]         = useState<ChatToast[]>([])
  const toastIdRef                  = useRef(0)

  const initials = (user?.user_metadata?.full_name as string | undefined)
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? '?'

  // Ativa vínculo de equipe se o usuário chegou via convite
  useEffect(() => {
    fetch('/api/team/activate', { method: 'POST' }).catch(() => {})
  }, [])

  // Limpa badge ao entrar no chat
  useEffect(() => {
    if (pathname.startsWith('/chat')) setUnreadChat(false)
  }, [pathname])

  // Subscriptions de notificação de chat
  useEffect(() => {
    if (!user) return

    let channelIds: string[] = []
    let dmIds: string[]      = []
    const subs: ReturnType<typeof supabase.channel>[] = []

    function showToast(autor: string, texto: string, isDM: boolean) {
      if (pathname.startsWith('/chat')) return
      setUnreadChat(true)
      const id = ++toastIdRef.current
      setToasts(prev => [...prev.slice(-3), { id, autor, texto, isDM }])
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000)
    }

    async function setup() {
      // Descobre o workspace
      const wsRes = await fetch('/api/team/workspace')
      const ws    = await wsRes.json()
      const ownerId = ws.ownerId ?? user!.id

      // Canais do workspace
      const { data: channels } = await supabase
        .from('chat_canais').select('id').eq('user_id', ownerId)
      channelIds = (channels ?? []).map((c: { id: string }) => c.id)

      // DMs do usuário
      const { data: dms } = await supabase
        .from('chat_dms').select('id')
        .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)
      dmIds = (dms ?? []).map((d: { id: string }) => d.id)

      // Subscriptions de canais
      if (channelIds.length > 0) {
        const sub = supabase.channel('notif:canal:' + user!.id)
        channelIds.forEach(cid => {
          sub.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_mensagens', filter: `canal_id=eq.${cid}` },
            (payload) => {
              const msg = payload.new as { autor_id: string; autor_nome: string; conteudo: string }
              if (msg.autor_id === user!.id) return
              showToast(msg.autor_nome, msg.conteudo, false)
            }
          )
        })
        sub.subscribe()
        subs.push(sub)
      }

      // Subscriptions de DMs
      if (dmIds.length > 0) {
        const sub = supabase.channel('notif:dm:' + user!.id)
        dmIds.forEach(did => {
          sub.on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'chat_dm_mensagens', filter: `dm_id=eq.${did}` },
            (payload) => {
              const msg = payload.new as { autor_id: string; autor_nome: string; conteudo: string }
              if (msg.autor_id === user!.id) return
              showToast(msg.autor_nome, msg.conteudo, true)
            }
          )
        })
        sub.subscribe()
        subs.push(sub)
      }
    }

    setup()

    return () => { subs.forEach(s => supabase.removeChannel(s)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <>
      <aside className="flex flex-col w-60 min-h-screen border-r border-sidebar-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <Logo size={32} className="text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-sidebar-foreground leading-none truncate">
              Orbit™
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              Método ÓRBITA
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-4">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5 font-medium">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon, ...rest }) => {
                  const badge  = (rest as { badge?: string }).badge
                  const active = pathname === href || pathname.startsWith(href + '/')
                  const isChat = href === '/chat'
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group
                        ${active
                          ? 'bg-primary/15 text-primary border border-primary/20'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                        }
                      `}
                    >
                      <Icon
                        size={16}
                        className={active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground transition-colors'}
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {isChat && unreadChat && !active && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                      {badge && (
                        <Badge
                          className={`text-[10px] px-1.5 py-0 h-4 font-semibold shrink-0 ${
                            active
                              ? 'bg-primary/25 text-primary border-0'
                              : 'bg-muted text-muted-foreground border-0'
                          }`}
                        >
                          {badge}
                        </Badge>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Superadmin */}
        {role === 'superadmin' && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-1.5 px-2 pb-1.5">
              <ShieldCheck size={11} className="text-amber-400 shrink-0" />
              <p className="text-[10px] uppercase tracking-widest text-amber-400/80 font-semibold">
                Administrador
              </p>
            </div>
            <div className="space-y-0.5">
              {[
                { href: '/agencias', label: 'Agências', icon: Building2 },
                { href: '/membros',  label: 'Membros',  icon: Users },
              ].map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                      active
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                        : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-amber-400' : 'text-muted-foreground group-hover:text-sidebar-foreground transition-colors'} />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="px-3 pb-3 space-y-0.5 border-t border-sidebar-border pt-3">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all group">
            <Bell size={16} className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
            <span className="flex-1 text-left">Notificações</span>
            <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
          </button>

          <Link
            href="/configuracoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all group"
          >
            <Settings size={16} className="text-muted-foreground group-hover:text-sidebar-foreground transition-colors" />
            <span>Configurações</span>
          </Link>
        </div>

        {/* User */}
        <div className="px-3 pb-4">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-all text-left cursor-pointer bg-transparent border-0">
              <div className="relative shrink-0">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className={`text-xs font-semibold ${role === 'superadmin' ? 'bg-amber-500/20 text-amber-400' : 'bg-primary/20 text-primary'}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {role === 'superadmin' && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center shadow-sm" title="Administrador">
                    <ShieldCheck size={8} className="text-black" />
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-sidebar-foreground truncate">
                    {(user?.user_metadata?.full_name as string | undefined) ?? 'Usuário'}
                  </p>
                  {role === 'superadmin' && (
                    <span className="shrink-0 text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded px-1 py-px leading-none">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronDown size={13} className="text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-1">
              <DropdownMenuItem onClick={() => window.location.href = '/perfil'}>
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.location.href = '/configuracoes'}>
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                <LogOut size={14} className="mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Chat toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className="pointer-events-auto flex items-start gap-3 bg-card border border-border rounded-xl shadow-2xl px-4 py-3 w-72 animate-in slide-in-from-bottom-2 fade-in duration-200"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquareDot size={15} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{t.autor}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {t.isDM ? 'Mensagem privada' : 'Chat Interno'} · {t.texto}
                </p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
