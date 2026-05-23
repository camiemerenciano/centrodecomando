import { NextRequest, NextResponse } from 'next/server'

function extractRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const d = data as Record<string, unknown>
  const msgs = d?.messages as Record<string, unknown> | undefined
  const records = msgs?.records ?? d?.records ?? d?.messages
  if (Array.isArray(records)) return records
  return []
}

async function fetchMsgs(url: string, headers: Record<string, string>, body: unknown): Promise<unknown[]> {
  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
    if (!res.ok) return []
    const data = await res.json().catch(() => [])
    return extractRecords(data)
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const { apiUrl, apiKey, instanceName, remoteJid } = await request.json().catch(() => ({}))
  if (!apiUrl || !apiKey || !instanceName || !remoteJid)
    return NextResponse.json({ error: 'Parâmetros ausentes' }, { status: 400 })

  const base    = apiUrl.replace(/\/$/, '')
  const url     = `${base}/chat/findMessages/${instanceName}`
  const headers = { 'Content-Type': 'application/json', apikey: apiKey }

  function getTs(m: Record<string, unknown>): number {
    const ts = m?.messageTimestamp
    if (!ts) return 0
    if (typeof ts === 'number') return ts
    if (typeof ts === 'string') return parseInt(ts, 10)
    // protobuf int64 object: { low, high, unsigned }
    const o = ts as Record<string, number>
    if (typeof o.low === 'number') return o.low + o.high * 2 ** 32
    return 0
  }

  function sortAsc(arr: Array<Record<string, unknown>>) {
    return arr.sort((a, b) => getTs(a) - getTs(b))
  }

  try {
    // Sent messages always have key.remoteJid = phoneJid
    const sent = await fetchMsgs(url, headers, {
      where: { key: { remoteJid, fromMe: true } }, limit: 40,
    }) as Array<Record<string, unknown>>

    // Received messages use @lid in key.remoteJid — query by remoteJidAlt instead
    const receivedByAlt = await fetchMsgs(url, headers, {
      where: { key: { remoteJidAlt: remoteJid, fromMe: false } }, limit: 40,
    }) as Array<Record<string, unknown>>

    // Fallback: received by regular remoteJid (older Evolution versions)
    const receivedByJid = receivedByAlt.length === 0
      ? await fetchMsgs(url, headers, { where: { key: { remoteJid, fromMe: false } }, limit: 40 }) as Array<Record<string, unknown>>
      : []

    const received = receivedByAlt.length > 0 ? receivedByAlt : receivedByJid
    const merged   = [...sent, ...received]

    if (merged.length > 0) {
      return NextResponse.json(sortAsc(merged))
    }

    // Last resort: fetch without fromMe split
    for (const body of [
      { where: { key: { remoteJid } }, limit: 60 },
      { where: { remoteJid },          limit: 60 },
    ]) {
      const records = await fetchMsgs(url, headers, body) as Array<Record<string, unknown>>
      if (records.length > 0) return NextResponse.json(sortAsc(records))
    }

    return NextResponse.json([])
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 })
  }
}
