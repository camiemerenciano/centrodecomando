import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Search, Send, Paperclip, Smile, AtSign, Mail, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'

const channelIcon: Record<string, React.ReactNode> = {
  instagram: <AtSign size={11} />,
  email:     <Mail size={11} />,
  internal:  <MessageSquare size={11} />,
  whatsapp:  <Phone size={11} />,
}

const conversations = [
  { id: 1, name: 'Ana Beatriz', company: 'Loja Bloom', channel: 'instagram', message: 'Aprovei os layouts! Pode agendar.', time: '5min', unread: 2, active: true },
  { id: 2, name: 'Carlos M.',   company: 'Studio Fit',  channel: 'email',     message: 'Preciso do relatório até 5ª.', time: '28min', unread: 1, active: false },
  { id: 3, name: 'Fernanda L.', company: 'Café Aurora', channel: 'whatsapp',  message: 'Ótimo trabalho no feed!', time: '1h', unread: 0, active: false },
  { id: 4, name: 'Diego R.',    company: 'Tech Solve',  channel: 'internal',  message: 'Podemos agendar uma call?', time: '3h', unread: 1, active: false },
  { id: 5, name: 'Juliana S.',  company: 'Beleza Pura', channel: 'instagram', message: 'Quando saem os stories?', time: '5h', unread: 0, active: false },
]

const messages = [
  { id: 1, from: 'Ana Beatriz', content: 'Olá! Revisei todas as artes para a campanha do Dia dos Namorados.', time: '14:23', mine: false },
  { id: 2, from: 'me',          content: 'Oi Ana! Tudo certo. Conseguiu ver o story animado também?', time: '14:25', mine: true },
  { id: 3, from: 'Ana Beatriz', content: 'Sim! Amei o efeito. Mas no 3º slide você pode trocar a foto por uma mais quente, tipo casal no pôr do sol?', time: '14:27', mine: false },
  { id: 4, from: 'me',          content: 'Claro! Já tenho algumas opções no banco. Te mando uma prévia em 20 minutos.', time: '14:30', mine: true },
  { id: 5, from: 'Ana Beatriz', content: 'Perfeito! Aprovei os layouts! Pode agendar.', time: '14:48', mine: false },
]

export default function MensagensPage() {
  return (
    <div className="flex gap-0 h-[calc(100vh-8.5rem)] rounded-xl overflow-hidden border border-border">
      {/* Conversation list */}
      <div className="w-72 border-r border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar conversas..."
              className="w-full h-8 rounded-lg bg-muted border border-border pl-8 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                conv.active ? 'bg-primary/8 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {conv.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">{conv.name}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                </div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] text-muted-foreground">{conv.company}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    {channelIcon[conv.channel]} {conv.channel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11px] text-muted-foreground truncate">{conv.message}</p>
                  {conv.unread > 0 && (
                    <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold shrink-0">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col flex-1 bg-background">
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">AB</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-foreground">Ana Beatriz</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <p className="text-xs text-muted-foreground">Loja Bloom · online</p>
            </div>
          </div>
          <div className="ml-auto">
            <Badge className="bg-pink-500/15 text-pink-400 border-0 text-[10px] flex items-center gap-1">
              <AtSign size={10} /> Instagram
            </Badge>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
              {!msg.mine && (
                <Avatar className="w-7 h-7 mr-2 shrink-0 self-end">
                  <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">AB</AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-xs lg:max-w-sm xl:max-w-md`}>
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.mine
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border border-border text-foreground rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                <p className={`text-[10px] text-muted-foreground mt-1 ${msg.mine ? 'text-right' : 'text-left'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-card">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                placeholder="Escreva uma mensagem..."
                rows={1}
                className="w-full resize-none rounded-xl bg-muted border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all pr-12"
              />
            </div>
            <div className="flex items-center gap-1.5 pb-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Paperclip size={16} />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Smile size={16} />
              </button>
              <Button size="sm" className="h-8 w-8 p-0 bg-primary hover:bg-primary/90">
                <Send size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
