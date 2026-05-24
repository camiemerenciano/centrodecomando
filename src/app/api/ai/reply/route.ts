import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createAdminClient } from '@/lib/supabase/admin'

const FALLBACK_PROMPT = `você é lunna, assistente da propulsor criativo.
missão: entender o momento da marca, identificar necessidades e direcionar o cliente para o atendimento ideal.
regras: mensagens curtas, escrever em minúsculo, tom natural e humano, nunca agir como bot.`

interface AiConfig {
  nome: string
  cargo: string
  missao: string | null
  agencia: string | null
  tom_de_voz: string[]
  regras: string[]
  proibicoes: string[]
  emojis_permitidos: string[]
  emojis_proibidos: string[]
  exemplos: string[]
}

function buildSystemPrompt(c: AiConfig, areas: string[] = []): string {
  const parts: string[] = []

  parts.push(`você é ${c.nome}${c.cargo ? `, ${c.cargo}` : ''}${c.agencia ? ` da ${c.agencia}` : ''}.`)

  if (c.missao) {
    parts.push(`\nmissão: ${c.missao}`)
  }

  if (c.regras.length) {
    parts.push(`\nregras obrigatórias:\n${c.regras.map(r => `- ${r}`).join('\n')}`)
  }

  if (c.proibicoes.length) {
    parts.push(`\nproibido:\n${c.proibicoes.map(p => `- ${p}`).join('\n')}`)
  }

  if (c.tom_de_voz.length) {
    parts.push(`\ntom: ${c.tom_de_voz.join(', ')}`)
  }

  if (c.emojis_permitidos.length) {
    parts.push(`\nemojis permitidos (usar com moderação): ${c.emojis_permitidos.join(' ')}`)
  }

  if (c.emojis_proibidos.length) {
    parts.push(`\nemojis proibidos: ${c.emojis_proibidos.join(' ')}`)
  }

  if (c.exemplos.length) {
    parts.push(`\nexemplos de mensagens:\n${c.exemplos.map(e => `- "${e}"`).join('\n')}`)
  }

  if (areas.length) {
    parts.push(`\nserviços que a agência oferece (SOMENTE ofereça estes, nunca mencione outros): ${areas.join(', ')}`)
  }

  parts.push(`\nescreva sempre em minúsculo. mensagens curtas, máximo 2 linhas. retorne APENAS o texto da resposta, sem explicações.`)

  return parts.join('')
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidade',
      description: 'Consulta eventos no Google Agenda para verificar se um horário está disponível.',
      parameters: {
        type: 'object',
        properties: {
          data_inicio: { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T14:00:00-03:00' },
          data_fim:    { type: 'string', description: 'ISO 8601. Ex: 2025-06-10T15:00:00-03:00' },
        },
        required: ['data_inicio', 'data_fim'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'criar_evento',
      description: 'Cria um evento no Google Agenda para a call com o cliente.',
      parameters: {
        type: 'object',
        properties: {
          data_inicio:  { type: 'string' },
          data_fim:     { type: 'string' },
          nome_cliente: { type: 'string' },
          nome_empresa: { type: 'string' },
          telefone:     { type: 'string' },
          objetivo:     { type: 'string' },
        },
        required: ['data_inicio', 'data_fim', 'nome_cliente', 'nome_empresa', 'telefone', 'objetivo'],
      },
    },
  },
]

async function runCalendarTool(
  name: string,
  args: Record<string, string>,
  gcalToken: string,
  baseUrl: string
): Promise<string> {
  if (name === 'consultar_disponibilidade') {
    const url = new URL(`${baseUrl}/api/calendar/events`)
    url.searchParams.set('timeMin', args.data_inicio)
    url.searchParams.set('timeMax', args.data_fim)
    const res  = await fetch(url.toString(), { headers: { Authorization: `Bearer ${gcalToken}` } })
    const data = await res.json()
    const events = data.items ?? []
    if (events.length === 0) return 'horário disponível'
    return `horário ocupado: ${events.map((e: { summary?: string }) => e.summary ?? 'evento').join(', ')}`
  }

  if (name === 'criar_evento') {
    const body = {
      summary:     `Call — ${args.nome_cliente} (${args.nome_empresa})`,
      description: `Objetivo: ${args.objetivo}\nTelefone: ${args.telefone}`,
      start: { dateTime: args.data_inicio, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: args.data_fim,    timeZone: 'America/Sao_Paulo' },
    }
    const res  = await fetch(`${baseUrl}/api/calendar/criar-evento`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${gcalToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return `erro ao criar evento: ${JSON.stringify(data.error)}`
    return `evento criado: ${data.summary} em ${data.start?.dateTime}`
  }

  return 'tool desconhecida'
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurado' }, { status: 503 })
  }

  const { messages, clientName, gcalToken, userId } = await request.json()

  if (!messages?.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem fornecida' }, { status: 400 })
  }

  // Fetch user's AI config + areas from Supabase
  let systemPrompt = FALLBACK_PROMPT
  if (userId) {
    try {
      const admin = createAdminClient()
      const [{ data }, { data: { user: authUser } }] = await Promise.all([
        admin.from('ai_config').select('*').eq('user_id', userId).maybeSingle(),
        admin.auth.admin.getUserById(userId),
      ])
      const areas: string[] = Array.isArray(authUser?.user_metadata?.areas_de_atuacao)
        ? (authUser!.user_metadata!.areas_de_atuacao as string[])
        : []
      if (data) systemPrompt = buildSystemPrompt(data as AiConfig, areas)
    } catch { /* use fallback */ }
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...( messages as { from: string; content: string }[] ).map(m => ({
      role: (['Equipe', 'Lunna'].includes(m.from) ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ]

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodecomando-two.vercel.app'
  const useTools = !!gcalToken

  let response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.3,
    max_tokens: 300,
    messages: chatMessages,
    ...(useTools ? { tools, tool_choice: 'auto' } : {}),
  })

  while (response.choices[0]?.finish_reason === 'tool_calls') {
    const assistantMsg = response.choices[0].message
    chatMessages.push(assistantMsg)
    const toolCalls = assistantMsg.tool_calls ?? []
    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue
      const args   = JSON.parse(tc.function.arguments) as Record<string, string>
      const result = await runCalendarTool(tc.function.name, args, gcalToken, baseUrl)
      chatMessages.push({ role: 'tool', tool_call_id: tc.id, content: result })
    }
    response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 300,
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    })
  }

  const reply = response.choices[0]?.message?.content?.trim() ?? ''
  return NextResponse.json({ reply })
}
