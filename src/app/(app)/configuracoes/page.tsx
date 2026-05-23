'use client'

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function ConfiguracoesPage() {
  const { theme, setTheme } = useTheme()

  const options = [
    {
      id: 'dark' as const,
      label: 'Dark',
      description: 'Fundo escuro com acentos em laranja',
      icon: Moon,
      preview: (
        <div className="w-full h-20 rounded-lg bg-[oklch(0.10_0.012_25)] border border-[oklch(0.22_0.014_25)] p-2 flex flex-col gap-1.5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[oklch(0.62_0.19_40)]" />
            <div className="h-2 w-12 rounded bg-[oklch(0.22_0.014_25)]" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-6 h-10 rounded bg-[oklch(0.13_0.010_22)] border border-[oklch(0.22_0.014_25)]" />
            <div className="flex-1 rounded bg-[oklch(0.13_0.010_22)] border border-[oklch(0.22_0.014_25)]" />
          </div>
        </div>
      ),
    },
    {
      id: 'light' as const,
      label: 'Light',
      description: 'Fundo claro e limpo',
      icon: Sun,
      preview: (
        <div className="w-full h-20 rounded-lg bg-[oklch(0.98_0.004_25)] border border-[oklch(0.88_0.008_25)] p-2 flex flex-col gap-1.5">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-[oklch(0.58_0.19_40)]" />
            <div className="h-2 w-12 rounded bg-[oklch(0.88_0.008_25)]" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-6 h-10 rounded bg-[oklch(0.96_0.005_25)] border border-[oklch(0.88_0.008_25)]" />
            <div className="flex-1 rounded bg-white border border-[oklch(0.88_0.008_25)]" />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-[860px] space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Monitor size={14} className="text-muted-foreground" /> Aparência
          </CardTitle>
          <p className="text-xs text-muted-foreground">Escolha o tema da interface</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {options.map(({ id, label, description, icon: Icon, preview }) => {
              const active = theme === id
              return (
                <button
                  key={id}
                  onClick={() => setTheme(id)}
                  className={`flex flex-col gap-3 p-3 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-primary bg-primary/8 ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/40 hover:bg-muted/40'
                  }`}
                >
                  {preview}
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                      active ? 'border-primary bg-primary' : 'border-border'
                    }`}>
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold flex items-center gap-1.5 ${active ? 'text-primary' : 'text-foreground'}`}>
                        <Icon size={11} /> {label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
