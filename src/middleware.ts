import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rotas que exigem role 'superadmin' — adicione aqui quando criar novas áreas admin
const ADMIN_PATHS = ['/agencias', '/membros']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isAdminPath = ADMIN_PATHS.some(
    p => pathname === p || pathname.startsWith(p + '/')
  )

  // Fora das rotas admin o middleware não faz nada
  if (!isAdminPath) return NextResponse.next()

  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // 1. Verifica se há sessão ativa
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. Verifica se o usuário é superadmin
  const { data: perfil } = await supabase
    .from('perfis')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.role !== 'superadmin') {
    // Usuário autenticado mas sem permissão — volta pro dashboard sem expor a rota
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Só ativa o middleware nas rotas admin
  matcher: ['/agencias/:path*', '/membros/:path*'],
}
