'use client'

import { useState, useEffect, useCallback } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Unplug,
  Plug,
  Calendar,
  MessageCircle,
  AlertCircle,
  ExternalLink,
  Smartphone,
} from 'lucide-react'

const QR_TTL = 45 // seconds before QR expires

// ── WhatsApp / Evolution ──────────────────────────────────────────────────────

type WaStatus = 'disconnected' | 'loading_qr' | 'awaiting_scan' | 'connected'

function makeQrValue(instanceName: string) {
  // Mimics the format Evolution API returns for QR codes
  return `2@${instanceName || 'nexus-agency'},${Math.random().toString(36).slice(2)},mock-evo-qr-${Date.now()}`
}

function WhatsAppCard() {
  const [status, setStatus]   = useState<WaStatus>('disconnected')
  const [apiUrl, setApiUrl]   = useState('')
  const [apiKey, setApiKey]   = useState('')
  const [instance, setInstance] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [qrValue, setQrValue] = useState('')
  const [ttl, setTtl]         = useState(QR_TTL)
  const [expired, setExpired] = useState(false)

  // countdown while QR is visible
  useEffect(() => {
    if (status !== 'awaiting_scan') return
    setTtl(QR_TTL)
    setExpired(false)
    const interval = setInterval(() => {
      setTtl(t => {
        if (t <= 1) { clearInterval(interval); setExpired(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status, qrValue])

  async function handleGenerateQr() {
    if (!apiUrl || !apiKey || !instance) return
    setStatus('loading_qr')
    // Simulate Evolution API call to create instance + fetch QR
    await new Promise(r => setTimeout(r, 1600))
    setQrValue(makeQrValue(instance))
    setStatus('awaiting_scan')
  }

  function handleRefreshQr() {
    setQrValue(makeQrValue(instance))
    setExpired(false)
    setTtl(QR_TTL)
  }

  function handleDisconnect() {
    setStatus('disconnected')
    setQrValue('')
    setExpired(false)
  }

  const formValid = apiUrl.trim() && apiKey.trim() && instance.trim()

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
              <MessageCircle size={22} className="text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">via Evolution API</p>
            </div>
          </div>
          <StatusBadge status={status === 'loading_qr' || status === 'awaiting_scan' ? 'connecting' : status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Receba e envie mensagens do WhatsApp diretamente no Centro de Comando.
          Todas as conversas ficam centralizadas no módulo de Mensagens.
        </p>

        {/* ── form ── */}
        {status === 'disconnected' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">URL da Evolution API</label>
              <input
                value={apiUrl}
                onChange={e => setApiUrl(e.target.value)}
                placeholder="https://evolution.suaagencia.com"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">Nome da instância</label>
              <input
                value={instance}
                onChange={e => setInstance(e.target.value)}
                placeholder="nexus-agency"
                className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>
        )}

        {/* ── loading QR ── */}
        {status === 'loading_qr' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <Loader2 size={28} className="text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Gerando QR Code…</p>
          </div>
        )}

        {/* ── QR code ── */}
        {status === 'awaiting_scan' && (
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className={`rounded-xl p-3 bg-white transition-all ${expired ? 'opacity-30 blur-[2px]' : ''}`}>
                <QRCodeSVG
                  value={qrValue}
                  size={164}
                  bgColor="#ffffff"
                  fgColor="#111111"
                  level="M"
                />
              </div>
              {expired && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handleRefreshQr}
                    className="flex flex-col items-center gap-1.5 bg-card/90 rounded-xl px-4 py-3 border border-border shadow-lg backdrop-blur-sm"
                  >
                    <RefreshCw size={20} className="text-primary" />
                    <span className="text-xs font-medium text-foreground">QR expirado</span>
                    <span className="text-[10px] text-muted-foreground">Clique para gerar novo</span>
                  </button>
                </div>
              )}
            </div>

            {!expired && (
              <div className="text-center space-y-1">
                <div className="flex items-center gap-1.5 justify-center">
                  <Smartphone size={12} className="text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    Abra o WhatsApp → <span className="text-foreground font-medium">Dispositivos conectados</span> → Conectar
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  QR expira em <span className={`font-semibold ${ttl <= 10 ? 'text-red-400' : 'text-foreground'}`}>{ttl}s</span>
                </p>
              </div>
            )}

            {/* simulate scan button for demo */}
            {!expired && (
              <button
                onClick={() => setStatus('connected')}
                className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors underline underline-offset-2"
              >
                Simular leitura (demo)
              </button>
            )}
          </div>
        )}

        {/* ── connected ── */}
        {status === 'connected' && (
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-3 flex items-center gap-3">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Instância conectada</p>
              <p className="text-xs text-muted-foreground truncate">{instance || 'nexus-agency'}</p>
            </div>
          </div>
        )}

        {/* ── actions ── */}
        <div className="flex items-center gap-2 pt-1">
          {status === 'connected' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-border"
                onClick={handleGenerateQr}
              >
                <RefreshCw size={13} /> Reconectar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                onClick={handleDisconnect}
              >
                <Unplug size={13} /> Desconectar
              </Button>
            </>
          ) : status === 'awaiting_scan' ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border"
              onClick={handleDisconnect}
            >
              Cancelar
            </Button>
          ) : status === 'disconnected' ? (
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90"
              disabled={!formValid}
              onClick={handleGenerateQr}
            >
              <Plug size={13} /> Gerar QR Code
            </Button>
          ) : null}

          <a
            href="https://doc.evolution-api.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            Documentação <ExternalLink size={11} />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Google Agenda ─────────────────────────────────────────────────────────────

type GcalStatus = 'disconnected' | 'connecting' | 'connected'

const mockAccounts = [
  { email: 'fabrica@husers.com.br', name: 'Fábrica HUsers', initials: 'FH' },
  { email: 'camila@agencia.com',    name: 'Camila',          initials: 'CA' },
]

const mockCalendars = [
  { id: 'primary', name: 'fabrica@husers.com.br', primary: true,  selected: true  },
  { id: 'cal2',    name: 'Agência – Entregas',    primary: false, selected: true  },
  { id: 'cal3',    name: 'Feriados no Brasil',    primary: false, selected: false },
]

function GoogleAccountPicker({
  onSelect,
  onClose,
}: {
  onSelect: (email: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* popup — sized like Google's real chooser */}
      <div
        className="relative w-[360px] rounded-2xl bg-[#202124] border border-white/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Google header */}
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center gap-2 mb-3">
            {/* Google G logo */}
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            <span className="text-sm font-medium text-white/90">Fazer login com o Google</span>
          </div>
          <p className="text-xs text-white/50">Escolha uma conta para continuar com Centro de Comando</p>
        </div>

        {/* account list */}
        <div className="py-2">
          {mockAccounts.map(acc => (
            <button
              key={acc.email}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors text-left"
              onClick={() => onSelect(acc.email)}
            >
              <div className="w-9 h-9 rounded-full bg-primary/80 flex items-center justify-center shrink-0 text-sm font-semibold text-white">
                {acc.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{acc.name}</p>
                <p className="text-xs text-white/50 truncate">{acc.email}</p>
              </div>
            </button>
          ))}

          <button
            className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-white/5 transition-colors text-left border-t border-white/8 mt-1"
            onClick={() => onSelect('outra@conta.com')}
          >
            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>
            <p className="text-sm text-white/60">Usar outra conta</p>
          </button>
        </div>

        {/* footer */}
        <div className="px-5 py-3 border-t border-white/8 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-xs text-[#8ab4f8] hover:text-[#8ab4f8]/80 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex gap-3 text-[10px] text-white/30">
            <span>Privacidade</span>
            <span>Termos</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoogleCalendarCard() {
  const [status, setStatus]       = useState<GcalStatus>('disconnected')
  const [loading, setLoading]     = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [connectedEmail, setConnectedEmail] = useState('')
  const [calendars, setCalendars] = useState(mockCalendars)

  async function handleAccountSelect(email: string) {
    setShowPicker(false)
    setLoading(true)
    setStatus('connecting')
    await new Promise(r => setTimeout(r, 1400))
    setConnectedEmail(email)
    setStatus('connected')
    setLoading(false)
  }

  function toggleCalendar(id: string) {
    setCalendars(prev =>
      prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c)
    )
  }

  return (
    <>
      {showPicker && (
        <GoogleAccountPicker
          onSelect={handleAccountSelect}
          onClose={() => setShowPicker(false)}
        />
      )}

      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" className="text-sky-400" />
                  <path d="M16 2v4M8 2v4M3 9h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-sky-400" />
                  <rect x="8" y="13" width="3" height="3" rx="0.5" fill="currentColor" className="text-sky-400" />
                  <rect x="13" y="13" width="3" height="3" rx="0.5" fill="currentColor" className="text-sky-400" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Google Agenda</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">via OAuth 2.0</p>
              </div>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sincronize eventos e prazos com o Google Agenda. Postagens, reuniões e
            deadlines aparecem automaticamente no Calendário do Centro de Comando.
          </p>

          {status === 'connecting' && (
            <div className="rounded-lg bg-amber-500/8 border border-amber-500/20 p-3 flex items-center gap-3">
              <Loader2 size={15} className="text-amber-400 animate-spin shrink-0" />
              <p className="text-sm text-foreground">Autenticando com Google…</p>
            </div>
          )}

          {status === 'connected' && (
            <div className="space-y-3">
              <div className="rounded-lg bg-sky-500/8 border border-sky-500/20 p-3 flex items-center gap-3">
                <CheckCircle2 size={16} className="text-sky-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Conta conectada</p>
                  <p className="text-xs text-muted-foreground truncate">{connectedEmail}</p>
                </div>
                <button
                  className="text-[10px] text-primary hover:text-primary/80 transition-colors shrink-0"
                  onClick={() => setShowPicker(true)}
                >
                  Trocar conta
                </button>
              </div>

              <div>
                <p className="text-xs font-medium text-foreground/80 mb-2">Agendas sincronizadas</p>
                <div className="space-y-1.5">
                  {calendars.map(cal => (
                    <button
                      key={cal.id}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group text-left"
                      onClick={() => toggleCalendar(cal.id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          cal.selected
                            ? 'bg-primary border-primary'
                            : 'border-border group-hover:border-primary/50'
                        }`}
                      >
                        {cal.selected && (
                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-foreground truncate flex-1">{cal.name}</span>
                      {cal.primary && (
                        <Badge className="text-[10px] bg-primary/15 text-primary border-0 shrink-0">
                          Principal
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                <AlertCircle size={12} className="shrink-0" />
                Sincronização automática a cada 15 minutos
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            {status === 'connected' ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border"
                  onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1000) }}
                  disabled={loading}
                >
                  {loading
                    ? <><Loader2 size={13} className="animate-spin" /> Sincronizando…</>
                    : <><RefreshCw size={13} /> Sincronizar agora</>
                  }
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                  onClick={() => { setStatus('disconnected'); setConnectedEmail('') }}
                >
                  <Unplug size={13} /> Desconectar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90"
                disabled={status === 'connecting'}
                onClick={() => setShowPicker(true)}
              >
                {status === 'connecting'
                  ? <><Loader2 size={13} className="animate-spin" /> Autenticando…</>
                  : <><Calendar size={13} /> Conectar com Google</>
                }
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'connected') {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-[11px] gap-1 px-2 h-6 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Conectado
      </Badge>
    )
  }
  if (status === 'connecting') {
    return (
      <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/20 text-[11px] gap-1 px-2 h-6 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Conectando
      </Badge>
    )
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-0 text-[11px] gap-1 px-2 h-6 shrink-0">
      <XCircle size={11} />
      Desconectado
    </Badge>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ConexoesPage() {
  return (
    <div className="max-w-[860px] space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Integrações ativas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Conecte ferramentas externas para centralizar toda a operação da agência.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <WhatsAppCard />
        <GoogleCalendarCard />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
        <AlertCircle size={15} className="text-muted-foreground shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          As credenciais inseridas são armazenadas de forma segura e nunca expostas no lado do cliente.
          As conexões são gerenciadas via rotas de servidor.
        </p>
      </div>
    </div>
  )
}
