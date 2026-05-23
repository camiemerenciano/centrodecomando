import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const token   = request.headers.get('Authorization')?.replace('Bearer ', '')
  const timeMin = request.nextUrl.searchParams.get('timeMin')
  const timeMax = request.nextUrl.searchParams.get('timeMax')

  if (!token)   return NextResponse.json({ error: 'Token ausente' }, { status: 401 })
  if (!timeMin) return NextResponse.json({ error: 'timeMin ausente' }, { status: 400 })
  if (!timeMax) return NextResponse.json({ error: 'timeMax ausente' }, { status: 400 })

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
  url.searchParams.set('timeMin', timeMin)
  url.searchParams.set('timeMax', timeMax)
  url.searchParams.set('singleEvents', 'true')
  url.searchParams.set('orderBy', 'startTime')
  url.searchParams.set('maxResults', '50')

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return NextResponse.json({ error: err }, { status: res.status })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
