'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const AREAS = [
  'Social Media',
  'Captação',
  'Edição de Vídeo',
  'Cobertura',
  'Tráfego Pago',
  'Google Meu Negócio',
  'Mentoria & Consultoria',
  'Identidade Visual',
  'Lançamentos',
  'Posicionamento de Marca',
  'Copywriting',
  'Design',
  'Fotos',
  'Palestrar',
]

export default function AreasDeAtuacaoPage() {
  const { user } = useAuth()
  const supabase = createClient()

  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!user) return
    const saved = user.user_metadata?.areas_de_atuacao
    if (Array.isArray(saved)) setSelected(saved)
  }, [user])

  function toggle(area: string) {
    setSelected(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    )
  }

  async function save() {
    setSaving(true)
    setMsg('')
    const { error } = await supabase.auth.updateUser({
      data: { areas_de_atuacao: selected },
    })
    setSaving(false)
    if (error) {
      setIsError(true)
      setMsg(`Erro: ${error.message}`)
    } else {
      setIsError(false)
      setMsg('Áreas salvas com sucesso!')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="max-w-[860px] space-y-5">
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold">Áreas de Atuação da Agência</CardTitle>
          <p className="text-xs text-muted-foreground">Selecione todos os serviços que a agência oferece.</p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AREAS.map(area => {
              const active = selected.includes(area)
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggle(area)}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium text-left transition-all ${
                    active
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-muted/40 border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-all ${
                    active ? 'bg-primary border-primary' : 'border-border bg-background'
                  }`}>
                    {active && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  {area}
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {selected.length} {selected.length === 1 ? 'área selecionada' : 'áreas selecionadas'}
            </span>

            <div className="flex items-center gap-3">
              {msg && (
                <span className={`text-xs flex items-center gap-1.5 ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                  {isError ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                  {msg}
                </span>
              )}
              <Button
                size="sm"
                onClick={save}
                disabled={saving}
                className="h-8 text-xs bg-primary hover:bg-primary/90"
              >
                {saving ? <><Loader2 size={13} className="animate-spin" /> Salvando…</> : 'Salvar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
