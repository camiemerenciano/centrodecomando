import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado' }, { status: 503 })
  }

  const body = await req.json()

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const contextLines: string[] = []

  if (body.tarefasAtrasadas?.length > 0) {
    contextLines.push(`TAREFAS ATRASADAS (${body.tarefasAtrasadas.length}):`)
    body.tarefasAtrasadas.forEach((t: { titulo: string; diasAtraso: number; projeto?: string }) => {
      contextLines.push(`- "${t.titulo}"${t.projeto ? ` (${t.projeto})` : ''} — ${t.diasAtraso} dia(s) de atraso`)
    })
  }

  if (body.reunioes?.length > 0) {
    contextLines.push(`\nREUNIÕES PRÓXIMAS (${body.reunioes.length}):`)
    body.reunioes.forEach((r: { titulo: string; inicio: string }) => {
      const d = new Date(r.inicio)
      contextLines.push(`- "${r.titulo}" — ${d.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`)
    })
  }

  if (body.projetosParados?.length > 0) {
    contextLines.push(`\nPROJETOS SEM ATIVIDADE:`)
    body.projetosParados.forEach((p: { nome: string; diasParado: number }) => {
      contextLines.push(`- "${p.nome}" — ${p.diasParado} dias sem atividade`)
    })
  }

  if (body.membrossobrecarregados?.length > 0) {
    contextLines.push(`\nMEMBROS SOBRECARREGADOS:`)
    body.membrossobrecarregados.forEach((m: { nome: string; tarefasAtivas: number }) => {
      contextLines.push(`- ${m.nome} — ${m.tarefasAtivas} tarefas ativas`)
    })
  }

  if (body.etapasAcumuladas?.length > 0) {
    contextLines.push(`\nETAPAS COM ACÚMULO NO PIPELINE:`)
    body.etapasAcumuladas.forEach((e: { etapa: string; quantidade: number }) => {
      contextLines.push(`- ${e.etapa}: ${e.quantidade} leads`)
    })
  }

  if (contextLines.length === 0) {
    return NextResponse.json({ priorities: 'Nenhum item crítico identificado. A operação parece estar em dia!' })
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: `Você é um assistente de gestão para uma agência de marketing digital. Com base no contexto operacional abaixo, defina as prioridades mais importantes para hoje, em ordem de urgência. Seja direto, objetivo e acionável.

${contextLines.join('\n')}

Responda com uma lista numerada de até 5 prioridades. Para cada uma, explique em uma frase o que fazer e por quê é urgente. Use português direto ao ponto.`,
      },
    ],
  })

  const priorities = message.content[0]?.type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ priorities })
}
