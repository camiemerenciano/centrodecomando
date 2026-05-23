import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const SYSTEM_PROMPT = `você é a lunna, assistente da propulsor criativo.

missão: entender o momento da marca, identificar necessidades e direcionar o cliente para o atendimento ideal de forma estratégica, natural e moderna.

regras obrigatórias:
- sempre descobrir o nome da pessoa ANTES de qualquer informação
- sempre descobrir o nome da empresa/marca logo em seguida
- mensagens sempre curtas (máximo 2 linhas)
- escrever tudo em minúsculo
- nunca usar linguagem formal
- nunca agir como bot ou central de atendimento
- nunca listar serviços sem contexto
- nunca informar valores fixos — os serviços são personalizados
- nunca prometer resultados garantidos
- investigar antes de concluir
- conduzir como conversa natural do whatsapp
- parecer alguém jovem e estratégica da equipe

tom: moderno, informal, humano, direto, leve

fluxo inicial obrigatório:
1. "oii, antes de qualquer coisa, qual teu nome?"
2. "perfeitoo. e qual o nome da tua empresa ou marca?"
3. "agora me conta melhor como a propulsor pode ajudar vocês"

após coletar nome + empresa, identificar o perfil:
- social_media → perguntar: segmento, instagram ativo, principal objetivo, maior dificuldade
- captacao → perguntar: tipo de captação, cidade, objetivo do material
- edicao_video → perguntar: tipo de vídeo, frequência, objetivo
- trafego_pago → perguntar: já anuncia?, objetivo, ticket do produto
- identidade_visual → perguntar: já tem logo?, momento da marca, objetivo
- outros → "me explica melhor o que vocês precisam que eu te direciono"

após qualificação: sempre direcionar para uma call estratégica

para agendamento de call, usar as tools de calendar:
- sempre verificar disponibilidade antes de criar evento
- só criar evento quando tiver: data, horário, nome, empresa, telefone e objetivo da call
- se horário ocupado, sugerir outro
- confirmar agendamento de forma curta e natural

emojis permitidos (usar com moderação): 🚀 ✨ 🪐 🌌 ☄️ 📡 💫 🔭
emojis proibidos: 💗 💕 🌸 ❤️ 🥺 😍 😊

exemplos de mensagens:
- "oii, antes de qualquer coisa, qual teu nome?"
- "perfeitoo. e qual o nome da tua marca?"
- "agora me conta melhor o que vocês tão precisando"
- "entendi. hoje vocês já produzem conteúdo?"
- "acho que consigo te direcionar melhor entendendo mais da marca"
- "isso provavelmente já tá impactando o posicionamento de vocês"
- "perfeito, agora ficou bem mais claro"`

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidade',
      description: 'Consulta eventos no Google Agenda para verificar se um horário está disponível.',
      parameters: {
        type: 'object',
        properties: {
          data_inicio: {
            type: 'string',
            description: 'Data/hora de início no formato ISO 8601. Ex: 2025-06-10T14:00:00-03:00',
          },
          data_fim: {
            type: 'string',
            description: 'Data/hora de fim no formato ISO 8601. Ex: 2025-06-10T15:00:00-03:00',
          },
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
          data_inicio: {
            type: 'string',
            description: 'Data/hora de início no formato ISO 8601.',
          },
          data_fim: {
            type: 'string',
            description: 'Data/hora de fim no formato ISO 8601.',
          },
          nome_cliente: { type: 'string' },
          nome_empresa: { type: 'string' },
          telefone: { type: 'string' },
          objetivo: { type: 'string', description: 'Objetivo da call.' },
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

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${gcalToken}` },
    })
    const data = await res.json()
    const events = data.items ?? []

    if (events.length === 0) return 'horário disponível'
    const nomes = events.map((e: { summary?: string }) => e.summary ?? 'evento').join(', ')
    return `horário ocupado: ${nomes}`
  }

  if (name === 'criar_evento') {
    const body = {
      summary: `Call — ${args.nome_cliente} (${args.nome_empresa})`,
      description: `Objetivo: ${args.objetivo}\nTelefone: ${args.telefone}`,
      start: { dateTime: args.data_inicio, timeZone: 'America/Sao_Paulo' },
      end:   { dateTime: args.data_fim,    timeZone: 'America/Sao_Paulo' },
    }

    const res = await fetch(`${baseUrl}/api/calendar/criar-evento`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gcalToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return `erro ao criar evento: ${JSON.stringify(data.error)}`
    return `evento criado com sucesso: ${data.summary} em ${data.start?.dateTime}`
  }

  return 'tool desconhecida'
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurado' }, { status: 503 })
  }

  const { messages, clientName, gcalToken } = await request.json()

  if (!messages?.length) {
    return NextResponse.json({ error: 'Nenhuma mensagem fornecida' }, { status: 400 })
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...( messages as { from: string; content: string }[] ).map(m => ({
      role: (m.from === 'Equipe' ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    })),
  ]

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://centrodecomando-two.vercel.app'
  const useTools = !!gcalToken

  let response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 300,
    messages: chatMessages,
    ...(useTools ? { tools, tool_choice: 'auto' } : {}),
  })

  // Agentic loop — executa tools até ter resposta de texto
  while (response.choices[0]?.finish_reason === 'tool_calls') {
    const assistantMsg = response.choices[0].message
    chatMessages.push(assistantMsg)

    const toolCalls = assistantMsg.tool_calls ?? []
    for (const tc of toolCalls) {
      if (tc.type !== 'function') continue
      const args = JSON.parse(tc.function.arguments) as Record<string, string>
      const result = await runCalendarTool(tc.function.name, args, gcalToken, baseUrl)
      chatMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result,
      })
    }

    response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
    })
  }

  const reply = response.choices[0]?.message?.content?.trim() ?? ''
  return NextResponse.json({ reply })
}
